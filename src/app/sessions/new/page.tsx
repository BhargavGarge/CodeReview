"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

export default function NewSessionPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState("");

  const createSession = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Review Session",
          language: "typescript",
          githubRepoUrl: repoUrl || undefined,
        }),
      });

      const payload = (await response.json()) as {
        session?: { id: string };
        error?: string;
      };

      if (!response.ok || !payload.session?.id) {
        throw new Error(payload.error || "Unable to create session");
      }

      router.push(`/session/${payload.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create session");
      setIsCreating(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 text-center backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80">
          Session Launcher
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          Create New Review Session
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          A collaborative Monaco workspace will be created and opened instantly.
        </p>

        <div className="mt-4 space-y-2 text-left text-sm">
          <label className="block text-xs font-medium text-slate-300">
            GitHub repository (optional)
          </label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-indigo-400"
          />
          <p className="text-xs text-slate-500">
            Link a public GitHub repo to give collaborators context while you
            review code.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void createSession()}
          disabled={isCreating}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-300 via-violet-300 to-fuchsia-300 px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_18px_44px_rgba(129,140,248,0.42)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isCreating ? "Creating Session..." : "Create New Review Session"}
        </button>

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
