"use client";

import React from "react";
import { motion } from "motion/react";
import { Upload, Users, Zap } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "01",
    title: "Paste or Import Code",
    description:
      "Paste your code snippet directly or import from GitHub. Create a new review session in seconds.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users,
    number: "02",
    title: "Invite Your Team",
    description:
      "Share a unique link with teammates or clients. No sign-up required - start reviewing instantly.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Zap,
    number: "03",
    title: "Get AI Feedback",
    description:
      "Our AI analyzes your code and provides instant, actionable feedback on every line.",
    color: "from-orange-500 to-yellow-500",
  },
];

export function HowItWorks() {
  return (
    <section className="section-padding relative">
      {/* Background effects */}
      <div className="blur-glow w-96 h-96 left-1/3 -bottom-48 bg-cyan-600"></div>

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">How It Works</span>
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Three simple steps to transform your code review process.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
          {/* Connection lines (hidden on mobile) */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20"></div>

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Step Card */}
              <div className="relative h-full">
                {/* Number badge */}
                <div className="mb-6 relative">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} text-white font-bold text-2xl shadow-lg relative z-10`}
                  >
                    {step.number}
                  </motion.div>
                </div>

                {/* Icon */}
                <div className="mb-6 text-4xl opacity-50">
                  <step.icon size={40} className="text-white/40" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-white/70 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow for desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-6 top-24 text-white/20">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M12 5l7 7 -7 7" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-white/70 mb-6">
            Ready to revolutionize your code review process?
          </p>
          <button className="btn-primary">
            Start Your Free Review Session
          </button>
        </motion.div>
      </div>
    </section>
  );
}
