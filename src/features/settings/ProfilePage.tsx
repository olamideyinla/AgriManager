import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Phone, Mail, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

const ROLE_COLORS: Record<string, string> = {
  owner:      'bg-amber-100 text-amber-800',
  manager:    'bg-blue-100 text-blue-800',
  supervisor: 'bg-purple-100 text-purple-800',
  worker:     'bg-green-100 text-green-800',
  viewer:     'bg-gray-100 text-gray-700',
}

export default function ProfilePage() {
  const navigate      = useNavigate()
  const appUser       = useAuthStore(s => s.appUser)
  const updateProfile = useAuthStore(s => s.updateProfile)
  const error         = useAuthStore(s => s.error)
  const clearError    = useAuthStore(s => s.clearError)

  const [name,    setName]    = useState(appUser?.fullName ?? '')
  const [phone,   setPhone]   = useState(appUser?.phone   ?? '')
  const [email,   setEmail]   = useState(appUser?.email   ?? '')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  if (!appUser) return null

  const isDirty =
    name.trim()  !== (appUser.fullName ?? '') ||
    phone.trim() !== (appUser.phone   ?? '') ||
    email.trim() !== (appUser.email   ?? '')

  const handleSave = async () => {
    if (!isDirty) return
    clearError()
    setSaving(true)
    setSaved(false)
    await updateProfile({
      fullName: name.trim()  || appUser.fullName,
      phone:    phone.trim() || undefined,
      email:    email.trim() || undefined,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-safe-top">
        <div className="flex items-center gap-3 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 flex-1">Edit Profile</h1>
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Avatar + role */}
        <div className="flex flex-col items-center pt-2 pb-1">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-3">
            <span className="text-primary-700 font-bold text-3xl">
              {(name || appUser.fullName).charAt(0).toUpperCase()}
            </span>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${ROLE_COLORS[appUser.role] ?? 'bg-gray-100 text-gray-700'}`}>
            {appUser.role}
          </span>
        </div>

        {/* Name */}
        <div className="card p-4 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Personal Info</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Full Name
              </span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="input-base"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                Phone Number
              </span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+234 800 000 0000"
              className="input-base"
            />
            <p className="text-xs text-gray-400 mt-1">
              Include country code (e.g. +234 for Nigeria). Used for login and local currency detection.
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                Email <span className="text-gray-400 font-normal">(optional)</span>
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-base"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {saved && !error && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            Profile updated successfully.
          </div>
        )}

        {/* Save button (bottom — visible without scrolling up) */}
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  )
}
