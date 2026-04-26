"use client";

import React from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Engineering Lead",
    company: "TechCorp",
    avatar: "SC",
    quote:
      "CodeReview.live cut our review time in half. The AI suggestions caught bugs we usually miss in manual reviews.",
    rating: 5,
  },
  {
    name: "Alex Rodriguez",
    role: "Full-stack Developer",
    company: "StartupXYZ",
    avatar: "AR",
    quote:
      "Finally a tool built for developers by developers. The real-time collaboration feature is game-changing.",
    rating: 5,
  },
  {
    name: "Jordan Smith",
    role: "CTO",
    company: "FinanceFlow",
    avatar: "JS",
    quote:
      "The GitHub integration is seamless. Our PRs are reviewed faster without leaving GitHub. Absolutely love it.",
    rating: 5,
  },
  {
    name: "Maya Patel",
    role: "Backend Engineer",
    company: "CloudScale",
    avatar: "MP",
    quote:
      "Code quality improved significantly. Team productivity is up, and onboarding new devs became easier.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="section-padding relative">
      {/* Background effects */}
      <div className="blur-glow w-96 h-96 right-1/3 -top-48 bg-pink-600"></div>

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
            Loved by <span className="gradient-text">Developers</span>
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            See what teams are saying about CodeReview.live
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="p-6 md:p-8 rounded-2xl glass hover:glass-dark transition-all duration-300 group"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.1 * (i + 1) }}
                  >
                    <Star
                      size={18}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Quote */}
              <p className="text-white/80 text-lg leading-relaxed mb-6 italic">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold"
                >
                  {testimonial.avatar}
                </motion.div>
                <div>
                  <h4 className="font-semibold text-white">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-white/60">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
