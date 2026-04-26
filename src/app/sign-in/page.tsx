import { SignInPage, Testimonial } from "@/components/ui/sign-in";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    name: "Sarah Chen",
    handle: "@sarahdigital",
    text: "Amazing platform! The code review process is seamless and the AI feedback is incredibly accurate.",
  },
  {
    avatarSrc:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    name: "Marcus Johnson",
    handle: "@marcustech",
    text: "This service has transformed how our team collaborates. Clean design, powerful features, and excellent support.",
  },
  {
    avatarSrc:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    name: "David Martinez",
    handle: "@davidcreates",
    text: "I've tried many platforms, but this one stands out. Intuitive, reliable, and genuinely helpful for code quality.",
  },
];

const SignInPageDemo = () => {
  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    console.log("Sign In submitted:", data);
    alert(`Sign In Submitted! Check the browser console for form data.`);
  };

  const handleGoogleSignIn = () => {
    console.log("Continue with Google clicked");
    alert("Continue with Google clicked");
  };

  const handleResetPassword = () => {
    alert("Reset Password clicked");
  };

  const handleCreateAccount = () => {
    alert("Create Account clicked");
  };

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        videoSrc="https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8"
        testimonials={sampleTestimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
      />
    </div>
  );
};

export default SignInPageDemo;
