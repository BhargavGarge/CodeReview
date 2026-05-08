import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { Socket as NetSocket } from "net";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdapter } from "@socket.io/redis-adapter";
import * as Y from "yjs";
import type { Database, Json, SessionEventType } from "@/types/database";
import { initReviewWorker } from "@/lib/review-worker";
import { createRedisConnection } from "@/lib/redis";

export const config = {
  api: { bodyParser: false },
};

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: NetServer & { io?: SocketIOServer };
  };
};

// ── Supabase admin client ─────────────────────────────────────────────────────
const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      )
    : null;

async function logEvent(
  sessionId: string,
  userId: string | null,
  eventType: SessionEventType,
  payload: Json,
) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("session_events").insert({
    session_id: sessionId,
    user_id: userId ?? null,
    event_type: eventType,
    payload,
  });
}

// ── Redis connections ─────────────────────────────────────────────────────────
// Three separate connections:
//   pub + sub  → Socket.IO Redis adapter (horizontal scaling via pub/sub)
//   data       → presence hashes + yjs state persistence
//
// BullMQ owns its own connection in review-queue.ts; we don't share it because
// a connection used for pub/sub (subscribe mode) can't send arbitrary commands.
//
// Cached on `global` so Next.js HMR module re-evaluation doesn't orphan the
// old TCP connections (which causes the ECONNRESET cascade on the editor screen).
const g = global as typeof globalThis & {
  _redisPub?: ReturnType<typeof createRedisConnection>;
  _redisSub?: ReturnType<typeof createRedisConnection>;
  _redisData?: ReturnType<typeof createRedisConnection>;
};

if (!g._redisPub) {
  g._redisPub = createRedisConnection();
  g._redisPub.on("error", (err: Error) =>
    console.error("[redis:pub]", err.message),
  );
}
if (!g._redisSub) {
  g._redisSub = createRedisConnection();
  g._redisSub.on("error", (err: Error) =>
    console.error("[redis:sub]", err.message),
  );
}
if (!g._redisData) {
  g._redisData = createRedisConnection();
  g._redisData.on("error", (err: Error) =>
    console.error("[redis:data]", err.message),
  );
}

const pubRedis = g._redisPub;
const subRedis = g._redisSub;
const dataRedis = g._redisData;

// ── Redis key helpers ─────────────────────────────────────────────────────────
const presenceKey = (sessionId: string) => `collab:presence:${sessionId}`;
const yjsStateKey = (sessionId: string) => `yjs:state:${sessionId}`;

// ── Server-side yjs documents ─────────────────────────────────────────────────
// Each session has one authoritative Y.Doc on the server. Docs are loaded from
// Redis on first access so they survive server restarts. Concurrent load
// requests for the same session share a single Promise to avoid double-init.
const sessionDocs = new Map<string, Y.Doc>();
const docLoadPromises = new Map<string, Promise<Y.Doc>>();

async function getOrLoadDoc(sessionId: string): Promise<Y.Doc> {
  if (sessionDocs.has(sessionId)) return sessionDocs.get(sessionId)!;
  if (docLoadPromises.has(sessionId)) return docLoadPromises.get(sessionId)!;

  const promise = (async () => {
    const doc = new Y.Doc();
    const stored = await dataRedis.getBuffer(yjsStateKey(sessionId));
    if (stored && stored.length > 0) {
      Y.applyUpdate(doc, new Uint8Array(stored));
    }
    sessionDocs.set(sessionId, doc);
    docLoadPromises.delete(sessionId);
    return doc;
  })();

  docLoadPromises.set(sessionId, promise);
  return promise;
}

// ── Per-socket metadata (local cache for fast presence updates) ───────────────
type SocketMeta = {
  sessionId: string;
  userName: string;
  userId: string | null;
  lineNumber: number;
};
const socketMeta = new Map<string, SocketMeta>();

// Throttle cursor-move DB logging to at most once per second per socket.
const lastCursorLog = new Map<string, number>();

