-- ============================================================
-- Migration 016 — Partner-Referred 30-Day Pro Trial
--
-- Problem: record_partner_referral() creates a referral row but
--   never grants the referred farmer a Pro trial, so the toolkit
--   promise of "30 days free Pro" was not actually fulfilled.
--
-- Fix:
--   1. Add 'trial' to subscriptions.status allowed values.
--   2. Rewrite record_partner_referral() to also upsert a trial
--      subscription for the referred org (ON CONFLICT DO NOTHING
--      so paid subscribers are never downgraded).
--
-- Expiry behaviour (no code change required):
--   subscription-store.ts already does:
--     isExpired = expires_at < now AND status != 'active'
--   A 'trial' row past expires_at satisfies both conditions →
--   farmer is automatically downgraded to free.
-- ============================================================

-- 1. Drop the existing status constraint and re-add with 'trial'
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'expired', 'cancelled', 'grace', 'trial'));

-- 2. Replace record_partner_referral — now also grants trial
CREATE OR REPLACE FUNCTION public.record_partner_referral(
  ref_code  text,
  org_id    uuid,
  ref_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  -- Look up the approved partner by referral code
  SELECT id INTO v_partner_id
    FROM public.partners
   WHERE referral_code = ref_code
     AND status = 'approved'
   LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN;   -- unknown / unapproved ref code — silent no-op
  END IF;

  -- Insert referral row (idempotent — ignore if already exists)
  INSERT INTO public.partner_referrals
    (partner_id, referred_org_id, referred_email, status)
  VALUES
    (v_partner_id, org_id, ref_email, 'signup')
  ON CONFLICT (partner_id, referred_org_id) DO NOTHING;

  -- Grant a 30-day Pro trial to the referred organisation.
  -- ON CONFLICT DO NOTHING: never overwrite an existing paid subscription.
  INSERT INTO public.subscriptions
    (organization_id, tier, billing_period, status, expires_at)
  VALUES
    (org_id, 'pro', NULL, 'trial', now() + interval '30 days')
  ON CONFLICT (organization_id) DO NOTHING;
END;
$$;
