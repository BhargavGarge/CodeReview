import type { Metadata, Viewport } from "next";
import { Cabin, Inter, Instrument_Serif, Manrope } from "next/font/google";
import { AuthProvider } from "@/context/auth-provider";
import { NavigationProgress } from "@/components/page-loader";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cabin = Cabin({
  variable: "--font-cabin",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodeReview.live",
  description:
    "CodeReview.live is a real-time collaborative code review platform with AI-powered feedback.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${cabin.variable} ${instrumentSerif.variable} ${inter.variable} antialiased bg-[#010101] text-white`}
      >
        <NavigationProgress />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
