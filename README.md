# CodeReview.live

A modern, production-ready landing page for CodeReview.live — a real-time collaborative code review platform with AI-powered feedback.

## Features

✨ **Beautiful Dark Mode Design**

- Glassmorphism aesthetic with subtle gradients
- Clean, minimal, developer-focused interface
- Smooth animations and micro-interactions

🎯 **Optimized Performance**

- Built with Next.js 15+ for SSR and static generation
- Tailwind CSS v4 for optimized styling
- Framer Motion (motion/react) for GPU-accelerated animations

📱 **Fully Responsive**

- Mobile-first design approach
- Seamless experience across all devices
- Touch-optimized interactions

### Sections

1. **Hero Section**
   - Attention-grabbing headline with gradient text
   - Subheadline explaining value proposition
   - Dual CTA buttons (primary & secondary)
   - Integrated video streaming with HLS.js fallback

2. **Logo Cloud**
   - Animated infinite slider with trusted brands
   - Glassmorphic design with smooth transitions

3. **Features Section**
   - 6 feature cards with icons
   - Hover animations and gradient accents
   - Organized grid layout

4. **Product Demo**
   - Stylized code editor interface
   - Animated AI feedback rendering
   - Real-time typing animation

5. **How It Works**
   - 3-step process explanation
   - Numbered badges with gradients
   - Connected flow design

6. **Testimonials**
   - Developer testimonials with avatars
   - Star ratings
   - Hover effects and typography hierarchy

7. **Pricing Section**
   - 3-tier pricing plans (Free, Pro, Team)
   - Monthly/Yearly toggle
   - Feature comparison lists
   - Featured plan scaling effect

8. **Final CTA**
   - Conversion-focused call to action
   - Animated background glows
   - Social proof with statistics

9. **Footer**
   - Comprehensive link structure
   - Social media integration
   - Minimal developer-focused design

## Tech Stack

- **Framework**: Next.js 15.1+
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + PostCSS
- **Animations**: motion/react (Framer Motion)
- **Icons**: lucide-react
- **Video**: hls.js for adaptive streaming
- **Utilities**: clsx, tailwind-merge, class-variance-authority

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun, PNPM, Yarn)
- npm 9+ (or your preferred package manager)

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables** (if needed):

   ```bash
   cp .env.example .env.local
   ```

3. **Run development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── hero.tsx            # Hero section
│   ├── logo-cloud.tsx      # Logo cloud section
│   ├── features.tsx        # Features section
│   ├── demo.tsx            # Product demo
│   ├── how-it-works.tsx    # How it works section
│   ├── testimonials.tsx    # Testimonials section
│   ├── pricing.tsx         # Pricing section
│   ├── final-cta.tsx       # Final CTA section
│   ├── footer.tsx          # Footer
│   └── ui/
│       ├── button.tsx      # Reusable button component
│       └── infinite-slider.tsx  # Animated logo slider
├── hooks/
│   └── use-hls-video.ts    # Video streaming hook
└── lib/
    └── utils.ts            # Utility functions
```

## Key Components

### Hero Section

- Announcement pill with gradient icon
- Responsive H1 with gradient text
- Subheadline with secondary text color
- Dual CTA buttons with animations
- Integrated video with HLS streaming and fallback

### Video Integration

The hero section includes adaptive video streaming:

- **Primary**: HLS stream via Cloudflare
- **Fallback**: MP4 video file
- **Features**:
  - Native HLS support for Safari
  - HLS.js for Chrome, Firefox, Edge
  - Fallback to MP4 on unsupported browsers
  - Mix-blend-screen for seamless integration
  - Gradient overlay for better text contrast

### InfiniteSlider Component

Animated carousel for logo cloud:

```tsx
<InfiniteSlider duration={30}>
  {logos.map((logo) => (
    <img key={logo} src={logo} />
  ))}
</InfiniteSlider>
```

### Feature Cards

Interactive cards with:

- Gradient icon backgrounds
- Hover animations (scale & shadow)
- Hover state transitions
- Gradient overlay effects

## Customization

### Colors

Primary gradient customization in `tailwind.config.ts`:

```ts
gradient-primary: "linear-gradient(135deg, #FA93FA via-[#C967E8] to #983AD6)"
```

### Typography

Font configuration in `src/app/layout.tsx`:

- Primary: Geist Sans
- Mono: Geist Mono

### Animation Timing

Adjust animation durations in individual components or globally via Tailwind config.

## Video Streaming

### HLS Stream Setup

For your own HLS stream:

1. Update the URL in `src/components/hero.tsx`:

   ```tsx
   const hlsUrl = "YOUR_HLS_STREAM_URL";
   const fallbackUrl = "YOUR_MP4_FALLBACK_URL";
   ```

2. Ensure CORS headers are properly configured on your stream host

### Testing

Test video playback locally:

```bash
npm run dev
# Navigate to http://localhost:3000
```

## Performance Optimization

- Images are lazy-loaded
- CSS is optimized by Tailwind
- JavaScript is code-split by Next.js
- Animations use GPU acceleration
- SEO optimized with meta tags

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest version
- Mobile Safari: Latest version

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Color contrast meets WCAG AA standards
- Keyboard navigation support
- Reduced motion preferences respected

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Other Platforms

Build and deploy the `out` directory:

```bash
npm run build
```

## Environment Variables

Create a `.env.local` file:

```bash
# Example - adjust as needed for your deployment
NEXT_PUBLIC_API_URL=https://api.codereview.live
```

## License

MIT License - See LICENSE file for details

## Support

For questions or issues, please refer to the [documentation](https://docs.codereview.live) or open an issue on GitHub.

---

**Built with ❤️ using Next.js, Tailwind CSS, and Framer Motion**
