export type PartnerStatus = 'pending' | 'approved' | 'suspended' | 'rejected'
export type PartnerTier   = 'standard' | 'silver' | 'gold'

export type CommissionStatus = 'pending' | 'approved' | 'paid'
export type ReferralStatus   = 'signup' | 'trial' | 'converted' | 'churned'
export type PlanType         = 'pro_monthly' | 'pro_annual'
export type PayoutStatus     = 'requested' | 'processing' | 'paid' | 'rejected'

export interface Partner {
  id: string
  userId: string
  fullName: string
  email: string
  phone?: string | null
  country: string
  territory?: string | null
  referralCode?: string | null
  status: PartnerStatus
  tier: PartnerTier
  notes?: string | null
  paymentMethod?: string | null
  paymentDetails?: string | null
  createdAt: string
  updatedAt: string
}

export interface PartnerReferral {
  id: string
  partnerId: string
  referredOrgId?: string | null
  referredEmail?: string | null
  status: ReferralStatus
  planType?: PlanType | null
  subscriptionAmount?: number | null   // actual amount paid — commission = this × rate
  convertedAt?: string | null
  createdAt: string
}

export interface PartnerCommission {
  id: string
  partnerId: string
  referralId: string
  period: string        // e.g. '2026-04'
  commissionType: 'initial' | 'renewal'
  amount: number
  rate: number
  status: CommissionStatus
  paidAt?: string | null
  createdAt: string
}

export interface PartnerPayout {
  id: string
  partnerId: string
  period: string
  totalAmount: number
  commissionIds: string[]
  status: PayoutStatus
  paymentReference?: string | null
  requestedAt: string
  paidAt?: string | null
}
