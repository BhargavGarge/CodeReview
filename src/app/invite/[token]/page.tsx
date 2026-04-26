import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const inviteToken = token.trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated — bounce to login, preserving the invite URL as `next`
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}`);
  }

  // Check onboarding — new users must complete it before joining
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect(
      `/onboarding?next=${encodeURIComponent(`/invite/${inviteToken}`)}`,
    );
  }

  // ── Tier 1: accept_session_invite RPC ──────────────────────────────────────
  // Security-definer function that looks up the session AND inserts the
  // participant row in a single DB round-trip. Works with any RLS config.
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "accept_session_invite",
    { p_invite_token: inviteToken },
  );

  if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
    const row = rpcData[0] as { session_id: string; session_title: string };
    // After accepting the invite, take the collaborator straight into the
    // live session editor rather than dropping them on the dashboard.
    redirect(`/session/${encodeURIComponent(row.session_id)}`);
  }

  // ── Tier 2: get_session_by_invite_token RPC + participant insert ───────────
  // Lighter security-definer function — only resolves token → (id, title).
  // The participant insert uses the user's own client (RLS permits
  // inserting a row where user_id = auth.uid()).
  // Deploy get_session_by_invite_token from supabase/schema.sql if needed.
  const { data: lookupData, error: lookupError } = await supabase.rpc(
    "get_session_by_invite_token",
    { p_invite_token: inviteToken },
  );

  if (!lookupError && Array.isArray(lookupData) && lookupData.length > 0) {
    const row = lookupData[0] as { session_id: string; session_title: string };

    // RLS for session_participants INSERT: `with check (auth.uid() = user_id)`
    // This succeeds as long as we set user_id to the current user.
    await supabase
      .from("session_participants")
      .upsert(
        { session_id: row.session_id, user_id: user.id, role: "viewer" },
        { onConflict: "session_id,user_id" },
      );

    redirect(`/session/${encodeURIComponent(row.session_id)}`);
  }

  // ── Tier 3: service-role (admin) client fallback ───────────────────────────
  // Used when neither DB function is deployed.
  // Requires SUPABASE_SERVICE_ROLE_KEY in your environment.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey) {
    const admin = createSupabaseClient<Database>(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sessionRow } = await admin
      .from("sessions")
      .select("id, title")
      .eq("invite_token", inviteToken)
      .maybeSingle();

    if (sessionRow) {
      await admin
        .from("session_participants")
        .upsert(
          { session_id: sessionRow.id, user_id: user.id, role: "viewer" },
          { onConflict: "session_id,user_id" },
        );

      redirect(`/session/${encodeURIComponent(sessionRow.id)}`);
    }
  }

  // All three tiers failed — token is invalid, the session was deleted, or
  // neither DB function is deployed AND SUPABASE_SERVICE_ROLE_KEY is unset.
  // Run the SQL in supabase/schema.sql to add get_session_by_invite_token.
  redirect("/dashboard?inviteError=1");
}
