"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { io, type Socket } from "socket.io-client";
import * as Y from "yjs";
import {
  Bot,
  FileCode2,
  Github,
  History,
  Link2,
  Loader2,
  PhoneOff,
  Play,
  Save,
  Terminal,
  Users,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { editor as MonacoEditor, IDisposable } from "monaco-editor";
import { FileExplorer } from "./file-explorer";

interface CollabEditorProps {
  sessionId: string;
  title: string;
  initialCode: string;
  initialFiles?: Array<{
    id: string;
    file_name: string;
    content: string;
    created_at: string;
    updated_at: string;
  }>;
  language: string;
  userName: string;
  ownerId: string;
  currentUserId: string;
  githubRepoUrl?: string | null;
  collaboratorNames: string[];
  inviteLink: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AiFeedback {
  line_start: number;
  line_end: number;
  message: string;
  suggestion?: string | null;
  severity: "info" | "warning" | "error" | "suggestion";
  category: "security" | "performance" | "style" | "logic" | "best_practice";
}

interface PresenceMember {
  userName: string;
  lineNumber: number;
}

type MonacoBindingInstance = { destroy(): void };

function createYjsMonacoBinding(
  ytext: Y.Text,
  model: MonacoEditor.ITextModel,
): MonacoBindingInstance {
  let applying = false;

  const observer = (_evt: Y.YTextEvent, tr: Y.Transaction) => {
    if (tr.origin === "monaco") return;
    applying = true;
    const next = ytext.toString();
    if (model.getValue() !== next) model.setValue(next);
    applying = false;
  };

  const disposable = model.onDidChangeContent((e) => {
    if (applying) return;
    const doc = ytext.doc;
    if (!doc) return;
    doc.transact(() => {
      for (const ch of [...e.changes].sort((a, b) => b.rangeOffset - a.rangeOffset)) {
        if (ch.rangeLength > 0) ytext.delete(ch.rangeOffset, ch.rangeLength);
        if (ch.text) ytext.insert(ch.rangeOffset, ch.text);
      }
    }, "monaco");
  });

  ytext.observe(observer);

  return {
    destroy() {
      ytext.unobserve(observer);
      disposable.dispose();
    },
  };
}

// ─── Cursor colour palette ────────────────────────────────────────────────────
const CURSOR_COLORS = [
  { bg: "#f97316", text: "#fff" },
  { bg: "#22c55e", text: "#fff" },
  { bg: "#ec4899", text: "#fff" },
  { bg: "#eab308", text: "#000" },
  { bg: "#14b8a6", text: "#fff" },
  { bg: "#a855f7", text: "#fff" },
  { bg: "#ef4444", text: "#fff" },
  { bg: "#3b82f6", text: "#fff" },
];

function colorForUser(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

const injectedStyles = new Set<string>();

function ensureUserStyle(userName: string) {
  const slug = slugify(userName);
  const className = `remote-cursor-${slug}`;
  if (injectedStyles.has(className)) return className;

  const color = colorForUser(userName);
  const css = `
    .${className}-line {
      background: ${color.bg}18 !important;
      border-left: 2px solid ${color.bg} !important;
    }
    .${className}-caret::after {
      content: '';
      display: inline-block;
      width: 2px;
      height: 1.1em;
      background: ${color.bg};
      position: absolute;
      animation: blink-${slug} 1.1s step-start infinite;
      pointer-events: none;
    }
    @keyframes blink-${slug} {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }
    .${className}-label::before {
      content: '${userName.replace(/'/g, "\\'")}';
      background: ${color.bg};
      color: ${color.text};
      font-size: 10px;
      font-family: sans-serif;
      padding: 0 5px;
      border-radius: 3px 3px 3px 0;
      position: absolute;
      top: -18px;
      left: 0;
      white-space: nowrap;
      pointer-events: none;
      z-index: 100;
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  injectedStyles.add(className);
  return className;
}

export function CollabEditor({
  sessionId,
  title,
  initialCode,
  initialFiles = [],
  language,
  userName,
  ownerId,
  currentUserId,
  githubRepoUrl,
 
  inviteLink,
}: CollabEditorProps) {
  const [sessionFiles, setSessionFiles] = useState(initialFiles);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    initialFiles.length > 0 ? initialFiles[0].id : null,
  );
 
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [connected, setConnected] = useState(false);
  const [currentLine, setCurrentLine] = useState(1);
  const [aiFeedback, setAiFeedback] = useState<AiFeedback[]>([]);
  const [askingAi, setAskingAi] = useState(false);
  const [aiStreamText, setAiStreamText] = useState("");
  const [aiQueuePosition, setAiQueuePosition] = useState<number | null>(null);
  const [presenceMembers, setPresenceMembers] = useState<PresenceMember[]>([]);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string[]>([]);
  const [repoFiles, setRepoFiles] = useState<
    { path: string; type: "file" | "dir" }[] | null
  >(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);

  const isOwner = currentUserId === ownerId;

  // ─── Core refs ────────────────────────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const joinedSessionRef = useRef(false);
  const lastEmittedLineRef = useRef<number>(1);
  // Used only in file-mode to prevent echoing received code-update back out.
  const isApplyingRemoteChange = useRef(false);
  const codeRef = useRef(initialCode);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const cursorListenerRef = useRef<IDisposable | null>(null);
  const aiActionRef = useRef<IDisposable | null>(null);
  const remoteCursorDecorationsRef = useRef<Map<string, string[]>>(new Map());
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const knownMembersRef = useRef<Set<string>>(new Set());
  const runnerWorkerRef = useRef<Worker | null>(null);
  const tsModuleRef = useRef<null | typeof import("typescript")>(null);

  // ─── yjs refs ─────────────────────────────────────────────────────────────
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const bindingRef = useRef<MonacoBindingInstance | null>(null);

  // ─── Stable refs (updated every render, safe to read inside effects/callbacks) ─
  const activeFileIdRef = useRef(activeFileId);
  const isOwnerRef = useRef(isOwner);
  const sessionFilesRef = useRef(sessionFiles);
  // saveCode is defined below; saveCodeRef is populated after its definition.
  const saveCodeRef = useRef<(value: string) => Promise<void>>(async () => undefined);

  activeFileIdRef.current = activeFileId;
  isOwnerRef.current = isOwner;
  sessionFilesRef.current = sessionFiles;

  // ─── WebRTC / Live Call state ───────────────────────────────────────────
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallConnecting, setIsCallConnecting] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [remoteParticipant, setRemoteParticipant] = useState<string | null>(null);

  const editorLanguage = useMemo(() => {
    if (language === "csharp") return "csharp";
    if (language === "cpp") return "cpp";
    return language;
  }, [language]);

  const localDisplayName = useMemo(() => `${userName} (you)`, [userName]);

  const activeMembers = useMemo(
    () => presenceMembers.filter((m) => m.userName !== userName),
    [presenceMembers, userName],
  );

  const files = useMemo(() => {
    if (language === "python") return ["main.py", "auth.py", "middleware.py"];
    if (language === "go") return ["main.go", "auth.go", "middleware.go"];
    if (language === "rust") return ["main.rs", "auth.rs", "middleware.rs"];
    return ["index.ts", "auth.ts", "middleware.ts"];
  }, [language]);

  const isLocalExecution = language === "javascript" || language === "typescript";

  const visibleRepoFiles = useMemo(() => {
    if (!repoFiles) return [] as { path: string; type: "file" | "dir" }[];
    if (expandedDirs.length === 0) {
      return repoFiles.filter((entry) => !entry.path.includes("/"));
    }
    const expandedSet = new Set(expandedDirs);
    return repoFiles.filter((entry) => {
      const segments = entry.path.split("/");
      if (segments.length <= 1) return true;
      let parentPath = "";
      for (let i = 0; i < segments.length - 1; i++) {
        parentPath = i === 0 ? segments[0] : `${parentPath}/${segments[i]}`;
        if (!expandedSet.has(parentPath)) return false;
      }
      return true;
    });
  }, [expandedDirs, repoFiles]);

  const appendRunOutput = useCallback((line: string) => {
    setRunOutput((current) => [...current, line]);
  }, []);

  // ─── Initialize yjs document (once, on mount) ─────────────────────────────
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText("content");
    ytextRef.current = ytext;

    // Seed with initialCode so the editor shows content before the first sync.
    // We use the 'init' origin so the observer skips broadcasting/saving this.
    if (ytext.length === 0 && initialCode) {
      ydoc.transact(() => {
        ytext.insert(0, initialCode);
      }, "init");
    }

    // Observe local edits (origin !== 'remote' and !== 'init') and broadcast.
    ydoc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === "remote" || origin === "init") return;

      const currentCode = ytext.toString();
      codeRef.current = currentCode;

      socketRef.current?.emit("yjs-update", {
        sessionId,
        update: Array.from(update),
      });

      if (isOwnerRef.current) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(
          () => void saveCodeRef.current(currentCode),
          900,
        );
      }
    });

    return () => {
      ydoc.destroy();
      ydocRef.current = null;
      ytextRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — ydoc lives for the component's lifetime

  // ─── GitHub repo integration ────────────────────────────────────────────
  useEffect(() => {
    if (!githubRepoUrl) {
      setRepoFiles(null);
      setRepoError(null);
      setRepoLoading(false);
      setExpandedDirs([]);
      return;
    }
    let cancelled = false;
    const loadTree = async () => {
      try {
        setRepoLoading(true);
        setRepoError(null);
        const res = await fetch(`/api/sessions/${sessionId}/github/tree`);
        const payload = (await res.json()) as {
          tree?: { path: string; type: "file" | "dir" }[];
          error?: string;
        };
        if (!res.ok || !payload.tree) {
          throw new Error(payload.error || "Failed to load GitHub repo tree");
        }
        if (!cancelled) {
          setRepoFiles(payload.tree);
          setExpandedDirs([]);
        }
      } catch (err) {
        if (!cancelled) {
          setRepoError(
            err instanceof Error
              ? err.message
              : "Unable to load GitHub repository tree.",
          );
        }
      } finally {
        if (!cancelled) setRepoLoading(false);
      }
    };
    void loadTree();
    return () => { cancelled = true; };
  }, [githubRepoUrl, sessionId]);

  // ─── WebRTC helpers ─────────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    try { peerConnectionRef.current?.close(); } catch { /* ignore */ }
    peerConnectionRef.current = null;
    for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
    for (const track of remoteStreamRef.current?.getTracks() ?? []) track.stop();
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsCallActive(false);
    setIsCallConnecting(false);
    setRemoteParticipant(null);
  }, []);

  const ensurePeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support camera/mic access.");
    }
    const localStream =
      localStreamRef.current ??
      (await navigator.mediaDevices.getUserMedia({ audio: true, video: true }));
    localStreamRef.current = localStream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      void localVideoRef.current.play().catch(() => undefined);
    }
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    pc.ontrack = (event) => {
      const [remote] = event.streams;
      if (!remote) return;
      remoteStreamRef.current = remote;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remote;
        void remoteVideoRef.current.play().catch(() => undefined);
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-ice-candidate", {
          sessionId,
          from: userName,
          candidate: event.candidate,
        });
      }
    };
    return pc;
  }, [sessionId, userName]);

  const endCall = useCallback(() => {
    socketRef.current?.emit("webrtc-end-call", { sessionId, from: userName });
    cleanupCall();
  }, [cleanupCall, sessionId, userName]);

  const startCall = useCallback(async () => {
    if (!socketRef.current || isCallActive || isCallConnecting) return;
    if (!connected) { setCallError("You must be connected to start a call."); return; }
    if (activeMembers.length === 0) { setCallError("Waiting for another collaborator to join."); return; }
    setCallError(null);
    setIsCallConnecting(true);
    try {
      const pc = await ensurePeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const target = activeMembers[0]?.userName ?? null;
      setRemoteParticipant(target);
      socketRef.current.emit("webrtc-offer", { sessionId, from: userName, offer });
      setIsCallActive(true);
    } catch (err) {
      console.error("[webrtc] startCall error", err);
      setCallError("Could not start call. Check camera/mic permissions and try again.");
      cleanupCall();
    } finally {
      setIsCallConnecting(false);
    }
  }, [activeMembers, cleanupCall, connected, ensurePeerConnection, isCallActive, isCallConnecting, sessionId, userName]);

  // ─── Remote cursor decorations ────────────────────────────────────────────
  const updateRemoteCursors = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const remoteMembers = presenceMembers.filter((m) => m.userName !== userName);
    const currentNames = new Set(remoteMembers.map((m) => m.userName));
    for (const [name, ids] of remoteCursorDecorationsRef.current) {
      if (!currentNames.has(name)) {
        editor.deltaDecorations(ids, []);
        remoteCursorDecorationsRef.current.delete(name);
      }
    }
    for (const member of remoteMembers) {
      const baseClass = ensureUserStyle(member.userName);
      const existing = remoteCursorDecorationsRef.current.get(member.userName) ?? [];
      const newIds = editor.deltaDecorations(existing, [
        {
          range: new monaco.Range(member.lineNumber, 1, member.lineNumber, 1),
          options: { isWholeLine: true, className: `${baseClass}-line` },
        },
        {
          range: new monaco.Range(member.lineNumber, 1, member.lineNumber, 1),
          options: { beforeContentClassName: `${baseClass}-caret ${baseClass}-label` },
        },
      ]);
      remoteCursorDecorationsRef.current.set(member.userName, newIds);
    }
  }, [presenceMembers, userName]);

  useEffect(() => { updateRemoteCursors(); }, [presenceMembers, updateRemoteCursors]);

  // ─── Join notification ────────────────────────────────────────────────────
  useEffect(() => {
    const known = knownMembersRef.current;
    known.add(userName);
    for (const member of presenceMembers) {
      if (!known.has(member.userName) && member.userName !== userName) {
        setJoinNotification(`${member.userName} joined the session`);
      }
      known.add(member.userName);
    }
  }, [presenceMembers, userName]);

  useEffect(() => {
    if (!joinNotification) return;
    const t = window.setTimeout(() => setJoinNotification(null), 4000);
    return () => window.clearTimeout(t);
  }, [joinNotification]);

  // ─── Save (owner only) ────────────────────────────────────────────────────
  const saveCode = useCallback(
    async (value: string) => {
      if (!isOwner) return;
      try {
        setSaveStatus("saving");
        if (activeFileIdRef.current) {
          const res = await fetch(
            `/api/sessions/${sessionId}/files/${activeFileIdRef.current}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: value }),
            },
          );
          if (!res.ok) {
            const payload = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error ?? "Failed to save file");
          }
          setSessionFiles((cur) =>
            cur.map((f) =>
              f.id === activeFileIdRef.current ? { ...f, content: value } : f,
            ),
          );
        } else {
          const res = await fetch(`/api/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: value }),
          });
          if (!res.ok) {
            const payload = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error ?? "Failed to save");
          }
        }
        setSaveStatus("saved");
        window.setTimeout(() => setSaveStatus("idle"), 1200);
      } catch (err) {
        console.error("[saveCode]", err);
        setSaveStatus("error");
      }
    },
    [sessionId, isOwner],
  );

  // Keep saveCodeRef in sync so the ydoc observer (set up once) always calls
  // the latest version of saveCode.
  saveCodeRef.current = saveCode;

  const copyInviteLink = useCallback(async () => {
    await navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1800);
  }, [inviteLink]);

  // ─── yjs MonacoBinding lifecycle (switches with activeFileId) ─────────────
  // When a session file is active, yjs is paused and we fall back to the
  // old code-update broadcast for that file's content.  When returning to
  // the main session view (no file selected), we re-attach MonacoBinding so
  // yjs drives the editor again.
  useEffect(() => {
    if (activeFileId !== null) {
      // File mode — tear down yjs binding and set the editor to the file content.
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      const file = sessionFilesRef.current.find((f) => f.id === activeFileId);
      if (file && editorRef.current) {
        editorRef.current.setValue(file.content);
        codeRef.current = file.content;
      }
    } else {
      // Main-session mode — (re-)attach binding if editor is already mounted.
      if (editorRef.current && ytextRef.current && !bindingRef.current) {
        const model = editorRef.current.getModel();
        if (model && ytextRef.current) {
          bindingRef.current = createYjsMonacoBinding(ytextRef.current, model);
        }
      }
    }
  }, [activeFileId]);

  // ─── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let socket: Socket;

    const initSocket = async () => {
      await fetch("/api/socket/io");

      socket = io({
        path: "/api/socket/io",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("join-session", { sessionId, userName, userId: currentUserId });
        joinedSessionRef.current = true;

        // On (re)connect, send our current state vector so the server can reply
        // with any updates we missed.  The server also pushes its full state on
        // join-session, but this handles the reconnect case.
        if (ydocRef.current) {
          const sv = Y.encodeStateVector(ydocRef.current);
          socket.emit("yjs-sync", { sessionId, stateVector: Array.from(sv) });
        }
      });

      socket.on("disconnect", () => {
        setConnected(false);
        joinedSessionRef.current = false;
      });

      // ── yjs-update: apply remote delta ─────────────────────────────────────
      // MonacoBinding automatically reflects the change in the editor because
      // it listens to the Y.Doc; no manual editor.setValue() needed.
      socket.on("yjs-update", ({ update }: { update: number[] }) => {
        if (ydocRef.current) {
          Y.applyUpdate(ydocRef.current, new Uint8Array(update), "remote");
          if (ytextRef.current) {
            codeRef.current = ytextRef.current.toString();
          }
        }
      });

      // ── yjs-sync-reply: server's diff for us ───────────────────────────────
      socket.on("yjs-sync-reply", ({ diff }: { diff: number[] }) => {
        if (ydocRef.current && diff.length > 0) {
          Y.applyUpdate(ydocRef.current, new Uint8Array(diff), "remote");
          if (ytextRef.current) {
            codeRef.current = ytextRef.current.toString();
          }
        }
      });

      // ── code-update: file-mode fallback ────────────────────────────────────
      // Only applied when a session file is active (not the main session code).
      socket.on("code-update", ({ code: incoming }: { code: string }) => {
        if (activeFileIdRef.current !== null && incoming !== codeRef.current) {
          isApplyingRemoteChange.current = true;
          editorRef.current?.setValue(incoming);
          codeRef.current = incoming;
          isApplyingRemoteChange.current = false;
        }
      });

      socket.on(
        "presence-update",
        ({ members }: { members: PresenceMember[] }) => {
          setPresenceMembers(members);
        },
      );

      socket.on(
        "cursor-update",
        ({ userName: remoteUser, lineNumber }: PresenceMember) => {
          setPresenceMembers((cur) => [
            ...cur.filter((m) => m.userName !== remoteUser),
            { userName: remoteUser, lineNumber },
          ]);
        },
      );

      // WebRTC signaling handlers
      socket.on(
        "webrtc-offer",
        async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
          if (from === userName) return;
          setCallError(null);
          setIsCallConnecting(true);
          try {
            const pc = await ensurePeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            setRemoteParticipant(from);
            setIsCallActive(true);
            socketRef.current?.emit("webrtc-answer", { sessionId, from: userName, answer });
          } catch (err) {
            console.error("[webrtc] error handling offer", err);
            setCallError("Could not join call.");
            cleanupCall();
          } finally {
            setIsCallConnecting(false);
          }
        },
      );

      socket.on(
        "webrtc-answer",
        async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
          if (from === userName) return;
          const pc = peerConnectionRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error("[webrtc] error handling answer", err);
          }
        },
      );

      socket.on(
        "webrtc-ice-candidate",
        async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
          if (from === userName) return;
          const pc = peerConnectionRef.current;
          if (!pc || !candidate) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("[webrtc] error adding ICE candidate", err);
          }
        },
      );

      socket.on("webrtc-end-call", () => { cleanupCall(); });
    };

    void initSocket();

    return () => {
      if (joinedSessionRef.current && socketRef.current) {
        socketRef.current.emit("leave-session", sessionId);
      }
      socketRef.current?.disconnect();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      cursorListenerRef.current?.dispose();
      aiActionRef.current?.dispose();
      if (runnerWorkerRef.current) {
        runnerWorkerRef.current.terminate();
        runnerWorkerRef.current = null;
      }
      // Destroy MonacoBinding on unmount.
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      cleanupCall();
    };
  }, [cleanupCall, ensurePeerConnection, sessionId, userName]);

  // ─── AI Review (BullMQ queue + SSE stream) ───────────────────────────────
  const askAiReview = useCallback(
    async (lineNumber?: number) => {
      void lineNumber;
      try {
        setAskingAi(true);
        setAiStreamText("");
        setAiQueuePosition(null);

        socketRef.current?.emit("ai-review-requested", { sessionId });

        const enqueueRes = await fetch(
          `/api/sessions/${sessionId}/ai-review`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullReview: true }),
          },
        );

        if (!enqueueRes.ok) {
          const payload = (await enqueueRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Failed to queue review");
        }

        const { jobId, position } = (await enqueueRes.json()) as {
          jobId: string;
          position: number;
        };

        if (position > 1) setAiQueuePosition(position);

        const streamRes = await fetch(
          `/api/sessions/${sessionId}/ai-review/stream?jobId=${jobId}`,
        );

        if (!streamRes.ok || !streamRes.body) {
          throw new Error("Could not open review stream");
        }

        setAiQueuePosition(null);

        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const parts = sseBuffer.split("\n\n");
          sseBuffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6);
            try {
              const event = JSON.parse(raw) as {
                token?: string;
                done?: boolean;
                comments?: AiFeedback[];
                progress?: { phase: string; pct: number };
                error?: string;
              };
              if (event.error) throw new Error(event.error);
              if (event.token) setAiStreamText((prev) => prev + event.token);
              if (event.done && event.comments) {
                setAiFeedback((cur) =>
                  [...(Array.isArray(event.comments) ? event.comments : []), ...cur].slice(0, 20),
                );
                setAiStreamText("");
              }
            } catch (parseErr) {
              console.error("[ai-sse] parse error", parseErr);
            }
          }
        }
      } catch (err) {
        console.error("[askAiReview]", err);
        setAiStreamText("");
        setAiQueuePosition(null);
      } finally {
        setAskingAi(false);
      }
    },
    [sessionId],
  );

  // ─── File Management ──────────────────────────────────────────────────────
  const handleSelectFile = useCallback(
    (fileId: string, fileName: string) => {
      const file = sessionFilesRef.current.find((f) => f.id === fileId);
      if (file) {
        setActiveFileId(fileId);
        setActiveFileName(fileName);
        codeRef.current = file.content;
        setCurrentLine(1);
        // Actual editor value update + binding teardown handled in the
        // activeFileId useEffect above.
      }
    },
    [],
  );

  const handleFileCreated = useCallback((newFile: typeof initialFiles[0]) => {
    setSessionFiles((cur) => [...cur, newFile]);
  }, []);

  const handleFileDeleted = useCallback(
    (fileId: string) => {
      setSessionFiles((cur) => cur.filter((f) => f.id !== fileId));
      if (activeFileId === fileId) {
        setActiveFileId(null);
        // Returning to main session — codeRef will be updated from ytextRef
        // by the activeFileId useEffect when it re-creates the MonacoBinding.
        codeRef.current = ytextRef.current?.toString() ?? initialCode;
      }
    },
    [activeFileId, initialCode],
  );

  // ─── Editor mount ─────────────────────────────────────────────────────────
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Set up MonacoBinding for the main-session (yjs) mode. If a file is
      // already selected at mount time, skip — the file-mode useEffect will
      // manage the editor value directly.
      if (activeFileIdRef.current === null && ytextRef.current && !bindingRef.current) {
        const model = editor.getModel();
        if (model && ytextRef.current) {
          bindingRef.current = createYjsMonacoBinding(ytextRef.current, model);
        }

        // Sync: send our state vector so the server can reply with anything we
        // might have missed (important on fast reconnects).
        if (socketRef.current?.connected && ydocRef.current) {
          const sv = Y.encodeStateVector(ydocRef.current);
          socketRef.current.emit("yjs-sync", {
            sessionId,
            stateVector: Array.from(sv),
          });
        }
      }

      cursorListenerRef.current?.dispose();
      cursorListenerRef.current = editor.onDidChangeCursorPosition((e: { position: { lineNumber: number } }) => {
        const nextLine = e.position.lineNumber;
        setCurrentLine(nextLine);
        if (nextLine !== lastEmittedLineRef.current && socketRef.current?.connected) {
          lastEmittedLineRef.current = nextLine;
          socketRef.current.emit("cursor-move", { sessionId, lineNumber: nextLine });
        }
      });

      aiActionRef.current?.dispose();
      aiActionRef.current = editor.addAction({
        id: "ask-ai-review",
        label: "Ask AI Review",
        contextMenuGroupId: "navigation",
        run: () => void askAiReview(editor.getPosition()?.lineNumber ?? 1),
      });

      updateRemoteCursors();
    },
    [askAiReview, sessionId, updateRemoteCursors],
  );

  // ─── onChange: file-mode only ─────────────────────────────────────────────
  // In yjs (main-session) mode changes flow through the ydoc observer, so
  // onChange only needs to act when a session file is active.
  const onChange = (value: string | undefined) => {
    const nextCode = value ?? "";
    codeRef.current = nextCode;

    if (activeFileIdRef.current !== null) {
      if (!isApplyingRemoteChange.current) {
        socketRef.current?.emit("code-update", { sessionId, code: nextCode });
      }
      if (isOwnerRef.current) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(
          () => void saveCodeRef.current(nextCode),
          900,
        );
      }
    }
  };

  const runCodeInBrowser = useCallback(async () => {
    if (typeof window === "undefined") {
      setRunOutput(["Running code is not available in this environment."]);
      return;
    }

    const originalSource = codeRef.current;
    setIsRunning(true);
    setRunOutput([]);

    // Non-JS/TS languages: run via Piston API sandbox
    if (!isLocalExecution) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: originalSource, language }),
        });
        const result = (await res.json()) as {
          run?: { stdout: string; stderr: string; code: number };
          compile?: { stdout: string; stderr: string; code: number };
          error?: string;
          message?: string;
        };

        if (!res.ok || result.error) {
          appendRunOutput(`✖ ${result.error ?? result.message ?? "Execution failed"}`);
          return;
        }

        if (result.compile && result.compile.code !== 0) {
          appendRunOutput("Compilation error:");
          if (result.compile.stderr) appendRunOutput(result.compile.stderr);
          if (result.compile.stdout) appendRunOutput(result.compile.stdout);
          return;
        }

        const run = result.run;
        if (run) {
          if (run.stdout) run.stdout.split("\n").forEach((l) => appendRunOutput(l));
          if (run.stderr) run.stderr.split("\n").forEach((l) => appendRunOutput(`✖ ${l}`));
          appendRunOutput(`Exited with code ${run.code}.`);
        }
      } catch (err) {
        appendRunOutput(`✖ ${err instanceof Error ? err.message : "Network error"}`);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    let codeToRun = originalSource;

    if (language === "typescript") {
      try {
        if (!tsModuleRef.current) {
          const ts = (await import("typescript")) as typeof import("typescript");
          tsModuleRef.current = ts;
        }
        const ts = tsModuleRef.current!;
        const result = ts.transpileModule(originalSource, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2020,
            jsx: ts.JsxEmit.React,
          },
          reportDiagnostics: true,
        });
        const diagnostics = result.diagnostics || [];
        if (diagnostics.length > 0) {
          diagnostics.forEach((d) => {
            const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
            if (d.file && typeof d.start === "number") {
              const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
              appendRunOutput(`TS${d.code} [${line + 1},${character + 1}]: ${message}`);
            } else {
              appendRunOutput(`TS${d.code}: ${message}`);
            }
          });
          setIsRunning(false);
          return;
        }
        codeToRun = result.outputText;
      } catch (error) {
        appendRunOutput(
          `✖ TypeScript compile error: ${error instanceof Error ? error.message : String(error)}`,
        );
        setIsRunning(false);
        return;
      }
    }

    const workerSource = `
      self.onmessage = (event) => {
        const sourceCode = String(event.data ?? "");
        const send = (kind, payload) => {
          self.postMessage({ type: kind, data: String(payload ?? "") });
        };
        const console = {
          log: (...args) => send("log", args.join(" ")),
          error: (...args) => send("error", args.join(" ")),
          warn: (...args) => send("warn", args.join(" ")),
          info: (...args) => send("info", args.join(" ")),
        };
        try {
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const fn = new AsyncFunction("console", sourceCode);
          Promise.resolve(fn(console))
            .then(() => { send("done", "Execution finished."); })
            .catch((error) => { send("error", error && error.stack ? error.stack : error); });
        } catch (error) {
          send("error", error && error.stack ? error.stack : error);
        }
      };
    `;

    const blob = new Blob([workerSource], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    runnerWorkerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const payload = event.data as { type?: string; data?: string } | null;
      if (!payload) return;
      const { type, data } = payload;
      if (type === "log") appendRunOutput(data ?? "");
      else if (type === "warn") appendRunOutput(`⚠ ${data ?? ""}`);
      else if (type === "info") appendRunOutput(data ?? "");
      else if (type === "error") appendRunOutput(`✖ ${data ?? ""}`);
      else if (type === "done") appendRunOutput(data ?? "Execution finished.");
      if (type === "error" || type === "done") {
        setIsRunning(false);
        worker.terminate();
        runnerWorkerRef.current = null;
        URL.revokeObjectURL(workerUrl);
      }
    };

    worker.onerror = (event) => {
      appendRunOutput(`✖ Worker error: ${event.message}`);
      setIsRunning(false);
      worker.terminate();
      runnerWorkerRef.current = null;
      URL.revokeObjectURL(workerUrl);
    };

    worker.postMessage(codeToRun);
  }, [appendRunOutput, isLocalExecution, language, sessionId]);

  const importRepoFile = useCallback(
    async (path: string) => {
      if (!githubRepoUrl) return;
      const confirmed = window.confirm(
        `Replace the current session code with '${path}' from the attached GitHub repo? This will update the shared editor for everyone in this session.`,
      );
      if (!confirmed) return;

      try {
        const res = await fetch(
          `/api/sessions/${sessionId}/github/file?path=${encodeURIComponent(path)}`,
        );
        const payload = (await res.json()) as { content?: string; error?: string };
        if (!res.ok || !payload.content) {
          throw new Error(payload.error || "Failed to load file from GitHub");
        }

        const nextCode = payload.content;
        codeRef.current = nextCode;

        if (ytextRef.current && ydocRef.current && activeFileIdRef.current === null) {
          // yjs mode — replace via a transaction so the ydoc observer broadcasts.
          ydocRef.current.transact(() => {
            ytextRef.current!.delete(0, ytextRef.current!.length);
            ytextRef.current!.insert(0, nextCode);
          });
        } else {
          // File mode — fall back to the old broadcast + manual editor update.
          editorRef.current?.setValue(nextCode);
          socketRef.current?.emit("code-update", { sessionId, code: nextCode });
          if (isOwnerRef.current) {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(
              () => void saveCodeRef.current(nextCode),
              400,
            );
          }
        }
      } catch (err) {
        console.error("[github-import]", err);
        setRepoError(
          err instanceof Error ? err.message : "Failed to import file from GitHub.",
        );
      }
    },
    [githubRepoUrl, sessionId],
  );

  // ─── Save status label ────────────────────────────────────────────────────
  const saveStatusLabel = isOwner
    ? {
        saving: "Saving changes...",
        saved: "All changes saved.",
        error: "Save failed. Try again.",
        idle: "Changes auto-save as you type.",
      }[saveStatus]
    : "Viewing as collaborator — owner saves changes.";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      <div className="mx-auto flex max-w-400 flex-col gap-4 px-4 py-5 md:px-6">
        {/* Header */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80">
                Collaborative Review Session
              </p>
              <h1 className="mt-1 text-xl font-semibold text-white">
                Session: {title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300">
                {connected ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-red-300" />
                )}
                {connected ? "Connected" : "Reconnecting…"}
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300">
                <Users className="h-3.5 w-3.5 text-indigo-300" />
                {presenceMembers.length}{" "}
                {presenceMembers.length === 1 ? "user" : "users"} online
              </div>

              {isOwner && (
                <button
                  onClick={() => void saveCode(codeRef.current)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-300 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-indigo-200"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
              )}

              <button
                onClick={() => void copyInviteLink()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <Link2 className="h-3.5 w-3.5" />
                Collaborator Link
              </button>

              {githubRepoUrl && (
                <a
                  href={githubRepoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  <Github className="h-3.5 w-3.5" />
                  Repo
                </a>
              )}

              <a
                href={`/session/${sessionId}/replay`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <History className="h-3.5 w-3.5" />
                Replay
              </a>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-400">
            {saveStatusLabel}
            {inviteCopied && " Invite link copied to clipboard."}
          </div>

          {joinNotification && (
            <div className="mt-3 rounded-lg border border-indigo-400/40 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-100">
              {joinNotification}
            </div>
          )}

          {/* Collaborator avatars */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Collaborators:
            </span>
            <div className="flex -space-x-2.5">
              <span
                className="z-10 rounded-full border-2 border-slate-900 px-2 py-0.5 text-xs font-medium"
                style={{ background: "#6366f1", color: "#fff" }}
              >
                {localDisplayName}
                {isOwner && <span className="ml-1 opacity-60">(owner)</span>}
              </span>
              {activeMembers.map((member) => {
                const c = colorForUser(member.userName);
                return (
                  <span
                    key={member.userName}
                    className="rounded-full border-2 border-slate-900 px-2 py-0.5 text-xs font-medium"
                    style={{ background: c.bg, color: c.text }}
                  >
                    {member.userName}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Editor + Sidebar */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="relative space-y-4 lg:col-span-9">
            {/*
              Uncontrolled editor — yjs (via MonacoBinding) drives the model
              for the main session content.  For session files we manually call
              editor.setValue() inside the activeFileId effect above.
            */}
            <Editor
              height="60vh"
              language={editorLanguage}
              theme="vs-dark"
              defaultValue={activeFileId === null ? initialCode : (sessionFiles.find(f => f.id === activeFileId)?.content ?? "")}
              onChange={onChange}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "var(--font-geist-mono)",
                scrollBeyondLastLine: false,
                contextmenu: true,
                links: true,
                wordWrap: "on",
              }}
            />

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Terminal className="h-4 w-4 text-emerald-300" />
                  <p className="font-medium">Run &amp; Output</p>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    {isLocalExecution ? "local" : "sandbox"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void runCodeInBrowser()}
                  disabled={isRunning}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-[0_0_0_1px_rgba(16,185,129,0.45)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {isRunning ? "Running..." : "Run Code"}
                </button>
              </div>

              <div className="mt-3 h-40 overflow-y-auto rounded-lg border border-slate-800 bg-[#020617] px-3 py-2 font-mono text-xs text-slate-200">
                {runOutput.length > 0 ? (
                  runOutput.map((line, index) => (
                    <p key={index} className="whitespace-pre-wrap">{line}</p>
                  ))
                ) : (
                  <p className="text-slate-500">
                    Ready. Click <span className="font-semibold">Run Code</span> to execute.
                    {!isLocalExecution && " Non-JS/TS languages run in a remote sandbox."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-3">
            {/* Session Files Explorer */}
            {sessionFiles.length > 0 || isOwner ? (
              <FileExplorer
                sessionId={sessionId}
                files={sessionFiles.map((f) => ({
                  id: f.id,
                  file_name: f.file_name,
                  created_at: f.created_at,
                  updated_at: f.updated_at,
                }))}
                activeFileId={activeFileId}
                onSelectFile={handleSelectFile}
                onFileCreated={handleFileCreated}
                onFileDeleted={handleFileDeleted}
                isOwner={isOwner}
              />
            ) : null}

            {/* GitHub File Explorer */}
            {githubRepoUrl && (
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4" />
                  <p className="font-medium">GitHub Repository</p>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Browsing attached repository
                </div>
                <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto text-sm">
                  {repoLoading ? (
                    <p className="text-xs text-slate-400">Loading repo…</p>
                  ) : repoError ? (
                    <p className="text-xs text-red-300">{repoError}</p>
                  ) : repoFiles && repoFiles.length > 0 ? (
                    visibleRepoFiles.map((entry) => {
                      const depth = entry.path.split("/").length - 1;
                      const name = entry.path.split("/").pop() ?? entry.path;
                      const isDir = entry.type === "dir";
                      const isExpanded = isDir && expandedDirs.includes(entry.path);
                      const handleClick = () => {
                        if (isDir) {
                          setExpandedDirs((prev) =>
                            prev.includes(entry.path)
                              ? prev.filter((p) => p !== entry.path)
                              : [...prev, entry.path],
                          );
                        } else {
                          void importRepoFile(entry.path);
                        }
                      };
                      return (
                        <button
                          key={entry.path}
                          type="button"
                          onClick={handleClick}
                          className="flex w-full items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5 text-left text-xs text-slate-200 transition hover:bg-slate-700"
                          style={{ paddingLeft: 12 + depth * 12 }}
                        >
                          <span className="text-slate-500">
                            {isDir ? (isExpanded ? "📂" : "📁") : "📄"}
                          </span>
                          <span className="truncate">{name}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400">
                      No files found in the repository.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Review */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <p className="font-medium">AI Review Panel</p>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => void askAiReview()}
                  disabled={askingAi}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {askingAi && <Loader2 className="h-4 w-4 animate-spin" />}
                  {askingAi
                    ? aiQueuePosition && aiQueuePosition > 1
                      ? `Queue position #${aiQueuePosition}…`
                      : "Analyzing…"
                    : "Full Code Review"}
                </button>

                {aiStreamText && (
                  <div className="rounded-lg border border-indigo-700/40 bg-indigo-950/30 p-3">
                    <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-indigo-400">
                      AI is reviewing…
                    </p>
                    <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed text-slate-300">
                      {aiStreamText}
                      <span className="animate-pulse">▋</span>
                    </p>
                  </div>
                )}

                <div className="max-h-[300px] space-y-2 overflow-y-auto">
                  {aiFeedback.length > 0 ? (
                    aiFeedback.map((fb, i) => {
                      const severityColors = {
                        error: "bg-red-900/30 border-red-700/50",
                        warning: "bg-yellow-900/30 border-yellow-700/50",
                        suggestion: "bg-blue-900/30 border-blue-700/50",
                        info: "bg-slate-800/50 border-slate-700/50",
                      };
                      const severityBadgeColors = {
                        error: "bg-red-900 text-red-200",
                        warning: "bg-yellow-900 text-yellow-200",
                        suggestion: "bg-blue-900 text-blue-200",
                        info: "bg-slate-700 text-slate-200",
                      };
                      const categoryEmoji = {
                        security: "🔒",
                        performance: "⚡",
                        style: "✨",
                        logic: "🧠",
                        best_practice: "📋",
                      };
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 ${severityColors[fb.severity]}`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-300">
                              Lines {fb.line_start}
                              {fb.line_end !== fb.line_start ? `–${fb.line_end}` : ""}
                            </span>
                            <div className="flex gap-1">
                              <span
                                className={`inline-block rounded px-2 py-1 text-xs font-semibold ${severityBadgeColors[fb.severity]}`}
                              >
                                {fb.severity}
                              </span>
                              <span className="text-xs">
                                {categoryEmoji[fb.category] || "📝"}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-200">{fb.message}</p>
                          {fb.suggestion && (
                            <div className="mt-2 rounded bg-slate-900/50 p-2">
                              <p className="font-mono text-xs text-slate-300">
                                💡 {fb.suggestion}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg bg-slate-800/50 p-3 text-center">
                      <p className="text-xs text-slate-400">
                        Click "Full Code Review" to analyze your code with AI.
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        You'll get feedback on security, performance, style,
                        logic, and best practices.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live Presence */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <p className="font-medium">Live Presence</p>
              </div>
              <div className="mt-3 max-h-[200px] space-y-2 overflow-y-auto text-sm">
                <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: "#6366f1" }}
                    />
                    <p>{localDisplayName}</p>
                  </div>
                  <p className="text-slate-400">line {currentLine}</p>
                </div>
                {activeMembers.map((member) => {
                  const c = colorForUser(member.userName);
                  return (
                    <div
                      key={member.userName}
                      className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ background: c.bg }}
                        />
                        <p>{member.userName}</p>
                      </div>
                      <p className="text-slate-400">line {member.lineNumber}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Call */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <p className="font-medium">Live Call (beta)</p>
                </div>
                <button
                  type="button"
                  onClick={() => (isCallActive ? endCall() : void startCall())}
                  disabled={
                    !connected ||
                    isCallConnecting ||
                    (!isCallActive && activeMembers.length === 0)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCallActive ? (
                    <>
                      <PhoneOff className="h-3.5 w-3.5 text-red-400" />
                      End
                    </>
                  ) : (
                    <>
                      {isCallConnecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Video className="h-3.5 w-3.5 text-emerald-300" />
                      )}
                      Call
                    </>
                  )}
                </button>
              </div>

              {callError && (
                <p className="mt-2 text-xs text-red-300">{callError}</p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
                  <video
                    ref={localVideoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    muted
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-1.5 text-[10px] text-slate-200">
                    <span className="rounded bg-slate-900/70 px-1.5 py-0.5">You</span>
                    {isCallActive && (
                      <span className="rounded bg-emerald-500/80 px-1.5 py-0.5 text-[10px] text-slate-950">
                        Live
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
                  <video
                    ref={remoteVideoRef}
                    className="h-full w-full object-cover"
                    playsInline
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-1.5 text-[10px] text-slate-200">
                    <span className="rounded bg-slate-900/70 px-1.5 py-0.5">
                      {remoteParticipant ?? "Waiting for collaborator"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
