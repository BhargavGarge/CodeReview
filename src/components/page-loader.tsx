"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// ── NavigationProgress ───────────────────────────────────────────────────────
// Thin indigo bar that fires the instant a link/button triggers navigation.
// Uses a click-capture listener so it starts BEFORE the route changes,
// then completes once usePathname reports the new path.

export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const widthRef = useRef(0);
  const [width, setWidth] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  // Start the bar on any click that will cause navigation
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a, button");
      if (!target) return;

      // Only fire for same-origin <a> links (not external, not #hash-only)
      if (target.tagName === "A") {
        const href = (target as HTMLAnchorElement).href;
        if (!href || href.startsWith("#") || new URL(href).origin !== location.origin) return;
        if ((target as HTMLAnchorElement).target === "_blank") return;
      }

      clearTimers();
      widthRef.current = 0;
      setWidth(0);
      setState("loading");

      // Ramp to 80% quickly, then stall — completion fires on pathname change
      timers.current.push(setTimeout(() => { widthRef.current = 30; setWidth(30); }, 50));
      timers.current.push(setTimeout(() => { widthRef.current = 60; setWidth(60); }, 200));
      timers.current.push(setTimeout(() => { widthRef.current = 80; setWidth(80); }, 500));
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Complete when the route has actually changed
  useEffect(() => {
    if (state !== "loading") return;
    clearTimers();
    setWidth(100);
    timers.current.push(
      setTimeout(() => {
        setState("done");
        timers.current.push(setTimeout(() => setState("idle"), 150));
      }, 250),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (state === "idle") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[9999] h-[2px] origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400"
      style={{
        width: `${width}%`,
        opacity: state === "done" ? 0 : 1,
        transition:
          state === "done"
            ? "opacity 150ms ease, width 250ms ease"
            : width < 30
              ? "width 50ms ease"
              : "width 400ms cubic-bezier(0.4,0,0.2,1)",
      }}
    />
  );
}

// ── PageLoader ───────────────────────────────────────────────────────────────
// Full-screen skeleton used as the loading.tsx fallback in each route segment.

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#010101]">
      {/* Animated rings */}
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-indigo-500 opacity-20" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-indigo-500/30">
          <svg
            className="h-7 w-7 animate-spin text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-[var(--font-manrope)] text-sm font-semibold tracking-widest text-white/80">
          CODEREVIEW<span className="text-indigo-400">.LIVE</span>
        </span>
        {label && (
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/30">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
