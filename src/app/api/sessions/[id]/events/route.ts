import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // session_events RLS: readable only by session participants
  const [eventsResult, snapshotsResult, sessionResult] = await Promise.all([
    supabase
      .from("session_events")
      .select("id, event_type, created_at, payload, user_id")
      .eq("session_id", id)
      .order("created_at", { ascending: true })
      .limit(5000),

    supabase
      .from("session_snapshots")
      .select("id, code, saved_by, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true })
      .limit(200),

    supabase
      .from("sessions")
      .select("id, title, language")
      .eq("id", id)
      .single(),
  ]);

  if (sessionResult.error || !sessionResult.data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    session: sessionResult.data,
    events: eventsResult.data ?? [],
    snapshots: snapshotsResult.data ?? [],
  });
}