// ── Presence helpers ──────────────────────────────────────────────────────────
// Reads from Redis so presence is accurate across all server instances.
// io.to(sessionId).emit is relayed to all instances by the Redis adapter.
async function emitPresenceAsync(io: SocketIOServer, sessionId: string) {
  const raw = await dataRedis.hgetall(presenceKey(sessionId));
  const byUserName = new Map<
    string,
    { userName: string; lineNumber: number }
  >();
  for (const json of Object.values(raw ?? {})) {
    try {
      const m = JSON.parse(json) as SocketMeta;
      byUserName.set(m.userName, {
        userName: m.userName,
        lineNumber: m.lineNumber,
      });
    } catch {
      // skip malformed entries
    }
  }
  io.to(sessionId).emit("presence-update", {
    members: Array.from(byUserName.values()),
  });
}

type JoinSessionPayload = {
  sessionId: string;
  userName: string;
  userId?: string;
};
type CursorMovePayload = { sessionId: string; lineNumber: number };

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponseWithSocket,
) {
  if (!res.socket.server.io) {
    initReviewWorker();

    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket/io",
      addTrailingSlash: false,
      cors: { origin: "*", methods: ["GET", "POST"] },
    });

    // Wire up the Redis adapter so io.to(...).emit works across instances.
    io.adapter(createAdapter(pubRedis, subRedis));

    io.on("connection", (socket) => {
      // ── join-session ────────────────────────────────────────────────────────
      socket.on(
        "join-session",
        async ({ sessionId, userName, userId }: JoinSessionPayload) => {
          try {
            socket.join(sessionId);
            socket.data.sessionId = sessionId;
            socket.data.userName = userName;
            socket.data.userId = userId ?? null;

            const meta: SocketMeta = {
              sessionId,
              userName,
              userId: userId ?? null,
              lineNumber: 1,
            };
            socketMeta.set(socket.id, meta);

            // Persist presence to Redis (24-hour TTL as a safety net; cleaned up
            // on disconnect/leave too).
            await dataRedis.hset(
              presenceKey(sessionId),
              socket.id,
              JSON.stringify(meta),
            );
            await dataRedis.expire(presenceKey(sessionId), 86400);

            // Send the authoritative yjs state to the joining socket so they
            // get the full document immediately (no cursor-by-cursor replay).
            const doc = await getOrLoadDoc(sessionId);
            const stateUpdate = Y.encodeStateAsUpdate(doc);
            if (stateUpdate.length > 0) {
              socket.emit("yjs-sync-reply", {
                diff: Array.from(stateUpdate),
              });
            }

            void emitPresenceAsync(io, sessionId);
          } catch (err) {
            console.error("[join-session] error", err);
          }
        },
      );

      // ── leave-session ───────────────────────────────────────────────────────
      socket.on("leave-session", (sessionId: string) => {
        socket.leave(sessionId);
        void dataRedis.hdel(presenceKey(sessionId), socket.id);
        socketMeta.delete(socket.id);
        void emitPresenceAsync(io, sessionId);
      });

      // ── yjs-update ──────────────────────────────────────────────────────────
      // Relay the update immediately for low latency, then apply to the server
      // doc and persist to Redis asynchronously.
      socket.on(
        "yjs-update",
        ({ sessionId, update }: { sessionId: string; update: number[] }) => {
          // Relay first — don't block on async work.
          socket.to(sessionId).emit("yjs-update", { update });

          void (async () => {
            try {
              const doc = await getOrLoadDoc(sessionId);
              Y.applyUpdate(doc, new Uint8Array(update), "client");
              void dataRedis.set(
                yjsStateKey(sessionId),
                Buffer.from(Y.encodeStateAsUpdate(doc)),
              );
            } catch (err) {
              console.error("[yjs-update] persistence error", err);
            }
          })();
        },
      );

      // ── yjs-sync ────────────────────────────────────────────────────────────
      // Client sends its state vector; server replies with updates the client
      // is missing. Used on connect/reconnect to re-converge.
      socket.on(
        "yjs-sync",
        ({
          sessionId,
          stateVector,
        }: {
          sessionId: string;
          stateVector: number[];
        }) => {
          void (async () => {
            try {
              const doc = await getOrLoadDoc(sessionId);
              const sv =
                stateVector?.length > 0
                  ? new Uint8Array(stateVector)
                  : undefined;
              const diff = sv
                ? Y.encodeStateAsUpdate(doc, sv)
                : Y.encodeStateAsUpdate(doc);
              if (diff.length > 0) {
                socket.emit("yjs-sync-reply", { diff: Array.from(diff) });
              }
            } catch (err) {
              console.error("[yjs-sync] error", err);
            }
          })();
        },
      );

      // ── cursor-move ─────────────────────────────────────────────────────────
      socket.on(
        "cursor-move",
        ({ sessionId, lineNumber }: CursorMovePayload) => {
          const meta = socketMeta.get(socket.id);
          if (meta) {
            meta.lineNumber = lineNumber;
            void dataRedis.hset(
              presenceKey(sessionId),
              socket.id,
              JSON.stringify(meta),
            );
            void emitPresenceAsync(io, sessionId);
          }

          const now = Date.now();
          const last = lastCursorLog.get(socket.id) ?? 0;
          if (now - last >= 1000) {
            lastCursorLog.set(socket.id, now);
            void logEvent(
              sessionId,
              socket.data.userId as string | null,
              "cursor-move",
              {
                lineNumber,
                userName: socket.data.userName as string,
                ts: now,
              },
            );
          }
        },
      );

      // ── code-update (file-mode fallback) ────────────────────────────────────
      // Used when a session file is active in the editor (not the main session
      // code). Yjs handles the main session code; this fallback handles files.
      socket.on(
        "code-update",
        ({ sessionId, code }: { sessionId: string; code: string }) => {
          socket.to(sessionId).emit("code-update", { code });
          void logEvent(
            sessionId,
            socket.data.userId as string | null,
            "code-update",
            {
              codeLength: code.length,
              userName: socket.data.userName as string,
              ts: Date.now(),
            },
          );
        },
      );

      // ── ai-review-requested ─────────────────────────────────────────────────
      socket.on(
        "ai-review-requested",
        ({ sessionId }: { sessionId: string }) => {
          void logEvent(
            sessionId,
            socket.data.userId as string | null,
            "ai-review-requested",
            {
              userName: socket.data.userName as string,
              ts: Date.now(),
            },
          );
        },
      );

      // ── WebRTC signaling ────────────────────────────────────────────────────
      socket.on(
        "webrtc-offer",
        ({
          sessionId,
          from,
          offer,
        }: {
          sessionId: string;
          from: string;
          offer: unknown;
        }) => {
          socket.to(sessionId).emit("webrtc-offer", { from, offer });
        },
      );

      socket.on(
        "webrtc-answer",
        ({
          sessionId,
          from,
          answer,
        }: {
          sessionId: string;
          from: string;
          answer: unknown;
        }) => {
          socket.to(sessionId).emit("webrtc-answer", { from, answer });
        },
      );

      socket.on(
        "webrtc-ice-candidate",
        ({
          sessionId,
          from,
          candidate,
        }: {
          sessionId: string;
          from: string;
          candidate: unknown;
        }) => {
          socket
            .to(sessionId)
            .emit("webrtc-ice-candidate", { from, candidate });
        },
      );

      socket.on(
        "webrtc-end-call",
        ({ sessionId, from }: { sessionId: string; from: string }) => {
          socket.to(sessionId).emit("webrtc-end-call", { from });
        },
      );

      // ── disconnect ──────────────────────────────────────────────────────────
      socket.on("disconnect", () => {
        const meta = socketMeta.get(socket.id);
        if (meta) {
          void dataRedis.hdel(presenceKey(meta.sessionId), socket.id);
          socketMeta.delete(socket.id);
          void emitPresenceAsync(io, meta.sessionId);
        }
        lastCursorLog.delete(socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
