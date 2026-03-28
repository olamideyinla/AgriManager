import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../../stores/auth-store'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignInPage() {
  const navigate = useNavigate()
  const { signInWithEmail, isLoading, error, clearError } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    clearError()
    await signInWithEmail(data.email, data.password)
    // On success GuestRoute auto-redirects to role home
  }

  return (
    <div className="h-dvh flex flex-col bg-white safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate('/auth/welcome')}
          className="touch-target text-gray-600 rounded-lg"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sign In</h1>
          <p className="text-xs text-gray-400">Farm owner / manager account</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-6">
        {/* Error banner */}
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
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="input-base"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••"
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/auth/forgot-password')}
            className="text-sm text-primary-600 font-medium"
          >
            Forgot password?
          </button>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading
              ? <Loader2 size={20} className="mx-auto animate-spin" />
              : 'Sign In'}
          </button>
        </form>

        {/* Sign up link */}
        <div className="mt-8 text-center pb-6">
          <span className="text-sm text-gray-500">Don't have an account? </span>
          <button
            onClick={() => navigate('/auth/signup')}
            className="text-sm text-primary-600 font-medium"
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  )
}
