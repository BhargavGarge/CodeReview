import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// This route is the OAuth redirect target configured in Supabase dashboard.
// Supabase appends ?code=... after the user authenticates with GitHub/Google.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", origin));
  }

  // Check if this user has completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) {
    return NextResponse.redirect(
      new URL(`/onboarding?next=${encodeURIComponent(next)}`, origin),
    );
  }

  return NextResponse.redirect(new URL(next, origin));
}
