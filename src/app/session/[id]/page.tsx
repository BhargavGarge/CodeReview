import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CollabEditor } from "@/components/session/collab-editor";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

interface FileItem {
  id: string;
  file_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .select(
      "id, owner_id, title, language, code, is_active, invite_token, github_repo_url",
    )
    .eq("id", id)
    .single();

  if (error || !session) {
    notFound();
  }

  // Fetch all files for this session
  const { data: files } = await supabase
    .from("session_files")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const collaboratorIds = Array.from(new Set([session.owner_id, user.id]));
  const inviteBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const inviteLink = `${inviteBaseUrl}/invite/${session.invite_token}`;

  const collaboratorNames =
    collaboratorIds.length > 0
      ? ((
          await supabase
            .from("profiles")
            .select("id, name")
            .in("id", collaboratorIds)
        ).data?.map((profile) => profile.name ?? "Anonymous") ?? [])
      : [];

  return (
    <CollabEditor
      sessionId={session.id}
      title={session.title}
      initialCode={session.code}
      initialFiles={(files as FileItem[]) || []}
      language={session.language}
      userName={currentProfile?.name ?? user.email?.split("@")[0] ?? "You"}
      ownerId={session.owner_id}
      currentUserId={user.id}
      githubRepoUrl={session.github_repo_url}
      collaboratorNames={collaboratorNames}
      inviteLink={inviteLink}
    />
  );
}
