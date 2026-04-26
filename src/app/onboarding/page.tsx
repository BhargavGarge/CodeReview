import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'

const logoPath =
  'M1.04356 6.35771L13.6437 0.666504L26.2438 6.35771V20.0443L13.6437 25.7355L1.04356 20.0443V6.35771Z'

// Server Component — reads session server-side, no loading flash
export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already handles the unauthenticated case, but this is a safety net
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  // Already onboarded — skip straight to dashboard
  if (profile?.onboarding_completed) redirect('/dashboard')

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#010101] text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed -left-24 top-20 h-96 w-96 rounded-full bg-[#7b39fc]/15 blur-[120px]" />
      <div className="pointer-events-none fixed -right-24 bottom-16 h-96 w-96 rounded-full bg-[#c967e8]/12 blur-[140px]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        {/* Logo */}
        <div className="mb-12 flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d={logoPath} fill="#FFFFFF" />
          </svg>
          <span className="text-[14px] font-semibold tracking-[0.08em] text-white/90">
            CODE REVIEW
          </span>
        </div>

        {/* Onboarding form is a client component — receives userId as prop */}
        <OnboardingForm userId={user.id} />
      </div>
    </main>
  )
}
