/**
 * ContactSection — public contact form
 *
 * Requires a Supabase table. Run once in your Supabase SQL editor:
 *
 *   create table if not exists contact_messages (
 *     id         uuid        default gen_random_uuid() primary key,
 *     name       text,
 *     email      text        not null,
 *     phone      text        not null,
 *     message    text        not null,
 *     created_at timestamptz default now()
 *   );
 *   alter table contact_messages enable row level security;
 *   create policy "anon insert" on contact_messages
 *     for insert to anon with check (true);
 */

import { useState } from 'react'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../../core/config/supabase'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'
import { trackEvent } from '../../../shared/utils/analytics'

type Status = 'idle' | 'submitting' | 'success' | 'error'

type FormValues = {
  name: string
  email: string
  phone: string
  message: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (!v.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
    errors.email = 'Enter a valid email address'
  }
  if (!v.phone.trim()) {
    errors.phone = 'Phone number is required'
  } else if (v.phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'Enter a valid phone number'
  }
  if (!v.message.trim()) {
    errors.message = 'Please enter your message'
  } else if (v.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters'
  }
  return errors
}

export function ContactSection({ standalone = false }: { standalone?: boolean }) {
  const ref = useScrollReveal<HTMLDivElement>()
  const [values, setValues] = useState<FormValues>({ name: '', email: '', phone: '', message: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<Status>('idle')

  const set = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues(v => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setStatus('submitting')
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name:    values.name.trim() || null,
        email:   values.email.trim(),
        phone:   values.phone.trim(),
        message: values.message.trim(),
      })
      if (error) throw error
      setStatus('success')
      trackEvent('Contact Form Submitted')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="contact" className={standalone ? '' : 'py-20 bg-white'}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {!standalone && (
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-gray-500 text-lg font-body">
              Have a question or feedback? We'd love to hear from you.
            </p>
          </div>
        )}

        <div ref={ref} className={standalone ? '' : 'reveal'}>
          {status === 'success' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-emerald-800 mb-2 font-body">Message sent!</h3>
              <p className="text-emerald-700 text-sm">
                Thanks for reaching out. We'll get back to you shortly.
              </p>
              <button
                onClick={() => { setStatus('idle'); setValues({ name: '', email: '', phone: '', message: '' }) }}
                className="mt-6 text-sm text-primary-600 font-semibold hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5"
            >
              {status === 'error' && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3.5">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    Something went wrong. Please try again or{' '}
                    <a
                      href="https://wa.me/PHONENUMBER"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline"
                    >
                      chat with us on WhatsApp
                    </a>
                    .
                  </p>
                </div>
              )}

              {/* Name (optional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={values.name}
                  onChange={set('name')}
                  placeholder="Your name"
                  className="input-base"
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={values.email}
                  onChange={set('email')}
                  placeholder="you@example.com"
                  className={`input-base ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  autoComplete="email"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={values.phone}
                  onChange={set('phone')}
                  placeholder="+254 712 345 678"
                  className={`input-base ${errors.phone ? 'border-red-400 focus:ring-red-400' : ''}`}
                  autoComplete="tel"
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={values.message}
                  onChange={set('message')}
                  placeholder="How can we help you?"
                  rows={5}
                  className={`input-base resize-none ${errors.message ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-primary-600 text-white font-semibold py-3.5 rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-400">
                We typically respond within 24 hours on business days.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
