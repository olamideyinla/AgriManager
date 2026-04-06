-- ============================================================
-- Migration 015 — Commission Rate Update
-- Changes: initial commission rate lowered from 30% → 20%
--          renewal commission rate is 10% (handled separately
--          when admin marks a commission as 'renewal' type)
-- Fallback defaults updated to reflect NGN pricing:
--   pro_monthly = ₦15,000 × 20% = ₦3,000
--   pro_annual  = ₦120,000 × 20% = ₦24,000
-- ============================================================

CREATE OR REPLACE FUNCTION partner_auto_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_rate   numeric(5,4) := 0.20;   -- 20% initial commission
  v_amount numeric(10,2);
  v_period text;
BEGIN
  IF NEW.status = 'converted' AND OLD.status != 'converted' THEN

    IF NEW.subscription_amount IS NOT NULL AND NEW.subscription_amount > 0 THEN
      -- Percentage of the actual subscription amount paid
      v_amount := round(NEW.subscription_amount * v_rate, 2);
    ELSE
      -- Fallback to plan-type defaults (20% of NGN standard prices)
      v_amount := CASE
        WHEN NEW.plan_type = 'pro_annual' THEN 24000.00   -- 20% of ₦120,000
        ELSE 3000.00                                       -- 20% of ₦15,000
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
