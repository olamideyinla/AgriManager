import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { usePartnerStore } from '../../stores/partner-store'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function PartnerSignInPage() {
  const navigate  = useNavigate()
  const { signIn, initialize, isLoading, error, clearError, partner, hasInitialized } = usePartnerStore()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
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

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/partners')} className="touch-target text-gray-600 rounded-lg">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Partner Sign In</h1>
          <p className="text-xs text-gray-500">AgriManagerX Partner Portal</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🌾</div>
            <h2 className="text-xl font-bold text-gray-900">Welcome back, Partner</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to your partner dashboard</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="input-base"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                className="input-base"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading
                ? <Loader2 size={20} className="mx-auto animate-spin" />
                : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-gray-500">
              Not a partner yet?{' '}
              <button onClick={() => navigate('/partners/apply')} className="text-primary-600 font-medium">
                Apply now
              </button>
            </p>
            <p className="text-xs text-gray-400">
              Looking for the farmer app?{' '}
              <button onClick={() => navigate('/auth/signin')} className="text-primary-600">
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
