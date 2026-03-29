import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../core/config/supabase'
import { db } from '../core/database/db'
import { seedInitialData } from '../core/database/seed'
import { cancelDebouncedPush } from '../core/sync/sync-triggers'
import { syncEngine } from '../core/sync/sync-engine'
import { toSupabaseRecord } from '../core/sync/table-config'
import { nowIso } from '../shared/types/base'
import type { AppUser, UserRole } from '../shared/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SignUpParams {
  email?: string
  phone: string
  password: string
  fullName: string
  farmName: string
  currency?: string
}

interface AuthState {
  user: User | null
  appUser: AppUser | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  hasInitialized: boolean
  error: string | null
  /** Non-null when the owner is previewing another team member's perspective. */
  viewingAs: AppUser | null

  initialize: () => Promise<void>
  signUp: (params: SignUpParams) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithPhone: (phone: string) => Promise<void>
  verifyOtp: (phone: string, otp: string) => Promise<void>
  /** Redeem an invite: authenticates with phone+code, validates invite, seeds local DB. */
  acceptInvite: (phone: string, inviteCode: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Pick<AppUser, 'fullName' | 'phone' | 'email'>>) => Promise<void>
  clearError: () => void
  setViewingAs: (member: AppUser | null) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapError(msg: string): string {
  if (/invalid.*(login|credentials)|invalid_grant/i.test(msg))
    return 'Incorrect email or password'
  if (/not confirmed/i.test(msg))
    return 'Please confirm your email address first'
  if (/already registered|already exists/i.test(msg))
    return 'An account already exists with this contact. Try signing in instead.'
  if (/password.*(at least|too short)|weak password/i.test(msg))
    return 'Password must be at least 6 characters'
  if (/otp.*invalid|token.*invalid|token.*expired/i.test(msg))
    return 'Invalid or expired code. Please request a new one.'
  if (/rate.?limit|too many/i.test(msg))
    return 'Too many attempts. Please wait a few minutes and try again.'
  if (/network|fetch failed|connection refused/i.test(msg))
    return 'Connection error. Please check your internet and try again.'
  return msg
}

async function loadAppUser(userId: string): Promise<AppUser | null> {
  try {
    return (await db.appUsers.get(userId)) ?? null
  } catch (e) {
    console.warn('[loadAppUser] IndexedDB error for userId:', userId, e)
    return null
  }
}

/** Normalise to last 8 digits for loose phone matching.
 *  Handles +254712345678 / 0712345678 / 712345678 all matching each other. */
function normalizePhone(p: string): string {
  return p.replace(/\D/g, '').slice(-8)
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  appUser: null,
  session: null,
  isLoading: true, // true until initialize() finishes
  isAuthenticated: false,
  hasInitialized: false,
  error: null,
  viewingAs: null,

  initialize: async () => {
    if (get().hasInitialized) return
    set({ hasInitialized: true })

    try {
      // getSession() reads from localStorage — works offline
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        let appUser = await loadAppUser(session.user.id)
        const isWorkerAccount = session.user.email?.endsWith('@agrimanager.app') ?? false
        if (!appUser && !isWorkerAccount) {
          try {
            await seedInitialData({
              userId: session.user.id,
              email: session.user.email ?? '',
              fullName: session.user.user_metadata?.full_name ?? '',
              orgName: 'My Farm',
            })
          } catch { /* records may already exist */ }
          appUser = await loadAppUser(session.user.id)
        }
        set({ session, user: session.user, appUser, isAuthenticated: !!appUser, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }

    // Watch for external changes: token refresh, sign-out from another tab
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, appUser: null, isAuthenticated: false })
      } else if (event === 'TOKEN_REFRESHED' && session) {
        set({ session })
      } else if (event === 'USER_UPDATED' && session?.user) {
        const appUser = await loadAppUser(session.user.id)
        set({ session, user: session.user, appUser })
      }
    })
  },

  signUp: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const credentials = params.email
        ? { email: params.email, password: params.password }
        : { phone: params.phone, password: params.password }

      const { data, error } = await supabase.auth.signUp({
        ...credentials,
        options: { data: { full_name: params.fullName, phone: params.phone } },
      })

      if (error) { set({ error: mapError(error.message), isLoading: false }); return }
      if (!data.user) { set({ error: 'Sign up failed. Please try again.', isLoading: false }); return }

      await seedInitialData({
        userId: data.user.id,
        email: params.email ?? '',
        fullName: params.fullName,
        orgName: params.farmName,
        currency: params.currency,
      })

      const appUser = await loadAppUser(data.user.id)

      if (data.session) {
        set({ session: data.session, user: data.user, appUser, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (e: any) {
      set({ error: mapError(e?.message ?? 'Sign up failed'), isLoading: false })
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { set({ error: mapError(error.message), isLoading: false }); return }
      let appUser = await loadAppUser(data.user.id)
      const isWorkerAccount = (data.user.email ?? email).endsWith('@agrimanager.app')
      if (!appUser && !isWorkerAccount) {
        try {
          await seedInitialData({
            userId: data.user.id,
            email: data.user.email ?? email,
            fullName: data.user.user_metadata?.full_name ?? '',
            orgName: 'My Farm',
          })
        } catch { /* records may already exist */ }
        appUser = await loadAppUser(data.user.id)
      }
      set({ session: data.session, user: data.user, appUser, isAuthenticated: !!appUser, isLoading: false })
    } catch (e: any) {
      set({ error: mapError(e?.message ?? 'Sign in failed'), isLoading: false })
    }
  },

  signInWithPhone: async (phone) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone })
      if (error) { set({ error: mapError(error.message), isLoading: false }); return }
      set({ isLoading: false })
    } catch (e: any) {
      set({ error: mapError(e?.message ?? 'Failed to send code'), isLoading: false })
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' })
      if (error) { set({ error: mapError(error.message), isLoading: false }); return }
      if (!data.user || !data.session) {
        set({ error: 'Verification failed. Please try again.', isLoading: false }); return
      }

      let appUser = await loadAppUser(data.user.id)
      if (!appUser) {
        await seedInitialData({
          userId: data.user.id,
          email: data.user.email ?? '',
          fullName: data.user.user_metadata?.full_name ?? 'Farm User',
          orgName: 'My Farm',
        })
        appUser = await loadAppUser(data.user.id)
      }

      set({ session: data.session, user: data.user, appUser, isAuthenticated: true, isLoading: false })
    } catch (e: any) {
      set({ error: mapError(e?.message ?? 'Verification failed'), isLoading: false })
    }
  },

  acceptInvite: async (phone, inviteCode) => {
    set({ isLoading: true, error: null })
    try {
      const normPhone = phone.startsWith('+') ? phone : `+${phone}`
      const code = inviteCode.toUpperCase().trim()

      // ── Call Edge Function ─────────────────────────────────────────────────
      // The worker-auth function uses the Supabase admin API (service role key)
      // to create accounts with email_confirm: true, completely bypassing the
      // "Confirm email" setting in the Supabase project. It handles:
      //   • invite lookup + phone verification (server-side)
      //   • returning workers (sign-in) vs new workers (admin createUser → sign-in)
      //   • redeemed-invite guards
      const { data, error: fnErr } = await supabase.functions.invoke('worker-auth', {
        body: { phone: normPhone, inviteCode: code },
      })

      if (fnErr || !data || data.error) {
        set({
          error: data?.error ?? fnErr?.message ?? 'Failed to authenticate. Please check your details.',
          isLoading: false,
        })
        return
      }

      const { session: rawSession, invite } = data as {
        session: { access_token: string; refresh_token: string }
        user: User
        invite: Record<string, unknown>
      }

      // ── Persist session to the Supabase client (localStorage + auth state) ──
      const { data: sessionData, error: setErr } = await supabase.auth.setSession({
        access_token:  rawSession.access_token,
        refresh_token: rawSession.refresh_token,
      })
      if (setErr || !sessionData.session) {
        set({ error: 'Could not save session. Please try again.', isLoading: false })
        return
      }

      const session = sessionData.session
      const userId  = session.user.id

      // ── Returning worker: already set up on this device ──────────────────
      const existingUser = await loadAppUser(userId)
      if (existingUser) {
        if (existingUser.syncStatus !== 'synced') {
          try {
            await supabase
              .from('app_users')
              .upsert([toSupabaseRecord(existingUser as unknown as Record<string, unknown>)], { onConflict: 'id' })
            await db.appUsers.update(userId, { syncStatus: 'synced' as const })
            existingUser.syncStatus = 'synced'
          } catch { /* non-fatal */ }
        }
        set({ session, user: session.user, appUser: existingUser, isAuthenticated: true, isLoading: false })
        return
      }

      // ── New worker / new device: seed local DB from invite data ──────────
      const ts = nowIso()

      await db.transaction('rw', [db.organizations, db.appUsers], async () => {
        try {
          await db.organizations.add({
            id:                invite.organization_id as string,
            name:              invite.org_name as string,
            currency:          (invite.org_currency as string) || 'USD',
            defaultUnitSystem: 'metric',
            syncStatus:        'pending',
            createdAt:         ts,
            updatedAt:         ts,
          })
        } catch { /* org may already exist on this device */ }

        await db.appUsers.put({
          id:                          userId,
          organizationId:              invite.organization_id as string,
          fullName:                    invite.full_name as string,
          phone:                       invite.phone as string,
          email:                       (invite.email as string) || undefined,
          role:                        invite.role as UserRole,
          assignedFarmLocationIds:     (invite.assigned_farm_location_ids as string[]) || [],
          assignedInfrastructureIds:   (invite.assigned_infrastructure_ids as string[]) || [],
          isActive:                    true,
          syncStatus:                  'pending',
          createdAt:                   ts,
          updatedAt:                   ts,
        })
      })

      // Mark invite as redeemed (idempotent — only update if not already done)
      await supabase
        .from('team_invites')
        .update({ redeemed_at: ts, redeemed_by: userId })
        .eq('invite_code', code)
        .is('redeemed_at', null)

      // Push the worker's AppUser to Supabase BEFORE pulling org data.
      // Every RLS policy calls get_user_org_id() which does:
      //   SELECT organization_id FROM app_users WHERE id = auth.uid()
      // Until this record exists in Supabase, every pull query returns empty.
      try {
        const workerAppUser = await db.appUsers.get(userId)
        if (workerAppUser) {
          await supabase
            .from('app_users')
            .upsert([toSupabaseRecord(workerAppUser as unknown as Record<string, unknown>)], { onConflict: 'id' })
          await db.appUsers.update(userId, { syncStatus: 'synced' as const })
        }
      } catch { /* non-fatal */ }

      // Pull all org data — enterprises, infrastructure, farm locations etc.
      await syncEngine.pullChanges().catch(() => { /* non-fatal — will retry on next sync */ })

      const appUser = await loadAppUser(userId)
      set({ session, user: session.user, appUser, isAuthenticated: true, isLoading: false })
    } catch (e: any) {
      set({ error: mapError(e?.message ?? 'Failed to redeem invite'), isLoading: false })
    }
  },

  signOut: async () => {
    cancelDebouncedPush()
    try { await supabase.auth.signOut() } catch { /* ignore */ }
    set({ session: null, user: null, appUser: null, isAuthenticated: false, error: null })
  },

  updateProfile: async (updates) => {
    const { appUser } = get()
    if (!appUser) return
    set({ error: null })
    try {
      const updated: AppUser = { ...appUser, ...updates, updatedAt: nowIso(), syncStatus: 'pending' }
      await db.appUsers.put(updated)
      set({ appUser: updated })
      await supabase.auth.updateUser({
        data: { full_name: updated.fullName, phone: updated.phone },
      })
    } catch (e: any) {
      set({ error: mapError(e?.message ?? 'Profile update failed') })
    }
  },

  clearError: () => set({ error: null }),

  setViewingAs: (member) => set({ viewingAs: member }),
}))
