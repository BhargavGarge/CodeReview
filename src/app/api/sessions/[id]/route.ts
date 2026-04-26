import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface Params {
  params: Promise<{ id: string }>;
}

interface UpdateSessionBody {
  code?: string;
  title?: string;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin client bypasses RLS entirely. This is required because collaborators
// (non-owners) need to save code changes, but RLS only permits the owner to
// UPDATE their own session rows. We verify identity ourselves above before
// calling this, so bypassing RLS here is safe.
// ─────────────────────────────────────────────────────────────────────────────
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Add it to your .env.local file. " +
        "You can find it in your Supabase project → Settings → API → service_role key.",
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .select(
      "id, owner_id, title, description, language, code, is_active, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  // ── 1. Authenticate the caller ────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Verify the session exists and check ownership ──────────────────────
  // Use the authenticated client for the SELECT so RLS still gates visibility.
  const { data: sessionAccess } = await supabase
    .from("sessions")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!sessionAccess) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const isOwner = sessionAccess.owner_id === user.id;

  // ── 3. Build the update payload ───────────────────────────────────────────
  const body = (await request.json().catch(() => ({}))) as UpdateSessionBody;
  const updates: {
    code?: string;
    title?: string;
    is_active?: boolean;
  } = {};

  // Any verified session member (owner OR collaborator) may save code.
  if (typeof body.code === "string") {
    updates.code = body.code;
  }

  // Only the owner may change metadata.
  if (isOwner) {
    if (typeof body.title === "string") {
      updates.title = body.title.trim() || "Untitled Session";
    }
    if (typeof body.is_active === "boolean") {
      updates.is_active = body.is_active;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  // ── 4. Persist using the admin client (bypasses RLS) ─────────────────────
  // Identity has already been verified in steps 1–2. The admin client is used
  // here specifically because RLS blocks collaborator (non-owner) UPDATE
  // operations, but we have confirmed above that the caller is a legitimate
  // session member.
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Server misconfiguration";
    console.error("[PATCH /api/sessions/[id]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: session, error } = await adminClient
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    console.error("[PATCH /api/sessions/[id]] Supabase error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update session" },
      { status: 500 },
    );
  }

  return NextResponse.json({ session });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  // ── 1. Authenticate the caller ────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Verify the session exists and that the caller is the owner ────────
  const { data: sessionAccess } = await supabase
    .from("sessions")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!sessionAccess) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (sessionAccess.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the session owner can delete this session." },
      { status: 403 },
    );
  }

  // ── 3. Perform the delete via admin client (bypasses RLS) ────────────────
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Server misconfiguration";
    console.error("[DELETE /api/sessions/[id]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { error } = await adminClient.from("sessions").delete().eq("id", id);

  if (error) {
    console.error("[DELETE /api/sessions/[id]] Supabase error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete session" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
