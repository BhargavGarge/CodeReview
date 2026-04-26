import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReplayViewer } from "@/components/session/replay-viewer";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReplayPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify participant access
  const { error: accessError } = await supabase
    .from("session_participants")
    .select("id")
    .eq("session_id", id)
    .eq("user_id", user.id)
    .single();

  if (accessError) redirect("/dashboard");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, language")
    .eq("id", id)
    .single();

  if (!session) redirect("/dashboard");

  return <ReplayViewer sessionId={id} sessionTitle={session.title} language={session.language} />;
}
