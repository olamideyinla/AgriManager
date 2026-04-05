import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Loader2, CheckCircle } from 'lucide-react'
import { partnerSupabase } from '../../core/config/supabase-partner'

const schema = z.object({
  fullName:    z.string().min(2, 'Full name is required'),
  email:       z.string().email('Enter a valid email'),
  phone:       z.string().min(7, 'Phone is required'),
  country:     z.string().min(1, 'Country is required'),
  territory:   z.string().optional(),
  background:  z.string().min(20, 'Please tell us a bit about yourself (at least 20 characters)'),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  agreeTerms:  z.literal(true, { errorMap: () => ({ message: 'You must agree to the partner terms' }) }),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const COUNTRIES = [
  'Nigeria', 'Kenya', 'Ghana', 'South Africa', 'Uganda', 'Tanzania', 'Ethiopia',
  'Côte d\'Ivoire', 'Senegal', 'Cameroon', 'Rwanda', 'Zambia', 'Zimbabwe',
  'India', 'Philippines', 'Bangladesh', 'Brazil', 'Mexico', 'Colombia', 'Other',
]

export default function PartnerApplyPage() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      // 1. Create auth account
      const { data: authData, error: authErr } = await partnerSupabase.auth.signUp({
        email: data.email,
        password: data.password,
      })
      if (authErr) { setServerError(authErr.message); return }
      if (!authData.user) { setServerError('Account creation failed. Please try again.'); return }

      // 2. Insert partner row (status: pending)
      const { error: insertErr } = await partnerSupabase.from('partners').insert({
        user_id:   authData.user.id,
        full_name: data.fullName,
        email:     data.email,
        phone:     data.phone,
        country:   data.country,
        territory: data.territory ?? null,
        notes:     data.background,
        status:    'pending',
        tier:      'standard',
      })

      if (insertErr) {
        setServerError(insertErr.message)
        return
      }

      // Sign out after applying — they'll sign in once approved
      await partnerSupabase.auth.signOut()
      setSubmitted(true)
    } catch (e: unknown) {
      setServerError((e as Error)?.message ?? 'Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <CheckCircle size={56} className="text-primary-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
          <p className="text-gray-600 text-sm mb-6">
            We'll review your application and send you an approval email within 3 business days. Check your inbox for a confirmation.
          </p>
          <button
            onClick={() => navigate('/partners')}
            className="btn-primary w-full"
          >
            Back to Partner Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/partners')} className="touch-target text-gray-600 rounded-lg">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Partner Application</h1>
          <p className="text-xs text-gray-500">AgriManagerX Partner Program</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Intro */}
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 mb-6 text-sm text-primary-800">
          <p className="font-semibold mb-1">What happens next?</p>
          <p>We review your application within 3 business days. If approved, you'll receive your referral link and dashboard access by email.</p>
        </div>

        {serverError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input {...register('fullName')} type="text" placeholder="Jane Okafor" className="input-base" />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input {...register('email')} type="email" placeholder="you@example.com" className="input-base" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone / WhatsApp</label>
            <input {...register('phone')} type="tel" placeholder="+234 800 000 0000" className="input-base" />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select {...register('country')} className="input-base">
                <option value="">Select…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Territory / State <span className="text-gray-400 font-normal">(opt.)</span></label>
              <input {...register('territory')} type="text" placeholder="e.g. Lagos" className="input-base" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Background</label>
            <textarea
              {...register('background')}
              rows={3}
              placeholder="Tell us who you are and how you know farmers in your area…"
              className="input-base resize-none"
            />
            {errors.background && <p className="mt-1 text-xs text-red-600">{errors.background.message}</p>}
          </div>

          <div className="pt-2">
            <p className="text-sm font-semibold text-gray-800 mb-3">Create Your Portal Password</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input {...register('password')} type="password" autoComplete="new-password" placeholder="At least 8 characters" className="input-base" />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input {...register('confirmPassword')} type="password" autoComplete="new-password" placeholder="Re-enter password" className="input-base" />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input {...register('agreeTerms')} type="checkbox" className="mt-0.5 h-4 w-4 text-primary-600 rounded" />
            <span className="text-sm text-gray-600">
              I have read and agree to the{' '}
              <a href="/partners" className="text-primary-600 hover:underline">AgriManagerX Partner Terms</a>.
              I understand I am an independent contractor, not an employee.
            </span>
          </label>
          {errors.agreeTerms && <p className="text-xs text-red-600">{errors.agreeTerms.message}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
            {isSubmitting
              ? <Loader2 size={20} className="mx-auto animate-spin" />
              : 'Submit Application'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Already a partner?{' '}
          <button onClick={() => navigate('/partners/signin')} className="text-primary-600 font-medium">Sign In</button>
        </p>
      </div>
    </div>
  )
}
