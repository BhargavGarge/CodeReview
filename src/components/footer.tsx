"use client";

import React from "react";
import { motion } from "motion/react";
import { Github, Linkedin, Twitter } from "lucide-react";

const footerLinks = {
  Product: [
    { name: "Features", href: "#" },
    { name: "Pricing", href: "#" },
    { name: "Changelog", href: "#" },
    { name: "Roadmap", href: "#" },
  ],
  Company: [
    { name: "About", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Contact", href: "#" },
  ],
  Resources: [
    { name: "Documentation", href: "#" },
    { name: "API Docs", href: "#" },
    { name: "Community", href: "#" },
    { name: "Support", href: "#" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Cookie Policy", href: "#" },
    { name: "Security", href: "#" },
  ],
};

const socialLinks = [
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-gradient-to-b from-black/50 to-black/80">
      <div className="container-custom mx-auto px-4">
        {/* Main Footer Content */}
        <div className="py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:col-span-1"
          >
            <a href="/" className="inline-block mb-6">
              <div className="text-2xl font-bold">
                <span className="gradient-text">CodeReview</span>
                <span className="text-white">.live</span>
              </div>
            </a>
            <p className="text-white/60 text-sm mb-6">
              Real-time collaborative code reviews with AI-powered feedback.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social, idx) => (
                <motion.a
                  key={idx}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  aria-label={social.label}
                >
                  <social.icon size={20} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links], idx) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: (idx + 1) * 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-white/60 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/0 via-white/10 to-white/0"></div>

        {/* Bottom Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="py-8 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="text-white/60 text-sm text-center md:text-left">
            © {new Date().getFullYear()} CodeReview.live. All rights reserved.
          </p>

          {/* Quick Payment Methods Badge */}
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <span>Secured by</span>
            <span className="text-white/40">●</span>
            <span>Stripe</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
