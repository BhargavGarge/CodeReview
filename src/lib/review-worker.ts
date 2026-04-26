import { Worker, type Job } from "bullmq";
import Groq from "groq-sdk";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  redisConnection,
  REVIEW_QUEUE_NAME,
  type ReviewJobData,
  type ReviewJobResult,
  buildPrompt,
  parseComments,
  computeSummary,
  JSON_DELIMITER,
  MODEL_ID,
  tokenKey,
} from "./review-queue";

let workerInstance: Worker<ReviewJobData, ReviewJobResult> | null = null;

async function processReview(
  job: Job<ReviewJobData>,
): Promise<ReviewJobResult> {
  const { sessionId, userId, code, language } = job.data;

  await job.updateProgress({ phase: "analyzing", pct: 5 });

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

  const groqStream = await groq.chat.completions.create({
    model: MODEL_ID,
    messages: [{ role: "user", content: buildPrompt(language, code, job.data.priorComments) }],
    temperature: 0.3,
    max_tokens: 2048,
    stream: true,
  });

  let fullText = "";
  let pastDelimiter = false;
  let streamTextLength = 0;
  const key = tokenKey(job.id!);

  for await (const chunk of groqStream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (!token) continue;

    fullText += token;

    if (!pastDelimiter) {
      const delimIdx = fullText.indexOf(JSON_DELIMITER);
      if (delimIdx !== -1) {
        pastDelimiter = true;
        const beforeDelim = fullText.slice(0, delimIdx).trimEnd();
        const unsentPart = beforeDelim.slice(streamTextLength);
        if (unsentPart) {
          await redisConnection.rpush(key, unsentPart);
          streamTextLength += unsentPart.length;
        }
      } else {
        await redisConnection.rpush(key, token);
        streamTextLength += token.length;
      }
    }
  }

  await job.updateProgress({ phase: "parsing", pct: 80 });

  const comments = parseComments(fullText);
  const delimIdx = fullText.indexOf(JSON_DELIMITER);
  const streamText =
    delimIdx !== -1 ? fullText.slice(0, delimIdx).trimEnd() : fullText;

  await job.updateProgress({ phase: "saving", pct: 90 });

  let reviewId: string | null = null;
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        serviceRoleKey,
      );

      const { data: reviewData } = await admin
        .from("ai_reviews")
        .insert({
          session_id: sessionId,
          requested_by: userId,
          code_snapshot: code,
          status: "completed",
          model_used: MODEL_ID,
        })
        .select("id")
        .single();

      reviewId = reviewData?.id ?? null;

      if (reviewId && comments.length > 0) {
        await admin.from("review_comments").insert(
          comments.map((c) => ({
            review_id: reviewId,
            line_start: c.line_start,
            line_end: c.line_end,
            severity: c.severity,
            category: c.category,
            message: c.message,
            suggestion: c.suggestion ?? null,
          })),
        );
      }

      await admin.from("usage_logs").insert({
        user_id: userId,
        action: "ai_review",
        session_id: sessionId,
        review_id: reviewId,
        billing_period: new Date().toISOString().slice(0, 7),
      });
    }
  } catch (err) {
    console.error("[review-worker] DB save failed:", err);
  }

  await job.updateProgress({ phase: "done", pct: 100 });

  // Clean up token buffer after 5 minutes
  setTimeout(() => void redisConnection.del(key), 300_000);

  return { reviewId, comments, streamText, summary: computeSummary(comments) };
}

export function initReviewWorker(): Worker<ReviewJobData, ReviewJobResult> {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker<ReviewJobData, ReviewJobResult>(
    REVIEW_QUEUE_NAME,
    processReview,
    { connection: redisConnection, concurrency: 2 },
  );

  workerInstance.on("failed", (job, err) => {
    console.error(`[review-worker] job ${job?.id} failed:`, err.message);
  });

  console.log("[review-worker] started (concurrency=2)");
  return workerInstance;
}
