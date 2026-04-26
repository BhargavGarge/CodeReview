"use client";

import { motion } from "framer-motion";

const languages = [
  {
    name: "JavaScript",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
  },
  {
    name: "Python",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
  },
  {
    name: "TypeScript",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
  },
  {
    name: "Java",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
  },
  {
    name: "C++",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
  },
  {
    name: "Ruby",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg",
  },
  {
    name: "Go",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
  },
  {
    name: "Rust",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg",
  },
];

export function LanguageFeatures() {
  return (
    <section className="bg-[#07070a] py-20 text-white">
      <div className="container-custom mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold leading-tight text-white/90 md:text-4xl">
            Works with Your Stack
          </h2>
          <p className="mt-4 text-lg text-white/60">
            From frontend frameworks to backend languages, get reviews on any
            kind of code.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-4">
          {languages.map((lang, index) => (
            <motion.div
              key={lang.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-[#0a0a0d] p-8"
            >
              <img
                src={lang.logo}
                alt={`${lang.name} logo`}
                className="h-16 w-16"
              />
              <p className="mt-4 text-lg font-semibold text-white/80">
                {lang.name}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
