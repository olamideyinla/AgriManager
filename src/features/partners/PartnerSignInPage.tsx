import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Eye, EyeOff, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { usePartnerStore } from '../../stores/partner-store'
import { partnerSupabase } from '../../core/config/supabase-partner'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

// ── Pending approval screen ───────────────────────────────────────────────────

function PendingScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary-800 to-primary-950 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock size={36} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Application Under Review</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          Your application is being reviewed. We will contact <strong className="text-gray-700">{email}</strong> within 3 business days.
        </p>
        <p className="text-gray-400 text-xs mb-6">
          Check your inbox — including your spam folder — for updates from our team.
        </p>
        <div className="bg-primary-50 rounded-2xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-semibold text-primary-800 uppercase tracking-wide">While you wait</p>
          {[
            'Check your email for any requests from our review team',
            'Explore the Partner Program page to understand commission tiers',
            'Prepare your farmer contact list to hit the ground running',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle size={14} className="text-primary-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary-700">{item}</p>
            </div>
          ))}
        </div>
        <button onClick={onSignOut} className="btn-secondary w-full">
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ── Rejected / suspended screen ───────────────────────────────────────────────

function RejectedScreen({ status, onSignOut }: { status: string; onSignOut: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary-800 to-primary-950 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle size={36} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {status === 'suspended' ? 'Account Suspended' : 'Application Not Approved'}
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {status === 'suspended'
            ? 'Your partner account has been suspended. Please contact us at partners@agrimanagerx.com to resolve this.'
            : 'Your application was not approved at this time. Please contact us at partners@agrimanagerx.com if you have questions or would like to reapply.'}
        </p>
        <button
          onClick={() => navigate('/contact')}
          className="btn-primary w-full mb-3"
        >
          Contact Us
        </button>
        <button onClick={onSignOut} className="btn-secondary w-full">
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ── Forgot password flow ──────────────────────────────────────────────────────

function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  const handleSend = async () => {
    setErr(null)
    if (!email || !email.includes('@')) { setErr('Enter a valid email address'); return }
    setLoading(true)
    const { error } = await partnerSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/partners/signin`,
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-green-500" />
        </div>
        <h3 className="font-bold text-gray-900 mb-2">Check your inbox</h3>
        <p className="text-sm text-gray-500 mb-6">
          We sent a password reset link to <strong>{email}</strong>. Check your spam folder if you don't see it.
        </p>
        <button onClick={onBack} className="text-sm text-primary-600 font-medium">
          Back to Sign In
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 text-lg">Reset Password</h2>
        <p className="text-xs text-gray-400 mt-0.5">Enter your partner account email and we'll send a reset link</p>
      </div>
      <div className="px-6 py-5 space-y-4">
        {err && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{err}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            className="input-base"
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button onClick={handleSend} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
        </button>
        <button onClick={onBack} className="w-full text-sm text-gray-400 hover:text-gray-600 text-center pt-1">
          Back to Sign In
        </button>
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PartnerSignInPage() {
  const navigate  = useNavigate()
  const { signIn, signOut, initialize, isLoading, error, clearError, partner, hasInitialized } = usePartnerStore()

  const [showPw,       setShowPw]       = useState(false)
  const [showForgot,   setShowForgot]   = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => { void initialize() }, [initialize])

  // Redirect to portal if already signed in and approved
  useEffect(() => {
    if (hasInitialized && partner?.status === 'approved') {
      navigate('/partners/portal', { replace: true })
    }
  }, [hasInitialized, partner, navigate])

  const onSubmit = async (data: FormData) => {
    clearError()
    await signIn(data.email, data.password)
    const state = usePartnerStore.getState()
    if (!state.error && state.partner?.status === 'approved') {
      navigate('/partners/portal', { replace: true })
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/partners', { replace: true })
  }

  // ── Post-login status screens ─────────────────────────────────────────────

  if (hasInitialized && partner?.status === 'pending') {
    return <PendingScreen email={partner.email} onSignOut={handleSignOut} />
  }

  if (hasInitialized && partner && !['approved', 'pending'].includes(partner.status)) {
    return <RejectedScreen status={partner.status} onSignOut={handleSignOut} />
  }

  // ── Sign-in form ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary-800 to-primary-950 flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-5 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate('/partners')}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">AgriManagerX</p>
          <p className="text-primary-300 text-xs">Partner Portal</p>
        </div>
        <button
          onClick={() => navigate('/partners/apply')}
          className="text-xs text-primary-300 hover:text-white font-medium"
        >
          Apply Now
        </button>
      </div>

      {/* Hero text */}
      <div className="px-6 pt-8 pb-6 text-center">
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Partner Sign In</h1>
        <p className="text-primary-300 text-sm">Access your dashboard, referral link, and earnings</p>
      </div>

      {/* Card */}
      <div className="flex-1 px-4 pb-8">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md mx-auto overflow-hidden">

          {showForgot ? (
            <ForgotPasswordView onBack={() => setShowForgot(false)} />
          ) : (
            <>
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-lg">Welcome back, Partner</h2>
                <p className="text-xs text-gray-400 mt-0.5">Sign in with the email and password from your application</p>
              </div>

              <div className="px-6 py-5">
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      {...register('email')}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="input-base"
                      autoFocus
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        {...register('password')}
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Your password"
                        className="input-base pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                  >
                    {(isSubmitting || isLoading)
                      ? <Loader2 size={20} className="animate-spin" />
                      : 'Sign In to Portal'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100 space-y-3 text-center">
                  <p className="text-sm text-gray-500">
                    Not a partner yet?{' '}
                    <button
                      onClick={() => navigate('/partners/apply')}
                      className="text-primary-600 font-semibold hover:text-primary-700"
                    >
                      Apply to join
                    </button>
                  </p>
                  <p className="text-xs text-gray-400">
                    Farmer looking for the app?{' '}
                    <button
                      onClick={() => navigate('/auth/signin')}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
