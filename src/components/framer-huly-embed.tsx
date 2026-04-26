"use client";

import { useEffect, useState } from "react";

const FRAMER_MODULE_URL = "https://framer.com/m/Huly-prod-kLiM.js";

type FramerModule = {
  default?: React.ComponentType<Record<string, unknown>>;
};

export function FramerHulyEmbed() {
  const [RemoteComponent, setRemoteComponent] = useState<React.ComponentType<
    Record<string, unknown>
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadFramerModule() {
      try {
        const mod = (await import(
          /* webpackIgnore: true */ FRAMER_MODULE_URL
        )) as FramerModule;

        if (!isActive) return;

        if (mod.default) {
          setRemoteComponent(
            () => mod.default as React.ComponentType<Record<string, unknown>>,
          );
        } else {
          setLoadError(
            "Framer component did not export a default React component.",
          );
        }
      } catch {
        if (isActive) {
          setLoadError("Could not load the Framer module.");
        }
      }
    }

    loadFramerModule();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="relative bg-[#010101] px-6 py-12 md:px-10 md:py-20">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md md:p-6">
        {RemoteComponent ? (
          <RemoteComponent />
        ) : (
          <div className="flex min-h-80 items-center justify-center text-center text-white/70">
            {loadError ?? "Loading Framer experience..."}
          </div>
        )}
      </div>
    </section>
  );
}
