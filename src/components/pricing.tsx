"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for individuals and small projects",
    features: [
      { name: "Up to 5 reviews/month", included: true },
      { name: "Single user sessions", included: true },
      { name: "Basic AI suggestions", included: true },
      { name: "Syntax highlighting", included: true },
      { name: "Team collaboration", included: false },
      { name: "GitHub integration", included: false },
      { name: "Priority support", included: false },
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$99",
    description: "For professional developers and small teams",
    features: [
      { name: "Unlimited reviews", included: true },
      { name: "Up to 5 team members", included: true },
      { name: "Advanced AI analysis", included: true },
      { name: "All languages supported", included: true },
      { name: "Team collaboration", included: true },
      { name: "GitHub integration", included: true },
      { name: "Email support", included: true },
    ],
    highlighted: true,
  },
  {
    name: "Team",
    price: "Custom",
    description: "For enterprises and large organizations",
    features: [
      { name: "Everything in Pro", included: true },
      { name: "Unlimited team members", included: true },
      { name: "Custom AI models", included: true },
      { name: "API access", included: true },
      { name: "Advanced analytics", included: true },
      { name: "SSO & security", included: true },
      { name: "24/7 phone support", included: true },
    ],
    highlighted: false,
  },
];

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  return (
    <section className="section-padding relative">
      {/* Background effects */}
      <div className="blur-glow w-96 h-96 left-1/4 bottom-0 bg-purple-600"></div>

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, <span className="gradient-text">Transparent</span> Pricing
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
            Choose the perfect plan for your team. All plans include a 14-day
            free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 rounded-full glass">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-black font-semibold"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-full transition-all flex items-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-white text-black font-semibold"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Yearly
              <span className="text-xs bg-gradient-primary px-2 py-1 rounded text-white">
                Save 25%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
          {pricingPlans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? "glass-dark border-2 border-purple-500/50 shadow-2xl scale-100 md:scale-105"
                  : "glass hover:glass-dark border border-white/10"
              }`}
            >
              {/* Featured Badge */}
              {plan.highlighted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                >
                  <span className="px-4 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-[#FA93FA] to-[#983AD6] text-white">
                    Most Popular
                  </span>
                </motion.div>
              )}

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-white mb-2">
                {plan.name}
              </h3>

              {/* Description */}
              <p className="text-white/60 text-sm mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">
                  {plan.price}
                </span>
                {plan.price !== "Custom" && (
                  <span className="text-white/60 ml-2">
                    /{billingCycle === "yearly" ? "year" : "month"}
                  </span>
                )}
              </div>

              {/* CTA Button */}
              <Button
                variant={plan.highlighted ? "gradient" : "secondary"}
                size="lg"
                className="w-full mb-8"
              >
                Get Started
              </Button>

              {/* Features List */}
              <div className="space-y-4">
                {plan.features.map((feature, fIdx) => (
                  <motion.div
                    key={fIdx}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * fIdx }}
                    className="flex items-start gap-3"
                  >
                    {feature.included ? (
                      <Check
                        size={20}
                        className="text-green-400 flex-shrink-0 mt-1"
                      />
                    ) : (
                      <X
                        size={20}
                        className="text-white/30 flex-shrink-0 mt-1"
                      />
                    )}
                    <span
                      className={
                        feature.included ? "text-white" : "text-white/40"
                      }
                    >
                      {feature.name}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Glow effect for featured plan */}
              {plan.highlighted && (
                <div className="absolute inset-0 -z-10 rounded-2xl blur-2xl opacity-20 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center text-white/60 mt-12"
        >
          All plans include API access, documentation, and community support.{" "}
          <a href="#" className="text-purple-400 hover:text-purple-300">
            View full comparison
          </a>
        </motion.p>
      </div>
    </section>
  );
}
