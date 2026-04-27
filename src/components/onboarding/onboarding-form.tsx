"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ExperienceLevel } from "@/types/database";
import { ArrowRight, Check } from "lucide-react";

interface FormData {
  name: string;
  role: string;
  experience_level: ExperienceLevel | "";
}

const ROLES = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full-Stack Engineer",
  "DevOps / Platform",
  "Engineering Manager",
  "Other",
];

const EXPERIENCE_LEVELS: {
  value: ExperienceLevel;
  label: string;
  description: string;
}[] = [
  { value: "junior", label: "Junior", description: "0–2 years" },
  { value: "mid", label: "Mid-level", description: "2–5 years" },
  { value: "senior", label: "Senior", description: "5–10 years" },
  { value: "lead", label: "Lead / Staff", description: "10+ years" },
];

export function OnboardingForm({ userId: _userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    role: "",
    experience_level: "",
  });

  // Destination after onboarding completes.
  // Preserve ?next= so invite links redirect correctly after onboarding.
function getNextTarget() {
  const next = searchParams?.get("next");
  return next && next.startsWith("/") ? next : "/dashboard";
}

function getSubmitLabel() {
  const next = searchParams?.get("next");

  if (next?.startsWith("/invite/")) return "Join Session";
  if (next?.startsWith("/session/")) return "Go to Session";

  return "Go to Dashboard";
}

  function advance() {
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  }

  async function handleSubmit() {
    if (!form.name || !form.role || !form.experience_level) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          role: form.role,
          experience_level: form.experience_level,
        }),
      });

      const payload = (await res.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !payload.success) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      // Hard-navigate so the server re-reads the updated profile cookie.
      window.location.assign(getNextTarget());
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Progress bar */}
      <div className="mb-10 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              s <= step ? "bg-[#7b39fc]" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Step 1 — Name */}
      {step === 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-[#7b39fc]">Step 1 of 3</p>
          <h2 className="mb-2 text-2xl font-semibold text-white">
            What should we call you?
          </h2>
          <p className="mb-8 text-sm text-white/50">
            This is how you&apos;ll appear to teammates.
          </p>

          <input
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) =>
              e.key === "Enter" && form.name.trim() && advance()
            }
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#7b39fc]"
          />

          <button
            type="button"
            disabled={!form.name.trim()}
            onClick={advance}
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#7b39fc] px-6 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:bg-[#8b4bff]"
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2 — Role */}
      {step === 2 && (
        <div>
          <p className="mb-2 text-sm font-medium text-[#7b39fc]">Step 2 of 3</p>
          <h2 className="mb-2 text-2xl font-semibold text-white">
            What&apos;s your role?
          </h2>
          <p className="mb-8 text-sm text-white/50">
            We&apos;ll tailor AI feedback to match your work.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role }))}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                  form.role === role
                    ? "border-[#7b39fc] bg-[#7b39fc]/15 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!form.role}
            onClick={advance}
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#7b39fc] px-6 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:bg-[#8b4bff]"
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 3 — Experience */}
      {step === 3 && (
        <div>
          <p className="mb-2 text-sm font-medium text-[#7b39fc]">Step 3 of 3</p>
          <h2 className="mb-2 text-2xl font-semibold text-white">
            Experience level?
          </h2>
          <p className="mb-8 text-sm text-white/50">
            This helps calibrate how detailed AI feedback gets.
          </p>

          <div className="flex flex-col gap-3">
            {EXPERIENCE_LEVELS.map(({ value, label, description }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, experience_level: value }))
                }
                className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors ${
                  form.experience_level === value
                    ? "border-[#7b39fc] bg-[#7b39fc]/15"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-white/40">{description}</p>
                </div>
                {form.experience_level === value && (
                  <Check size={16} className="text-[#7b39fc]" />
                )}
              </button>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <button
            type="button"
            disabled={!form.experience_level || submitting}
            onClick={() => void handleSubmit()}
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#7b39fc] px-6 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:bg-[#8b4bff]"
          >
            {submitting ? "Setting up..." : getSubmitLabel()}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
