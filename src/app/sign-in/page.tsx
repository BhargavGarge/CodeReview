import type { Viewport } from "next";
import { SignInClient } from "./sign-in-client";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function SignInPage() {
  return <SignInClient />;
}
