"use client";

import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute w-96 h-96 bg-purple-600 rounded-full blur-[100px] opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        ></motion.div>
        <motion.div
          className="absolute w-96 h-96 bg-pink-600 rounded-full blur-[100px] opacity-20 right-0 bottom-0"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        ></motion.div>
      </div>

      <div className="container-custom mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Glass background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20"></div>

          {/* Content */}
          <div className="relative z-10 text-center px-6 md:px-12 py-16 md:py-24">
            {/* Icon */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="inline-block mb-6 p-4 rounded-full bg-gradient-to-br from-[#FA93FA] to-[#983AD6] text-white shadow-glow"
            >
              <Zap size={32} />
            </motion.div>

            {/* Headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-white">Ready to</span>{" "}
              <span className="gradient-text">Transform</span>
              <br />
              <span className="text-white">Your Code Reviews?</span>
            </h2>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of developers who are already shipping code faster
              with AI-powered insights and real-time collaboration.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12 py-8 border-y border-white/10">
              {[
                { number: "50K+", label: "Reviews Completed" },
                { number: "98%", label: "Satisfaction Rate" },
                { number: "4.9★", label: "Average Rating" },
                { number: "24/7", label: "Support" },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  viewport={{ once: true }}
                >
                  <div className="text-2xl font-bold text-white mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="primary"
                size="lg"
                className="group w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Start Free Trial
                <motion.span
                  animate={{ x: [0, 4] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  <ArrowRight size={20} />
                </motion.span>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Schedule Demo
              </Button>
            </div>

            {/* Footer text */}
            <p className="text-sm text-white/50 mt-8">
              No credit card required. 14-day free trial for all new users.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
