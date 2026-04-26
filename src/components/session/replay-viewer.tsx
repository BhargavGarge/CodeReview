"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bot, Clock, Code2, MousePointer2 } from "lucide-react";
import type { Json, SessionEventType } from "@/types/database";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface SessionEvent {
  id: string;
  event_type: SessionEventType;
  created_at: string;
  payload: Json;
  user_id: string | null;
}

interface Snapshot {
  id: string;
  code: string;
  saved_by: string | null;
  created_at: string;
}

interface ReplayData {
  session: { id: string; title: string; language: string };
  events: SessionEvent[];
  snapshots: Snapshot[];
}

interface ReplayViewerProps {
  sessionId: string;
  sessionTitle: string;
  language: string;
}

function payloadField<T>(payload: Json, key: string): T | undefined {
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    return (payload as Record<string, Json>)[key] as T | undefined;
  }
  return undefined;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

const EVENT_META: Record<
  SessionEventType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  "code-update": {
    label: "Code edit",
    icon: <Code2 className="h-3 w-3" />,
    color: "text-indigo-300 border-indigo-700/50 bg-indigo-950/30",
  },
  "cursor-move": {
    label: "Cursor move",
    icon: <MousePointer2 className="h-3 w-3" />,
    color: "text-slate-300 border-slate-700/50 bg-slate-800/30",
  },
  "ai-review-requested": {
    label: "AI review",
    icon: <Bot className="h-3 w-3" />,
    color: "text-emerald-300 border-emerald-700/50 bg-emerald-950/30",
  },
};

