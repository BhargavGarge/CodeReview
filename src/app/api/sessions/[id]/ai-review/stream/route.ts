import { createClient } from "@/lib/supabase/server";
import { reviewQueue, redisConnection, tokenKey } from "@/lib/review-queue";

interface Params {
  params: Promise<{ id: string }>;
}

const encode = (text: string) => new TextEncoder().encode(text);
const sseEvent = (data: unknown) =>
  encode(`data: ${JSON.stringify(data)}\n\n`);

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

export async function GET(request: Request, { params: _params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return new Response("Missing jobId", { status: 400 });

  const job = await reviewQueue.getJob(jobId);
  if (!job) return new Response("Job not found", { status: 404 });

  const key = tokenKey(jobId);
  let tokenIdx = 0;
  let closed = false;

  const readable = new ReadableStream({
    start(controller) {
      const POLL_MS = 200;
      const TIMEOUT_MS = 120_000;
      let elapsed = 0;

      const tick = async () => {
        if (closed) return;
        elapsed += POLL_MS;

        if (elapsed >= TIMEOUT_MS) {
          controller.enqueue(sseEvent({ error: "Review timed out" }));
          controller.close();
          closed = true;
          return;
        }

        try {
          // Forward new tokens produced by the worker
          const newTokens = await redisConnection.lrange(key, tokenIdx, -1);
          for (const t of newTokens) {
            controller.enqueue(sseEvent({ token: t }));
            tokenIdx++;
          }

          const state = await job.getState();

          if (state === "completed") {
            const result = job.returnvalue;
            controller.enqueue(
              sseEvent({
                done: true,
                reviewId: result.reviewId,
                comments: result.comments,
                summary: result.summary,
              }),
            );
            controller.close();
            closed = true;
            return;
          }

          if (state === "failed") {
            controller.enqueue(sseEvent({ error: "Review job failed" }));
            controller.close();
            closed = true;
            return;
          }

          // Forward progress phase for in-progress jobs
          const progress = job.progress as
            | { phase?: string; pct?: number }
            | number;
          if (typeof progress === "object" && progress.phase) {
            controller.enqueue(sseEvent({ progress }));
          }
        } catch {
          controller.enqueue(sseEvent({ error: "Stream error" }));
          controller.close();
          closed = true;
          return;
        }

        setTimeout(() => void tick(), POLL_MS);
      };

      setTimeout(() => void tick(), POLL_MS);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(readable, { headers: SSE_HEADERS });
}
