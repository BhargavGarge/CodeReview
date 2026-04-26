<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# CodeReview.live Development Guidelines

## Project Overview

CodeReview.live is a production-ready Next.js landing page for a real-time collaborative code review platform with AI-powered feedback. Built with TypeScript, Tailwind CSS v4, and motion/react animations.

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with PostCSS
- **Animations**: motion/react (Framer Motion 11+)
- **Video**: hls.js for adaptive streaming
- **Icons**: lucide-react
- **Utilities**: clsx, tailwind-merge, class-variance-authority

## Code Style & Best Practices

### React Components

- Use functional components with hooks
- Implement "use client" directive for interactive components
- Props should be typed with TypeScript interfaces
- Use React.forwardRef for UI components that need ref forwarding
- Export components with PascalCase naming

### Tailwind CSS

- Use Tailwind utility classes for styling
- Leverage the custom theme configuration in tailwind.config.ts:
  - `gradient-primary`: Primary gradient accent
  - `gradient-fade`: Fade transition gradient
  - Custom animations: float, slide, slide-reverse
- Use `@apply` sparingly in globals.css for reusable patterns
- Maintain responsive design with md: and lg: breakpoints

### Animations

- Use motion/react for all animations
- Properties: animate, whileHover, whileInView, whileTap
- Common patterns:
  - Entry animations: opacity + transform
  - Hover effects: y offset, scale transforms
  - Infinite animations: duration + repeat
- Transitions: duration typically 0.3s - 0.8s

### Component Structure

```tsx
"use client";

import React from "react";
import { motion } from "motion/react";

interface ComponentProps {
  // Your props
}

export function ComponentName({ ...props }: ComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Content */}
    </motion.div>
  );
}
```

## File Organization

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── hero.tsx
│   ├── features.tsx
│   └── ui/          # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and helpers
└── styles/          # Global styles
```

## Development Workflow

1. **Feature Development**
   - Create new components in `src/components/`
   - Add hooks in `src/hooks/` if needed
   - Test responsiveness at 375px (mobile) and 1920px (desktop)

2. **Styling**
   - Use Tailwind utilities first
   - Extend theme in tailwind.config.ts for custom values
   - Always test in light/dark modes

3. **Animations**
   - Use motion/react for interactive elements
   - Follow motion design principles for UX
   - Test with reduced motion settings

4. **Performance**
   - Lazy load images and components
   - Monitor bundle size
   - Use Next.js Image component for optimization

## Common Patterns

### Section Component Structure

```tsx
export function SectionName() {
  return (
    <section className="section-padding relative">
      {/* Background glows */}

      <div className="container-custom relative z-10">
        {/* Section header */}
        <motion.div className="text-center mb-16">
          {/* Content */}
        </motion.div>

        {/* Main content grid/layout */}
      </div>
    </section>
  );
}
```

### Button Component Usage

```tsx
<Button variant="primary" size="lg">
  Primary CTA
</Button>

// Variants: primary, secondary, ghost, gradient
// Sizes: sm, md, lg, xl
```

### Animation Pattern

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, delay: index * 0.1 }}
  viewport={{ once: true }}
>
  {/* Content */}
</motion.div>
```

## Environment Variables

- Currently using public URLs for demo purposes
- Update video URLs in `src/components/hero.tsx` for production
- Environment variables should be prefixed with `NEXT_PUBLIC_` for client-side access

## Testing

- Test on mobile (375px), tablet (768px), and desktop (1920px)
- Verify animations are smooth at 60fps
- Check accessibility with keyboard navigation
- Test video playback with network throttling

## Deployment

- Deploy to Vercel for optimal Next.js performance
- Build command: `npm run build`
- Start command: `npm run start`
- Ensure environment variables are set in deployment platform

## Git Workflow

- Use feature branches for new features
- Keep commits atomic and descriptive
- Update README.md for significant changes
- Follow conventional commit messages

## Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Quick Reference

- Primary colors: purple (#983AD6) and pink (#FA93FA)
- Background: deep black (#010101 or #0B0F19)
- Text: white with opacity variations (70%, 60%, 50%)
- Spacing: Use Tailwind scale (px, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24)
- Border radius: Tailwind's rounded scale

---

Last Updated: April 10, 2026
