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

### Render + Docker + GitHub Actions

This repository includes:

- CI workflow: `.github/workflows/ci.yml`
- CD workflow: `.github/workflows/cd-render.yml`
- Production Docker build via multi-stage `Dockerfile`

#### 1) Configure GitHub secrets

Add these repository secrets in GitHub:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RENDER_DEPLOY_HOOK`

Optional (for local checks in CI if you add more build-time validations):

- `REDIS_URL`
- `GROQ_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

#### 2) Configure Render service

- Runtime: Docker
- Branch: `main`
- Auto-deploy: optional; if you prefer GitHub Actions control, keep it off and use `RENDER_DEPLOY_HOOK`
- Environment variables: set all values from `.env.example`

#### 3) Redis setup

Use Upstash or Render Redis and set:

- `REDIS_URL=rediss://...` for hosted TLS Redis
- `REDIS_URL=redis://localhost:6379` for local development

The app uses Redis for:

- BullMQ AI review queue
- Socket.IO pub/sub adapter for multi-instance real-time sync
- Session presence + collaborative state persistence

#### 4) CI/CD behavior

- Pull requests and pushes to `main`/`develop`: lint, type-check, build
- Push to `main`: `CI` must pass first, then `CD Render` validates Dockerfile and triggers the Render deploy hook
- Manual run: `CD Render` can also be triggered via `workflow_dispatch`

#### 5) Branch protection (required)

In GitHub repository settings, protect `main` and require status checks before merge.

- Enable branch protection for `main`
- Require pull request before merging
- Require status checks to pass before merging
- Select required check: `quality` (from the `CI` workflow)
- Optional but recommended: require branches to be up to date before merging

This ensures deploys can only happen from code that already passed CI.

#### 6) Secret rotation (required if previously exposed)

Rotate these credentials immediately in their providers and update values in both GitHub/Render secrets and local `.env.local`:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `REDIS_URL` (regenerate Upstash/Redis password)

After rotation, update repository secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RENDER_DEPLOY_HOOK`
- Optional: `REDIS_URL`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Environment Variables

Use `.env.example` as the source of truth:

```bash
cp .env.example .env.local
```

Set values for:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
GROQ_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
```

Security note: never commit real credentials. If any secrets were exposed previously, rotate them immediately in Supabase, Groq, Redis, and Render.

## License

MIT License - See LICENSE file for details

## Support

For questions or issues, please refer to the [documentation](https://docs.codereview.live) or open an issue on GitHub.

---

**Built with ❤️ using Next.js, Tailwind CSS, and Framer Motion**
