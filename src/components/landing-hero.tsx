"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { motion } from "motion/react";

const navigationItems = [
  { label: "Home", href: "#home" },
  { label: "Product", href: "#product", hasChevron: true },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

const logoPath =
  "M1.04356 6.35771L13.6437 0.666504L26.2438 6.35771V20.0443L13.6437 25.7355L1.04356 20.0443V6.35771Z";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header className="relative z-20 w-full px-6 py-4 md:px-30">
        <nav className="flex items-center justify-between gap-6">
          <a
            href="#home"
            aria-label="CodeReview.live home"
            className="flex items-center gap-3"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
            >
              <path d={logoPath} fill="#FFFFFF" />
            </svg>
            <span
              className="hidden text-[14px] font-semibold tracking-[0.08em] text-white/90 sm:inline-flex"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              CODE REVIEW
            </span>
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-1 text-[14px] font-medium text-white transition-opacity hover:opacity-80"
                style={{ fontFamily: "var(--font-manrope)" }}
              >
                {item.label}
                {item.hasChevron ? <ChevronDown size={16} /> : null}
              </a>
            ))}
          </div>

          <div
            className="hidden items-center gap-3 lg:flex"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            <a
              href="/login"
              className="rounded-lg border border-[#d4d4d4] bg-white px-4 py-2 text-[14px] font-semibold text-[#171717] transition-transform hover:-translate-y-0.5"
            >
              Sign In
            </a>
            <a
              href="/login?mode=signup"
              className="rounded-lg bg-[#7b39fc] px-4 py-2 text-[14px] font-semibold text-[#fafafa] shadow-[0_10px_30px_rgba(123,57,252,0.35)] transition-transform hover:-translate-y-0.5"
            >
              Get Started
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center text-white lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={26} />
          </button>
        </nav>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-black px-6 py-5 text-white lg:hidden">
          <div className="flex items-center justify-between">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
            >
              <path d={logoPath} fill="#FFFFFF" />
            </svg>
            <span
              className="text-[14px] font-semibold tracking-[0.08em] text-white/90"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              CODE REVIEW
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={28} />
            </button>
          </div>

          <div
            className="mt-16 flex flex-col gap-6 text-3xl font-medium"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div
            className="mt-12 flex flex-col gap-4"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            <a
              href="/login"
              className="rounded-lg border border-white/20 bg-white px-4 py-3 text-center text-base font-semibold text-black"
              onClick={() => setMenuOpen(false)}
            >
              Sign In
            </a>
            <a
              href="/login?mode=signup"
              className="rounded-lg bg-[#7b39fc] px-4 py-3 text-center text-base font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function LandingHero() {
  const [heroVideoSrc, setHeroVideoSrc] = useState(
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4",
  );

  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden bg-[#010101] text-white"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src={heroVideoSrc}
        onError={() => {
          if (heroVideoSrc !== "/warp_stream_remix.mp4") {
            setHeroVideoSrc("/warp_stream_remix.mp4");
          }
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-black/35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(43,35,68,0.45)_0%,rgba(1,1,1,0.15)_60%)]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-96 w-96 rounded-full bg-[#7b39fc]/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-112 w-md rounded-full bg-[#c967e8]/18 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(250,147,250,0.05),rgba(1,1,1,0)_38%,rgba(152,58,214,0.08))]" />

      <div className="relative z-20 flex min-h-screen flex-col">
        <Navbar />

        <div className="relative z-20 flex flex-1 items-center justify-center px-6 pb-16 pt-32 text-center md:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-7 inline-flex h-9.5 items-center gap-3 rounded-[10px] border border-[rgba(164,132,215,0.5)] bg-[rgba(85,80,110,0.4)] px-3 backdrop-blur-md"
            >
              <span
                className="inline-flex h-5.5 items-center rounded-md bg-[#7b39fc] px-2.5 text-[14px] font-medium text-white"
                style={{ fontFamily: "var(--font-cabin)" }}
              >
                Live
              </span>
              <span
                className="text-[14px] font-medium text-white/80"
                style={{ fontFamily: "var(--font-cabin)" }}
              >
                AI-powered collaboration for modern code reviews
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
              className="max-w-5xl text-[48px] leading-[1.1] tracking-[-0.04em] text-white md:text-[72px] lg:text-[96px]"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              <span className="block">Real-Time AI Code Reviews</span>
              <span className="block">With Your Team</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.12 }}
              className="mt-7 max-w-165.5 text-[18px] font-normal leading-8 text-white/70"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Collaborate in a shared editor while AI reviews your code
              line-by-line instantly. Ship faster with precise feedback,
              threaded comments, and seamless team collaboration.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.18 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
            >
              <a
                href="/login?mode=signup"
                className="inline-flex items-center gap-3 rounded-[10px] bg-[#7b39fc] px-6 py-4 text-[16px] font-medium text-white transition-colors hover:bg-[#8b4bff]"
                style={{ fontFamily: "var(--font-cabin)" }}
              >
                Start Reviewing Code
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white shadow-[0_0_24px_rgba(197,103,232,0.45)]"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #fa93fa 0%, #c967e8 55%, #983ad6 100%)",
                  }}
                >
                  <ArrowUpRight size={18} />
                </span>
              </a>
              <a
                href="#start"
                className="rounded-[10px] bg-[#2b2344] px-6 py-4 text-[16px] font-medium text-[#f6f7f9] transition-colors hover:bg-[#3b3160]"
                style={{ fontFamily: "var(--font-cabin)" }}
              >
                View Live Demo
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
