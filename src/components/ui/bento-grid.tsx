"use client";

import React from "react";
import { CheckCircle, Globe, TrendingUp, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
}

export type BentoItems = BentoItem[];

interface BentoGridProps {
  items?: BentoItem[];
}

const defaultItems: BentoItem[] = [
  {
    title: "Analytics Dashboard",
    meta: "v2.4.1",
    description:
      "Real-time metrics with AI-powered insights and predictive analytics",
    icon: <TrendingUp className="h-4 w-4 text-blue-500" />,
    status: "Live",
    tags: ["Statistics", "Reports", "AI"],
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: "Task Manager",
    meta: "84 completed",
    description: "Automated workflow management with priority scheduling",
    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    status: "Updated",
    tags: ["Productivity", "Automation"],
  },
  {
    title: "Media Library",
    meta: "12GB used",
    description: "Cloud storage with intelligent content processing",
    icon: <Video className="h-4 w-4 text-purple-500" />,
    tags: ["Storage", "CDN"],
    colSpan: 2,
  },
  {
    title: "Global Network",
    meta: "6 regions",
    description: "Multi-region deployment with edge computing",
    icon: <Globe className="h-4 w-4 text-sky-500" />,
    status: "Beta",
    tags: ["Infrastructure", "Edge"],
  },
];

function getSpanClass(colSpan?: number) {
  if (colSpan === 2) return "md:col-span-2";
  if (colSpan === 3) return "md:col-span-3";
  return "md:col-span-1";
}

function BentoGrid({ items = defaultItems }: BentoGridProps) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 p-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.title}
          data-bento-card
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300",
            "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)]",
            "dark:hover:shadow-[0_2px_12px_rgba(255,255,255,0.03)]",
            getSpanClass(item.colSpan),
            item.hasPersistentHover
              ? "-translate-y-0.5 border-white/20 bg-white/[0.07] shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
              : "",
          )}
        >
          <div
            className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              item.hasPersistentHover ? "opacity-100" : "",
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:4px_4px]" />
          </div>

          <div className="relative flex h-full flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition-colors duration-300 group-hover:bg-white/15">
                {item.icon}
              </div>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors duration-300 group-hover:bg-white/15">
                {item.status ?? "Active"}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-[15px] font-medium tracking-tight text-white">
                {item.title}
                {item.meta ? (
                  <span className="ml-2 text-xs font-normal text-white/45">
                    {item.meta}
                  </span>
                ) : null}
              </h3>
              <p className="text-sm leading-snug text-white/65">
                {item.description}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 pt-2">
              <div className="flex flex-wrap gap-2 text-xs text-white/45">
                {item.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-white/10 px-2 py-1 transition-colors duration-200 hover:bg-white/15"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-white/50 opacity-0 transition-opacity group-hover:opacity-100">
                {item.cta ?? "Explore →"}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 rounded-2xl p-px bg-gradient-to-br from-transparent via-white/10 to-transparent transition-opacity duration-300",
              item.hasPersistentHover
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          />
        </div>
      ))}
    </div>
  );
}

export { BentoGrid };
