import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewQueue, type PriorComment } from "@/lib/review-queue";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Params) {
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
    .select("id, code, language")
    .eq("id", id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  // Fetch the two most recent completed reviews' comments for context-aware AI
  let priorComments: PriorComment[] = [];
  try {
    const { data: recentReviews } = await supabase
      .from("ai_reviews")
      .select("id")
      .eq("session_id", id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(2);

    if (recentReviews && recentReviews.length > 0) {
      const reviewIds = recentReviews.map((r) => r.id);
      const { data: comments } = await supabase
        .from("review_comments")
        .select("line_start, line_end, severity, category, message")
        .in("review_id", reviewIds)
        .limit(30);

      if (comments) priorComments = comments as PriorComment[];
    }
  } catch {
    // Prior context is best-effort; don't fail the review if this errors
  }

  const job = await reviewQueue.add("review", {
    sessionId: session.id,
    userId: user.id,
    code: session.code,
    language: session.language ?? "unknown",
    priorComments: priorComments.length > 0 ? priorComments : undefined,
  });

  const [waiting, active] = await Promise.all([
    reviewQueue.getWaitingCount(),
    reviewQueue.getActiveCount(),
  ]);

  return NextResponse.json({
    jobId: job.id,
    position: waiting + active,
  });
}
