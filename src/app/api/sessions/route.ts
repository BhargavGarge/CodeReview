import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SessionLanguage } from "@/types/database";

interface CreateSessionBody {
  title?: string;
  description?: string;
  language?: SessionLanguage;
  code?: string;
  githubRepoUrl?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateSessionBody;
  const title = body.title?.trim() || "Untitled Session";
  const description = body.description?.trim() || null;
  const language: SessionLanguage = body.language || "typescript";
  const code = body.code || "// Start reviewing code together\n";
  let githubRepoUrl = body.githubRepoUrl?.trim() || null;

  // Backwards-compatible fallback: if a GitHub import description was
  // stored previously, derive the URL from it when githubRepoUrl is
  // missing so the new github_repo_url column still gets populated.
  if (!githubRepoUrl && description?.startsWith("GitHub import source:")) {
    const maybeUrl = description.replace("GitHub import source:", "").trim();
    if (maybeUrl) githubRepoUrl = maybeUrl;
  }
  const sessionId = crypto.randomUUID();

  async function insertSession() {
    return supabase.from("sessions").insert({
      id: sessionId,
      owner_id: user!.id,
      title,
      description,
      language,
      code,
      github_repo_url: githubRepoUrl,
    });
  }

  let { error } = await insertSession();

  // If the sessions.owner_id → profiles.id foreign key fails, lazily
  // create the missing profile row then retry once.
  if (
    error &&
    error.code === "23503" &&
    error.message.includes("sessions_owner_id_fkey")
  ) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        name: user.email?.split("@")[0] ?? null,
        onboarding_completed: true,
      },
      { onConflict: "id" },
    );

    ({ error } = await insertSession());
  }

  if (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to create session" },
      { status: 500 },
    );
  }

  await supabase.from("usage_logs").insert({
    user_id: user.id,
    action: "session_created",
    session_id: sessionId,
    billing_period: new Date().toISOString().slice(0, 7),
  });

  return NextResponse.json(
    {
      session: {
        id: sessionId,
        title,
        language,
        github_repo_url: githubRepoUrl,
        created_at: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}
