import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database, ExperienceLevel } from "@/types/database";

interface CompleteOnboardingBody {
  name: string;
  role: string;
  experience_level: ExperienceLevel;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request
    .json()
    .catch(() => ({}))) as Partial<CompleteOnboardingBody>;
  const { name, role, experience_level } = body;

  if (!name?.trim() || !role || !experience_level) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const patch = {
    id: user.id,
    name: name.trim(),
    role,
    experience_level,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  // Try with the user's own session first (respects RLS — works when profile row exists)
  const { error: updateError } = await supabase
    .from("profiles")
    .upsert(patch, { onConflict: "id" });

  if (!updateError) {
    return NextResponse.json({ success: true });
  }

  // If a service-role key is available, fall back to an admin client that
  // bypasses RLS. This is primarily useful in hosted environments.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey) {
    const admin = createSupabaseClient<Database>(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: adminError } = await admin
      .from("profiles")
      .upsert(patch, { onConflict: "id" });

    if (!adminError) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }

  // No service-role key and the authenticated upsert failed – surface the
  // underlying error so the UI can show a helpful message instead of
  // silently pretending success (which would cause onboarding loops).
  return NextResponse.json(
    { error: updateError.message ?? "Failed to save onboarding details" },
    { status: 500 },
  );
}