export function ReplayViewer({ sessionId, sessionTitle, language }: ReplayViewerProps) {
  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrubIdx, setScrubIdx] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/events`);
        if (!res.ok) throw new Error("Failed to load replay data");
        const json = (await res.json()) as ReplayData;
        setData(json);
        setScrubIdx(json.events.length > 0 ? json.events.length - 1 : 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [sessionId]);

  // Visible events up to the current scrub position
  const visibleEvents = useMemo(() => {
    if (!data) return [];
    return data.events.slice(0, scrubIdx + 1);
  }, [data, scrubIdx]);

  // Nearest snapshot at or before the scrub index event time
  const activeCode = useMemo(() => {
    if (!data) return "";
    if (data.snapshots.length === 0) return "// No snapshots saved yet for this session.";

    const currentEventTime =
      data.events[scrubIdx]?.created_at ?? data.events[data.events.length - 1]?.created_at;

    if (!currentEventTime) return data.snapshots[data.snapshots.length - 1]?.code ?? "";

    const before = data.snapshots.filter((s) => s.created_at <= currentEventTime);
    return before.length > 0
      ? before[before.length - 1].code
      : (data.snapshots[0]?.code ?? "");
  }, [data, scrubIdx]);

  // Per-user cursor state at scrub position
  const cursorState = useMemo(() => {
    const state = new Map<string, number>();
    for (const evt of visibleEvents) {
      if (evt.event_type === "cursor-move") {
        const user = payloadField<string>(evt.payload, "userName") ?? evt.user_id ?? "unknown";
        const line = payloadField<number>(evt.payload, "lineNumber") ?? 1;
        state.set(user, line);
      }
    }
    return state;
  }, [visibleEvents]);

  const sessionDurationMs = useMemo(() => {
    if (!data || data.events.length < 2) return 0;
    return (
      new Date(data.events[data.events.length - 1].created_at).getTime() -
      new Date(data.events[0].created_at).getTime()
    );
  }, [data]);

  // Scroll timeline list to the scrubbed event
  const scrubToEvent = useCallback(
    (idx: number) => {
      setScrubIdx(idx);
      const el = timelineRef.current?.children[idx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] text-slate-400">
        Loading replay…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] text-red-300">
        {error ?? "Failed to load replay data."}
      </div>
    );
  }

  const currentEvent = data.events[scrubIdx];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-4 px-4 py-5 md:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
          <a
            href={`/session/${sessionId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to session
          </a>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Session Replay</p>
            <h1 className="mt-0.5 text-lg font-semibold text-white">{sessionTitle}</h1>
          </div>
          <div className="ml-auto flex gap-4 text-xs text-slate-400">
            <span>
              <span className="font-medium text-slate-200">{data.events.length}</span> events
            </span>
            <span>
              <span className="font-medium text-slate-200">{data.snapshots.length}</span> snapshots
            </span>
            {sessionDurationMs > 0 && (
              <span>
                <span className="font-medium text-slate-200">
                  {formatDuration(sessionDurationMs)}
                </span>{" "}
                total
              </span>
            )}
          </div>
        </div>

        {data.events.length === 0 ? (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-8 text-center text-slate-400">
            No events recorded for this session yet.
          </div>
        ) : (
          <>
            {/* Scrubber */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 shrink-0 text-indigo-300" />
                <input
                  type="range"
                  min={0}
                  max={data.events.length - 1}
                  value={scrubIdx}
                  onChange={(e) => scrubToEvent(Number(e.target.value))}
                  className="flex-1 accent-indigo-400"
                />
                <span className="w-20 shrink-0 text-right text-xs text-slate-400">
                  {currentEvent ? formatTime(currentEvent.created_at) : "—"}
                </span>
              </div>
              {currentEvent && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>
                    Event {scrubIdx + 1} / {data.events.length}
                  </span>
                  <span>·</span>
                  <span className="capitalize">{currentEvent.event_type.replace(/-/g, " ")}</span>
                  {payloadField<string>(currentEvent.payload, "userName") && (
                    <>
                      <span>·</span>
                      <span>{payloadField<string>(currentEvent.payload, "userName")}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Code panel */}
              <div className="space-y-3 lg:col-span-8">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 backdrop-blur-xl">
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Code at this point
                    {data.snapshots.length === 0 && (
                      <span className="ml-2 text-yellow-400">(no snapshots — save code during session)</span>
                    )}
                  </p>
                  <div className="overflow-hidden rounded-lg border border-slate-800">
                    <Editor
                      height="55vh"
                      language={language === "csharp" ? "csharp" : language}
                      theme="vs-dark"
                      value={activeCode}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                      }}
                    />
                  </div>
                </div>

                {/* Cursor state */}
                {cursorState.size > 0 && (
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
                    <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      Cursor positions at this point
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(cursorState.entries()).map(([user, line]) => (
                        <div
                          key={user}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs"
                        >
                          <MousePointer2 className="h-3 w-3 text-indigo-300" />
                          <span className="font-medium">{user}</span>
                          <span className="text-slate-400">line {line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Event timeline */}
              <div className="lg:col-span-4">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl">
                  <p className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                    Event timeline
                  </p>
                  <div
                    ref={timelineRef}
                    className="max-h-[65vh] space-y-1 overflow-y-auto"
                  >
                    {data.events.map((evt, idx) => {
                      const meta = EVENT_META[evt.event_type];
                      const isActive = idx === scrubIdx;
                      const isPast = idx < scrubIdx;
                      const userName = payloadField<string>(evt.payload, "userName");
                      const lineNumber = payloadField<number>(evt.payload, "lineNumber");

                      return (
                        <button
                          key={evt.id}
                          type="button"
                          onClick={() => scrubToEvent(idx)}
                          className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                            isActive
                              ? `ring-1 ring-inset ring-indigo-400 ${meta.color}`
                              : isPast
                                ? `${meta.color} opacity-60`
                                : "border-slate-800 bg-slate-900 text-slate-500 opacity-40"
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">{meta.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium">{meta.label}</span>
                              <span className="text-[10px] opacity-70">
                                {formatTime(evt.created_at)}
                              </span>
                            </div>
                            {userName && (
                              <p className="truncate opacity-75">{userName}</p>
                            )}
                            {lineNumber !== undefined && (
                              <p className="opacity-60">line {lineNumber}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
