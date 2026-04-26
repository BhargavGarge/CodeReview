import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DashboardShell,
  type DashboardSessionItem,
} from "@/components/dashboard/dashboard-shell";

function formatActivity(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(now - created, 0);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const days = Math.floor(diffHours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// Server Component — secure data fetching happens server-side
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        name: user.email?.split("@")[0] ?? null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  }

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const [
    { count: pendingReviews },
    { count: activeSessions },
    { data: recentSessions },
  ] = await Promise.all([
    supabase
      .from("ai_reviews")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", user.id)
      .in("status", ["pending", "processing"]),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("is_active", true),
    supabase
      .from("sessions")
      .select("id, title, language, created_at, is_active")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  // Derive a real collaborator count from session_participants instead of
  // using the previous placeholder values.
  const sessionIds = recentSessions?.map((session) => session.id) ?? [];
  const collaboratorCounts: Record<string, number> = {};

  if (sessionIds.length > 0) {
    const { data: participants } = await supabase
      .from("session_participants")
      .select("session_id, user_id")
      .in("session_id", sessionIds);

    if (participants) {
      for (const row of participants as {
        session_id: string;
        user_id: string;
      }[]) {
        collaboratorCounts[row.session_id] =
          (collaboratorCounts[row.session_id] ?? 0) + 1;
      }
    }
  }

  const sessions: DashboardSessionItem[] =
    recentSessions?.map((session, index) => ({
      id: session.id,
      title: session.title,
      subtitle: `${session.language} session`,
      activity: formatActivity(session.created_at),
      // Count the owner (always 1) plus any additional participants.
      collaborators: 1 + (collaboratorCounts[session.id] ?? 0),
      status: session.is_active
        ? index === 1
          ? "Action Required"
          : "In Review"
        : "Archived",
    })) ?? [];

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "there";

  return (
    <DashboardShell
      userId={user.id}
      displayName={displayName}
      stats={[
        { label: "Total Reviews", value: pendingReviews ?? 0 },
        { label: "Active Sessions", value: activeSessions ?? 0 },
      ]}
      sessions={sessions}
    />
  );
}
