-- ============================================================
-- Migration 014 — Commission Percentage Fix
-- Changes: commission is now calculated as subscription_amount × rate
--          instead of hardcoded USD amounts.
-- ============================================================

-- Add subscription_amount to partner_referrals
-- This records the actual amount the farmer paid when they converted.
ALTER TABLE partner_referrals
  ADD COLUMN IF NOT EXISTS subscription_amount numeric(10,2);

-- Replace the auto-commission trigger function
-- Now uses: amount = subscription_amount * rate
-- Rate is 0.30 (30%) for initial conversions.
-- Falls back to plan-type defaults only when subscription_amount is NULL
-- (for backwards compatibility with rows created before this migration).
CREATE OR REPLACE FUNCTION partner_auto_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_rate   numeric(5,4) := 0.30;
  v_amount numeric(10,2);
  v_period text;
BEGIN
  IF NEW.status = 'converted' AND OLD.status != 'converted' THEN

    IF NEW.subscription_amount IS NOT NULL AND NEW.subscription_amount > 0 THEN
      -- Percentage of the actual subscription amount paid
      v_amount := round(NEW.subscription_amount * v_rate, 2);
    ELSE
      -- Fallback to plan-type defaults (30% of standard prices)
      v_amount := CASE
        WHEN NEW.plan_type = 'pro_annual' THEN 25.80   -- 30% of $86
        ELSE 2.70                                       -- 30% of $9
      END;
    END IF;

    v_period := to_char(now(), 'YYYY-MM');

    INSERT INTO partner_commissions (
      partner_id,
      referral_id,
      period,
      commission_type,
      amount,
      rate,
      status
    ) VALUES (
      NEW.partner_id,
      NEW.id,
      v_period,
      'initial',
      v_amount,
      v_rate,
      'pending'
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
