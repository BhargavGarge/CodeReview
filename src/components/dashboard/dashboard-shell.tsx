"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  Bell,
  CircleDot,
  Compass,
  GitBranch,
  Loader2,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SessionLanguage } from "@/types/database";

export interface DashboardStat {
  label: string;
  value: number;
}

export interface DashboardSessionItem {
  id: string;
  title: string;
  subtitle: string;
  activity: string;
  collaborators: number;
  status: "In Review" | "Action Required" | "Archived";
}

interface InviteNotification {
  sessionId: string;
  sessionName: string;
}

interface DashboardShellProps {
  userId: string;
  displayName: string;
  stats: DashboardStat[];
  sessions: DashboardSessionItem[];
  inviteNotification?: InviteNotification;
}

type StartMode = "blank" | "paste" | "import";

const languageOptions: Array<{ label: string; value: SessionLanguage }> = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "Other", value: "other" },
];

const statusClassName: Record<DashboardSessionItem["status"], string> = {
  "In Review": "border border-indigo-400/40 bg-indigo-500/20 text-indigo-100",
  "Action Required": "border border-red-400/40 bg-red-500/20 text-red-100",
  Archived: "border border-slate-400/30 bg-slate-500/15 text-slate-200",
};

export function DashboardShell({
  userId,
  displayName,
  stats,
  sessions,
  inviteNotification,
}: DashboardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("New Review Session");
  const [language, setLanguage] = useState<SessionLanguage>("typescript");
  const [startMode, setStartMode] = useState<StartMode>("blank");
  const [pastedCode, setPastedCode] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  // Real-time invite pushed via Supabase Realtime (for users already on dashboard)
  const [realtimeInvite, setRealtimeInvite] =
    useState<InviteNotification | null>(null);
  const [sessionList, setSessionList] =
    useState<DashboardSessionItem[]>(sessions);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setSessionList(sessions);
  }, [sessions]);

  // Subscribe to session_participants changes for this user so that an invite
  // notification appears immediately — even if they never navigated away.
  // Requires the session_participants table to be added to the supabase_realtime
  // Postgres publication in your Supabase project (Database → Replication).
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`user-invites-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_participants",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newRow = payload.new as { session_id: string };

          // After the INSERT, RLS allows the user to read the session
          // (can_access_session → is_session_participant is now true).
          const { data: sessionData } = await supabase
            .from("sessions")
            .select("id, title")
            .eq("id", newRow.session_id)
            .single();

          if (sessionData) {
            setRealtimeInvite({
              sessionId: sessionData.id,
              sessionName: sessionData.title,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const blankStarter = useMemo(() => {
    switch (language) {
      case "python":
        return "def review_target():\n    return 'start collaborating'\n";
      case "go":
        return "package main\n\nfunc main() {\n    // Start collaborating\n}\n";
      case "rust":
        return "fn main() {\n    // Start collaborating\n}\n";
      case "javascript":
        return "function reviewTarget() {\n  // Start collaborating\n}\n";
      default:
        return "function reviewTarget(): void {\n  // Start collaborating\n}\n";
    }
  }, [language]);

  const urlSessionId = searchParams?.get("sessionId");
  const urlSessionName = searchParams?.get("sessionName");

  // Priority: realtime push > URL params > prop passed from server
  const activeInviteNotification: InviteNotification | undefined =
    realtimeInvite ??
    inviteNotification ??
    (urlSessionId && urlSessionName
      ? { sessionId: urlSessionId, sessionName: urlSessionName }
      : undefined);
  const hasInviteError = searchParams?.get("inviteError") === "1";

  async function handleDeleteSession(sessionIdToDelete: string) {
    if (sessionIdToDelete.startsWith("demo-")) return;

    const confirmed = window.confirm(
      "Delete this session? This will remove it for all collaborators and cannot be undone.",
    );
    if (!confirmed) return;

    try {
      setDeleteError(null);
      setDeletingSessionId(sessionIdToDelete);

      const response = await fetch(`/api/sessions/${sessionIdToDelete}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete session");
      }

      setSessionList((current) =>
        current.filter((session) => session.id !== sessionIdToDelete),
      );
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete session",
      );
    } finally {
      setDeletingSessionId(null);
    }
  }

  async function createSession() {
    try {
      setIsCreating(true);
      setError(null);

      const code =
        startMode === "blank"
          ? blankStarter
          : startMode === "paste"
            ? pastedCode.trim() || blankStarter
            : blankStarter;

      const description =
        startMode === "import" && githubRepo.trim().length > 0
          ? `GitHub import source: ${githubRepo.trim()}`
          : undefined;

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sessionName.trim() || "Untitled Session",
          language,
          description,
          // Persist the raw GitHub URL in a dedicated column so the
          // editor can reliably load the repo tree and files.
          githubRepoUrl:
            startMode === "import" && githubRepo.trim().length > 0
              ? githubRepo.trim()
              : undefined,
          code,
        }),
      });

      const payload = (await response.json()) as {
        session?: { id: string };
        error?: string;
      };

      if (!response.ok || !payload.session?.id) {
        throw new Error(payload.error || "Failed to create session");
      }

      setIsSetupOpen(false);
      router.push(`/session/${payload.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_16%,rgba(99,102,241,0.26)_0%,rgba(3,7,18,0)_42%),radial-gradient(circle_at_80%_24%,rgba(16,185,129,0.16)_0%,rgba(3,7,18,0)_38%),linear-gradient(180deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,1)_80%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-360 flex-col lg:flex-row">
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full border-b border-slate-800/80 bg-slate-950/80 px-4 py-6 backdrop-blur-xl lg:w-64 lg:border-b-0 lg:border-r lg:px-5"
        >
          <div className="mb-8 flex items-center gap-2 px-2">
            <CircleDot className="h-4 w-4 text-indigo-400" />
            <p className="text-sm font-medium tracking-wide text-slate-200">
              CodeReview.live
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Development
              </p>
              <div className="mt-3 space-y-1">
                <button className="flex w-full items-center gap-3 rounded-lg bg-indigo-500/20 px-3 py-2 text-sm font-medium text-indigo-100">
                  <Activity className="h-4 w-4" />
                  Sessions
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/80">
                  <GitBranch className="h-4 w-4" />
                  Repositories
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/80">
                  <Users className="h-4 w-4" />
                  Team
                </button>
              </div>
            </div>

            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                System
              </p>
              <div className="mt-3 space-y-1">
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/80">
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/80">
                  <Compass className="h-4 w-4" />
                  Support
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSetupOpen(true)}
            className="mt-8 hidden w-full items-center justify-center gap-2 rounded-lg bg-indigo-400/90 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 lg:flex"
          >
            <Plus className="h-4 w-4" />
            New Review Session
          </button>
        </motion.aside>

        <section className="flex-1 px-4 py-4 md:px-6 md:py-5 lg:px-8">
          {hasInviteError ? (
            <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.12)]">
              <p className="text-xs uppercase tracking-[0.16em] text-amber-200/80">
                Invite Not Available
              </p>
              <p className="mt-1">
                This invite link is invalid or has expired. Ask your
                collaborator to send a new link.
              </p>
            </div>
          ) : null}

          <AnimatePresence>
            {activeInviteNotification ? (
              <motion.div
                key="invite-notification"
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="mb-5 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-4 py-4 text-sm text-indigo-100 shadow-[0_12px_36px_rgba(99,102,241,0.22)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-300" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200/80">
                        You&apos;ve been invited to collaborate
                      </p>
                      <p className="mt-1 text-sm text-indigo-100">
                        A collaborator is waiting for you in{" "}
                        <span className="font-semibold text-white">
                          {activeInviteNotification.sessionName}
                        </span>
                        . Join now to start coding together in real time.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Link
                      href={`/session/${activeInviteNotification.sessionId}`}
                      className="rounded-lg bg-indigo-300 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-indigo-200"
                    >
                      Join Live Session →
                    </Link>
                    <button
                      onClick={() => setRealtimeInvite(null)}
                      className="rounded-lg border border-indigo-400/30 p-2 text-indigo-300 transition hover:bg-indigo-500/20"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.header
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mb-6 flex flex-col gap-4 border-b border-slate-800/70 pb-5 md:flex-row md:items-center md:justify-between"
          >
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                aria-label="Search"
                placeholder="Search files, commits, or actions..."
                className="w-full rounded-lg border border-slate-700/80 bg-slate-900/70 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-4 md:justify-end">
              <p className="text-sm text-slate-400">
                Signed in as{" "}
                <span className="font-medium text-slate-200">
                  {displayName}
                </span>
              </p>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="rounded-lg border border-slate-700/70 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
                >
                  Sign out
                </button>
              </form>
            </div>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
            className="space-y-6"
          >
            <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-xl border border-slate-800/70 bg-linear-to-br from-slate-900/80 via-slate-900/65 to-indigo-950/35 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-indigo-300/80">
                  Dashboard Overview
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-100">
                  Welcome {displayName} 👋
                </h1>
                <p className="mt-2 max-w-xl text-sm text-slate-400">
                  Create a new review session or continue a previous one.
                </p>
                <div className="mt-5 flex flex-wrap items-start gap-3">
                  <motion.button
                    onClick={() => setIsSetupOpen(true)}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-indigo-300/70 bg-linear-to-r from-indigo-300 via-violet-300 to-fuchsia-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_18px_44px_rgba(129,140,248,0.42)] ring-1 ring-indigo-200/40 transition"
                  >
                    <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_48%)] opacity-80" />
                    <Plus className="h-4 w-4" />+ New Review Session
                  </motion.button>
                  <button
                    onClick={() => {
                      const container =
                        document.getElementById("recent-sessions");
                      container?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70"
                  >
                    Continue Previous Session
                  </button>
                </div>
                <p className="mt-2 text-xs text-indigo-100/80">
                  Create Session -&gt; Editor Workspace
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-slate-800/70 bg-slate-900/75 p-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div
                id="recent-sessions"
                className="rounded-xl border border-slate-800/70 bg-slate-900/75 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Recent Sessions
                  </h2>
                  <button className="text-xs text-indigo-300 transition hover:text-indigo-200">
                    All sessions
                  </button>
                </div>

                {deleteError ? (
                  <p className="mb-2 text-xs text-red-300">{deleteError}</p>
                ) : null}

                <div className="overflow-hidden rounded-lg border border-slate-800/70">
                  <div className="grid grid-cols-[2.1fr_0.9fr_0.9fr_0.9fr_0.9fr] bg-slate-900/95 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    <p>Project / Session Name</p>
                    <p>Activity</p>
                    <p>Collaborators</p>
                    <p>Status</p>
                    <p>Actions</p>
                  </div>

                  <div className="divide-y divide-slate-800/70">
                    {sessionList.length === 0 ? (
                      <div className="px-3 py-8 text-sm text-slate-400">
                        No previous sessions yet. Create your first review
                        session.
                      </div>
                    ) : null}
                    {sessionList.map((session, index) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.35,
                          delay: 0.12 + index * 0.07,
                          ease: "easeOut",
                        }}
                        className="grid grid-cols-[2.1fr_0.9fr_0.9fr_0.9fr_0.9fr] items-center bg-slate-950/40 px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-100">
                            {session.id.startsWith("demo-") ? (
                              session.title
                            ) : (
                              <Link
                                className="hover:text-indigo-300"
                                href={`/session/${session.id}`}
                              >
                                {session.title}
                              </Link>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {session.subtitle}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {session.activity}
                        </p>
                        <p className="text-xs text-slate-300">
                          {session.collaborators}
                        </p>
                        <div>
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${statusClassName[session.status]}`}
                          >
                            {session.status}
                          </span>
                        </div>
                        <div className="flex justify-end">
                          {session.id.startsWith("demo-") ? null : (
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteSession(session.id)
                              }
                              disabled={deletingSessionId === session.id}
                              className="inline-flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingSessionId === session.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800/70 bg-slate-900/75 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    System Health
                  </h3>
                  <div className="mt-4 space-y-4">
                    <HealthBar
                      label="Review Velocity"
                      value={85}
                      color="bg-indigo-300"
                    />
                    <HealthBar
                      label="Workspace Sync"
                      value={98}
                      color="bg-blue-300"
                    />
                    <HealthBar
                      label="CI/CD Pipeline"
                      value={45}
                      color="bg-fuchsia-300"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/70 bg-linear-to-br from-indigo-950/35 via-slate-900/75 to-slate-900/90 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      AI Workspace Insight
                    </h3>
                    <Sparkles className="h-4 w-4 text-indigo-300" />
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    You are most productive during deep-work hours (10:00 AM -
                    1:00 PM). Optimize your schedule for these peaks.
                  </p>
                  <button className="mt-4 text-sm font-medium text-indigo-300 transition hover:text-indigo-200">
                    Smart Scheduling
                  </button>
                </div>
              </div>
            </section>
          </motion.div>
        </section>
      </div>

      <motion.button
        onClick={() => setIsSetupOpen(true)}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.45, ease: "easeOut" }}
        className="fixed bottom-5 right-5 rounded-xl bg-indigo-400/90 p-3 text-slate-950 shadow-[0_12px_28px_rgba(99,102,241,0.45)] transition hover:bg-indigo-300 lg:hidden"
        aria-label="Create New Review Session"
      >
        <Plus className="h-5 w-5" />
      </motion.button>

      {isSetupOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-indigo-300/80">
                  Create Review Session
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-100">
                  Session Setup
                </h2>
              </div>
              <button
                onClick={() => setIsSetupOpen(false)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
                aria-label="Close session setup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Session Name
                </label>
                <input
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/60 focus:outline-none"
                  placeholder="auth-middleware-review"
                />
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-300">Language</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {languageOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 hover:border-indigo-400/50"
                    >
                      <input
                        type="radio"
                        name="language"
                        checked={language === option.value}
                        onChange={() => setLanguage(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-300">Start With</p>
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="radio"
                      checked={startMode === "blank"}
                      onChange={() => setStartMode("blank")}
                    />
                    Blank Editor
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="radio"
                      checked={startMode === "paste"}
                      onChange={() => setStartMode("paste")}
                    />
                    Paste Code
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="radio"
                      checked={startMode === "import"}
                      onChange={() => setStartMode("import")}
                    />
                    Import GitHub Repo
                  </label>
                </div>
              </div>

              {startMode === "paste" ? (
                <div>
                  <label className="mb-1 block text-sm text-slate-300">
                    Paste Code
                  </label>
                  <textarea
                    value={pastedCode}
                    onChange={(event) => setPastedCode(event.target.value)}
                    rows={7}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/60 focus:outline-none"
                    placeholder="Paste initial code here..."
                  />
                </div>
              ) : null}

              {startMode === "import" ? (
                <div>
                  <label className="mb-1 block text-sm text-slate-300">
                    GitHub Repo URL (optional)
                  </label>
                  <input
                    value={githubRepo}
                    onChange={(event) => setGithubRepo(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/60 focus:outline-none"
                    placeholder="https://github.com/owner/repo"
                  />
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-300">{error}</p> : null}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsSetupOpen(false)}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isCreating}
                  onClick={() => void createSession()}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isCreating ? "Creating..." : "Create Session"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </main>
  );
}

interface HealthBarProps {
  label: string;
  value: number;
  color: string;
}

function HealthBar({ label, value, color }: HealthBarProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
