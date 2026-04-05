import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import { partnerSupabase } from '../core/config/supabase-partner'
import type { Partner } from '../shared/types/partner'

interface PartnerState {
  partner: Partner | null
  session: Session | null
  isLoading: boolean
  error: string | null
  hasInitialized: boolean

  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshPartner: () => Promise<void>
  clearError: () => void
}

function mapPartnerRow(row: Record<string, unknown>): Partner {
  return {
    id:             row.id as string,
    userId:         row.user_id as string,
    fullName:       row.full_name as string,
    email:          row.email as string,
    phone:          row.phone as string | null,
    country:        row.country as string,
    territory:      row.territory as string | null,
    referralCode:   row.referral_code as string | null,
    status:         row.status as Partner['status'],
    tier:           (row.tier as Partner['tier']) ?? 'standard',
    notes:          row.notes as string | null,
    paymentMethod:  row.payment_method as string | null,
    paymentDetails: row.payment_details as string | null,
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
  }
}

async function fetchPartnerByUserId(userId: string): Promise<Partner | null> {
  const { data, error } = await partnerSupabase
    .from('partners')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return mapPartnerRow(data as Record<string, unknown>)
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set, get) => ({
      partner: null,
      session: null,
      isLoading: false,
      error: null,
      hasInitialized: false,

      initialize: async () => {
        if (get().hasInitialized) return
        set({ hasInitialized: true, isLoading: true })
        try {
          const { data: { session } } = await partnerSupabase.auth.getSession()
          if (session?.user) {
            const partner = await fetchPartnerByUserId(session.user.id)
            set({ session, partner, isLoading: false })
          } else {
            set({ session: null, partner: null, isLoading: false })
          }
        } catch {
          set({ isLoading: false })
        }

        partnerSupabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            set({ session: null, partner: null })
          } else if (event === 'TOKEN_REFRESHED' && session) {
            set({ session })
          }
        })
      },

      signIn: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await partnerSupabase.auth.signInWithPassword({ email, password })
          if (error) {
            set({ error: error.message, isLoading: false })
            return
          }
          const partner = await fetchPartnerByUserId(data.user.id)
          if (!partner) {
            await partnerSupabase.auth.signOut()
            set({ error: 'No partner account found for this email. Please apply first.', isLoading: false })
            return
          }
          set({ session: data.session, partner, isLoading: false })
        } catch (e: unknown) {
          set({ error: (e as Error)?.message ?? 'Sign in failed', isLoading: false })
        }
      },

      signOut: async () => {
        try { await partnerSupabase.auth.signOut() } catch { /* ignore */ }
        set({ session: null, partner: null, error: null })
      },

      refreshPartner: async () => {
        const { session } = get()
        if (!session?.user) return
        const partner = await fetchPartnerByUserId(session.user.id)
        if (partner) set({ partner })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'agri-partner-store',
      partialize: (s) => ({ partner: s.partner, session: s.session }),
    }
  )
)
