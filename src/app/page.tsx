import { LandingHero } from "@/components/landing-hero";
import { Features } from "@/components/features";
import { FramerHulyEmbed } from "@/components/framer-huly-embed";
import { LanguageFeatures } from "@/components/language-features";

export default function Home() {
  return (
    <main>
      <LandingHero />
      <Features />
      <LanguageFeatures />
      <FramerHulyEmbed />
    </main>
  );
}
