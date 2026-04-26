"use client";

import React from "react";
import { motion } from "motion/react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";

const logos = [
  {
    name: "OpenAI",
    url: "https://html.tailus.io/blocks/customers/openai.svg",
  },
  {
    name: "Nvidia",
    url: "https://html.tailus.io/blocks/customers/nvidia.svg",
  },
  {
    name: "GitHub",
    url: "https://html.tailus.io/blocks/customers/github.svg",
  },
  {
    name: "Stripe",
    url: "https://html.tailus.io/blocks/customers/stripe.svg",
  },
  {
    name: "Meta",
    url: "https://html.tailus.io/blocks/customers/meta.svg",
  },
  {
    name: "Google",
    url: "https://html.tailus.io/blocks/customers/google.svg",
  },
];

export function LogoCloud() {
  return (
    <section className="relative py-12 md:py-20 bg-black/40 backdrop-blur-sm border-t border-white/5">
      <div className="container-custom mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Text Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex-shrink-0 md:min-w-fit"
          >
            <p className="text-lg font-semibold text-white/80">
              Trusted by leading teams
            </p>
          </motion.div>

          {/* Divider */}
          <div className="hidden md:block w-px h-12 bg-gradient-to-b from-white/0 via-white/20 to-white/0"></div>

          {/* Logo Slider */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex-grow w-full overflow-hidden"
          >
            <InfiniteSlider duration={30}>
              {logos.map((logo) => (
                <div
                  key={logo.name}
                  className="flex items-center justify-center h-12"
                >
                  <img
                    src={logo.url}
                    alt={logo.name}
                    className="h-8 w-auto brightness-0 invert opacity-60 hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </InfiniteSlider>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
