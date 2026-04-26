import { Queue } from "bullmq";
import IORedis from "ioredis";

// Single Redis connection shared by queue producer + SSE polling.
// Set REDIS_URL in .env.local (local: redis://localhost:6379 | Upstash: rediss://...)
export const redisConnection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  tls: {}, // 🔥 THIS is important for Upstash
});
redisConnection.on("error", (err: Error) =>
  console.error("[redis:queue]", err.message),
);

export const REVIEW_QUEUE_NAME = "ai-reviews";

export const reviewQueue = new Queue(REVIEW_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100, age: 3600 },
    removeOnFail: { count: 50, age: 3600 },
  },
});

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface PriorComment {
  line_start: number;
  line_end: number;
  severity: "info" | "warning" | "error" | "suggestion";
  category: "security" | "performance" | "style" | "logic" | "best_practice";
  message: string;
}

export interface ReviewJobData {
  sessionId: string;
  userId: string;
  code: string;
  language: string;
  priorComments?: PriorComment[];
}

export interface ReviewComment {
  line_start: number;
  line_end: number;
  severity: "info" | "warning" | "error" | "suggestion";
  category: "security" | "performance" | "style" | "logic" | "best_practice";
  message: string;
  suggestion: string | null;
}

export interface ReviewJobResult {
  reviewId: string | null;
  comments: ReviewComment[];
  streamText: string;
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    suggestions: number;
  };
}

export interface ReviewProgress {
  phase: "analyzing" | "parsing" | "saving" | "done";
  pct: number;
}

// ─── Shared prompt utilities ──────────────────────────────────────────────────

export const JSON_DELIMITER = "---JSON---";
export const MODEL_ID = "llama-3.3-70b-versatile";

export function buildPrompt(
  language: string,
  code: string,
  priorComments?: PriorComment[],
): string {
  const priorContext =
    priorComments && priorComments.length > 0
      ? `\nPrevious review feedback on earlier versions of this code (do not simply repeat — note if issues persist or have been fixed, and surface any new patterns):\n${priorComments
          .map(
            (c) =>
              `  • Line ${c.line_start}: [${c.severity}] [${c.category}] ${c.message}`,
          )
          .join("\n")}\n`
      : "";

  return `You are a senior software engineer performing a code review.

Language: ${language}
${priorContext}
Your response MUST have exactly two sections separated by the delimiter below.

SECTION 1 — Write 2-4 sentences of conversational analysis: summarise the overall code quality, call out the most important issues, and note any strengths. Be direct and specific (mention line numbers or variable names when relevant). If prior feedback was provided, note whether those issues are resolved or still present. Do NOT write any JSON here.

${JSON_DELIMITER}

SECTION 2 — Write a JSON array of every issue you found. Each element must have these exact keys:
- line_start: integer (starting line of the issue)
- line_end: integer (ending line, same as line_start for single-line issues)
- severity: "info" | "warning" | "error" | "suggestion"
- category: "security" | "performance" | "style" | "logic" | "best_practice"
- message: string, max 150 chars
- suggestion: string with a concrete fix, or null

Return ONLY the JSON array in Section 2, no prose. If there are no issues, return [].

Code to review:
\`\`\`${language}
${code}
\`\`\``;
}

export function parseComments(fullText: string): ReviewComment[] {
  const delimIdx = fullText.indexOf(JSON_DELIMITER);
  if (delimIdx === -1) return [];

  const jsonPart = fullText.slice(delimIdx + JSON_DELIMITER.length).trim();
  const stripped = jsonPart
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return (parsed as ReviewComment[]).filter(
    (c) =>
      typeof c.line_start === "number" &&
      typeof c.line_end === "number" &&
      ["info", "warning", "error", "suggestion"].includes(c.severity) &&
      ["security", "performance", "style", "logic", "best_practice"].includes(
        c.category,
      ) &&
      typeof c.message === "string",
  );
}

export function computeSummary(comments: ReviewComment[]) {
  return {
    totalIssues: comments.length,
    errors: comments.filter((c) => c.severity === "error").length,
    warnings: comments.filter((c) => c.severity === "warning").length,
    suggestions: comments.filter((c) => c.severity === "suggestion").length,
  };
}

// Redis key for streaming tokens produced by the worker
export const tokenKey = (jobId: string) => `review:tokens:${jobId}`;
