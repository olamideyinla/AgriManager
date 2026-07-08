import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle, Users, Briefcase, Eye, EyeOff } from 'lucide-react'
import { partnerSupabase } from '../../core/config/supabase-partner'
import { usePageMeta } from '../../shared/hooks/usePageMeta'

// ── Schemas ────────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  fullName:  z.string().min(2, 'Full name is required'),
  email:     z.string().email('Enter a valid email'),
  phone:     z.string().min(7, 'Phone / WhatsApp is required'),
  country:   z.string().min(1, 'Select your country'),
  territory: z.string().optional(),
})

const step2Schema = z.object({
  roleType:     z.string().min(1, 'Select your role'),
  networkSize:  z.string().min(1, 'Select your network size'),
  background:   z.string().min(30, 'Please describe your background (at least 30 characters)'),
  promoMethod:  z.string().min(20, 'Please describe how you will promote AgriManagerX'),
  heardFrom:    z.string().optional(),
})

const step3Schema = z.object({
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
  agreeTerms:      z.literal(true, { errorMap: () => ({ message: 'You must agree to the partner terms' }) }),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

// ── Constants ──────────────────────────────────────────────────────────────────

const COUNTRIES = [
  'Nigeria', 'Kenya', 'Ghana', 'South Africa', 'Uganda', 'Tanzania', 'Ethiopia',
  "Côte d'Ivoire", 'Senegal', 'Cameroon', 'Rwanda', 'Zambia', 'Zimbabwe',
  'India', 'Philippines', 'Bangladesh', 'Brazil', 'Mexico', 'Colombia', 'Other',
]

const ROLE_TYPES = [
  'Agrovet / Feed & Input Dealer',
  'Agricultural Extension Officer',
  'Farm Business Consultant',
  'Cooperative / Farmer Group Leader',
  'NGO / Development Field Officer',
  'Veterinarian / Animal Health Officer',
  'Agronomist',
  'Other',
]

const NETWORK_SIZES = [
  '10 – 50 farmers',
  '51 – 200 farmers',
  '201 – 500 farmers',
  '500+ farmers',
]

const HEARD_FROM = [
  'Social media',
  'Referred by another partner',
  'Agricultural event / conference',
  'WhatsApp group',
  'Internet search',
  'Other',
]

const STEPS = [
  { number: 1, label: 'Your Details' },
  { number: 2, label: 'Your Network' },
  { number: 3, label: 'Set Password' },
]

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.number} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s.number < current
                ? 'bg-primary-600 text-white'
                : s.number === current
                ? 'bg-white text-primary-700 ring-2 ring-primary-600'
                : 'bg-white/20 text-white/50'
            }`}>
              {s.number < current ? <CheckCircle size={16} /> : s.number}
            </div>
            <span className={`text-xs font-medium whitespace-nowrap ${
              s.number === current ? 'text-white' : 'text-white/50'
            }`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 h-px mb-5 ${s.number < current ? 'bg-primary-400' : 'bg-white/20'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Input helpers ──────────────────────────────────────────────────────────────

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="text-gray-400 font-normal ml-1">({hint})</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PartnerApplyPage() {
  const navigate = useNavigate()
  usePageMeta('Apply to Partner — AgriManagerX', 'Apply to the AgriManagerX Partner programme in a few minutes.')

  useEffect(() => {
    const via = new URLSearchParams(window.location.search).get('via')
    if (via) localStorage.setItem('agri-recruitment-code', via)
  }, [])

  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const [submitted,    setSubmitted]    = useState(false)
  const [serverError,  setServerError]  = useState<string | null>(null)
  const [showPw,       setShowPw]       = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) })
  const form3 = useForm<Step3Data>({ resolver: zodResolver(step3Schema) })

  // ── Submit handlers ──────────────────────────────────────────────────────────

  const onStep1 = (data: Step1Data) => { setStep1Data(data); setStep(2) }
  const onStep2 = (data: Step2Data) => { setStep2Data(data); setStep(3) }

  const onStep3 = async (data: Step3Data) => {
    if (!step1Data || !step2Data) return
    setServerError(null)
    try {
      const { data: authData, error: authErr } = await partnerSupabase.auth.signUp({
        email:    step1Data.email,
        password: data.password,
      })
      if (authErr)        { setServerError(authErr.message); return }
      if (!authData.user) { setServerError('Account creation failed. Please try again.'); return }

      const notes = [
        `Role: ${step2Data.roleType}`,
        `Network: ${step2Data.networkSize}`,
        `Background: ${step2Data.background}`,
        `Promotion plan: ${step2Data.promoMethod}`,
        step2Data.heardFrom ? `Heard from: ${step2Data.heardFrom}` : '',
      ].filter(Boolean).join('\n')

      const recruitedByCode = localStorage.getItem('agri-recruitment-code')

      const { error: insertErr } = await partnerSupabase.from('partners').insert({
        user_id:            authData.user.id,
        full_name:          step1Data.fullName,
        email:              step1Data.email,
        phone:              step1Data.phone,
        country:            step1Data.country,
        territory:          step1Data.territory ?? null,
        notes,
        status:             'pending',
        tier:               'standard',
        recruited_by_code:  recruitedByCode ?? null,
      })

      if (insertErr) { setServerError(insertErr.message); return }

      localStorage.removeItem('agri-recruitment-code')
      await partnerSupabase.auth.signOut()
      setSubmitted(true)
    } catch (e: unknown) {
      setServerError((e as Error)?.message ?? 'Something went wrong. Please try again.')
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-primary-800 to-primary-950 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={36} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Received</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Thank you for applying to the AgriManagerX Partner Program.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Our team will review your application and contact you within <strong className="text-gray-700">3 business days</strong>. Check your inbox — including your spam folder.
          </p>
          <div className="bg-primary-50 rounded-2xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs font-semibold text-primary-800 uppercase tracking-wide">What happens next</p>
            {[
              'We review your application and background',
              'You receive an approval email with next steps',
              'Sign in to your partner portal with the password you just set',
              'Get your referral link and start earning',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-200 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-primary-700">{item}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/partners')} className="btn-primary w-full">
            Back to Partner Program
          </button>
        </div>
      </div>
    )
  }

  // ── Form layout ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary-800 to-primary-950 flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-5 pb-2 flex items-center gap-3">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/partners')}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">AgriManagerX</p>
          <p className="text-primary-300 text-xs">Partner Program Application</p>
        </div>
        <button onClick={() => navigate('/partners/signin')} className="text-xs text-primary-300 hover:text-white font-medium">
          Sign In
        </button>
      </div>

      {/* Step indicator */}
      <div className="px-4 pt-6 pb-2">
        <StepIndicator current={step} />
      </div>

      {/* Card */}
      <div className="flex-1 px-4 pb-8">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg mx-auto overflow-hidden">

          {/* Card header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg">
              {step === 1 && 'Personal Details'}
              {step === 2 && 'Your Network & Experience'}
              {step === 3 && 'Create Portal Password'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 1 && 'How we will contact you and credit your commissions'}
              {step === 2 && 'Help us understand your reach and how you will promote AgriManagerX'}
              {step === 3 && 'You will use this to access your partner dashboard once approved'}
            </p>
          </div>

          <div className="px-6 py-5">
            {serverError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* ── Step 1 ── */}
            {step === 1 && (
              <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
                <Field label="Full Name" error={form1.formState.errors.fullName?.message}>
                  <input {...form1.register('fullName')} type="text" placeholder="Jane Okafor" className="input-base" autoFocus />
                </Field>

                <Field label="Email Address" error={form1.formState.errors.email?.message}>
                  <input {...form1.register('email')} type="email" placeholder="you@example.com" className="input-base" />
                </Field>

                <Field label="Phone / WhatsApp" error={form1.formState.errors.phone?.message}>
                  <input {...form1.register('phone')} type="tel" placeholder="+234 800 000 0000" className="input-base" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country" error={form1.formState.errors.country?.message}>
                    <select {...form1.register('country')} className="input-base">
                      <option value="">Select…</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>

                  <Field label="State / Territory" hint="optional">
                    <input {...form1.register('territory')} type="text" placeholder="e.g. Lagos" className="input-base" />
                  </Field>
                </div>

                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  Continue <ChevronRight size={16} />
                </button>
              </form>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
                <Field label="Your Role / Profession" error={form2.formState.errors.roleType?.message}>
                  <select {...form2.register('roleType')} className="input-base">
                    <option value="">Select your role…</option>
                    {ROLE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>

                <Field
                  label="How many farmers do you regularly work with?"
                  error={form2.formState.errors.networkSize?.message}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {NETWORK_SIZES.map(size => {
                      const val = form2.watch('networkSize')
                      return (
                        <label key={size} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors ${
                          val === size
                            ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}>
                          <input {...form2.register('networkSize')} type="radio" value={size} className="sr-only" />
                          <Users size={13} className={val === size ? 'text-primary-500' : 'text-gray-400'} />
                          {size}
                        </label>
                      )
                    })}
                  </div>
                  {form2.formState.errors.networkSize && (
                    <p className="mt-1 text-xs text-red-600">{form2.formState.errors.networkSize.message}</p>
                  )}
                </Field>

                <Field
                  label="Your Background"
                  hint="min. 30 chars"
                  error={form2.formState.errors.background?.message}
                >
                  <textarea
                    {...form2.register('background')}
                    rows={3}
                    placeholder="Describe your profession, the farmers you work with, and why you are a good fit for this program…"
                    className="input-base resize-none"
                  />
                </Field>

                <Field
                  label="How will you promote AgriManagerX?"
                  hint="min. 20 chars"
                  error={form2.formState.errors.promoMethod?.message}
                >
                  <textarea
                    {...form2.register('promoMethod')}
                    rows={3}
                    placeholder="e.g. In-person demos at my agrovet store, WhatsApp farmer groups, field days, cooperative meetings…"
                    className="input-base resize-none"
                  />
                </Field>

                <Field label="How did you hear about this program?" hint="optional">
                  <select {...form2.register('heardFrom')} className="input-base">
                    <option value="">Select…</option>
                    {HEARD_FROM.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>

                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  Continue <ChevronRight size={16} />
                </button>
              </form>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <form onSubmit={form3.handleSubmit(onStep3)} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  <strong>Remember this password.</strong> You will use it to sign in to your partner portal once your application is approved.
                </div>

                <Field label="Password" error={form3.formState.errors.password?.message}>
                  <div className="relative">
                    <input
                      {...form3.register('password')}
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="input-base pr-10"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm Password" error={form3.formState.errors.confirmPassword?.message}>
                  <div className="relative">
                    <input
                      {...form3.register('confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      className="input-base pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    {...form3.register('agreeTerms')}
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 text-primary-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I agree to the{' '}
                    <a href="/partners" className="text-primary-600 hover:underline font-medium">
                      AgriManagerX Partner Terms
                    </a>
                    . I understand I am an independent contractor, not an employee, and commissions are earned per the published schedule.
                  </span>
                </label>
                {form3.formState.errors.agreeTerms && (
                  <p className="text-xs text-red-600">{form3.formState.errors.agreeTerms.message}</p>
                )}

                <button
                  type="submit"
                  disabled={form3.formState.isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                >
                  {form3.formState.isSubmitting
                    ? <Loader2 size={20} className="animate-spin" />
                    : <><Briefcase size={16} /> Submit Application</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
