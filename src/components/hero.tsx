"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHLSVideo } from "@/hooks/use-hls-video";

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useHLSVideo(
    videoRef,
    "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/697945ca6b876878dba3b23fbd2f1561/manifest/video.m3u8",
    "/_videos/v1/f0c78f536d5f21a047fb7792723a36f9d647daa1",
  );

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 md:pt-32">
      {/* Animated background glows */}
      <div className="blur-glow w-96 h-96 left-10 top-20 bg-purple-600"></div>
      <div className="blur-glow w-96 h-96 right-10 bottom-32 bg-pink-600"></div>

      <div className="container-custom relative z-20 mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Announcement Pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-8 px-4 py-2 rounded-full bg-[rgba(28,27,36,0.15)] border border-white/10 backdrop-blur"
          >
            <div className="gradient-primary p-1.5 rounded-full">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-sm md:text-base text-white/70">
              Used by founders. Loved by devs.
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="block">
              <motion.span
                className="gradient-text inline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Real-Time AI Code Reviews
              </motion.span>
            </span>
            <span className="block text-white/90">With Your Team</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Collaborate in a shared editor while AI reviews your code
            line-by-line instantly. Get instant feedback, improve quality, and
            ship faster.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Button
              variant="primary"
              size="lg"
              className="flex items-center gap-2 group"
            >
              Start Reviewing Code
              <motion.span
                animate={{ x: [0, 4] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <ArrowRight size={20} />
              </motion.span>
            </Button>

            <Button variant="secondary" size="lg">
              View Live Demo
            </Button>
          </motion.div>

          {/* Video Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative -mt-32 md:-mt-48 z-10 mx-auto max-w-5xl"
          >
            {/* Video wrapper with glass effect */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 glass-dark shadow-2xl">
              {/* Gradient overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-fade"></div>

              {/* Video element */}
              <video
                ref={videoRef}
                className="w-full h-auto rounded-2xl mix-blend-screen"
                loop
                autoPlay
                muted
                playsInline
              />
            </div>

            {/* Decorative glow under video */}
            <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-gradient-to-r from-[#FA93FA] via-[#C967E8] to-[#983AD6] rounded-full"></div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#010101] pointer-events-none z-5"></div>
    </section>
  );
}
