-- ============================================================
-- Migration 013 — Partner Program
-- Creates: partners, partner_referrals, partner_commissions, partner_payouts
-- Functions: generate_partner_referral_code(), record_partner_referral(),
--            partner_auto_commission()
-- ============================================================

-- ── 1. partners ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partners (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        text        NOT NULL,
  email            text        NOT NULL,
  phone            text,
  country          text        NOT NULL,
  territory        text,
  referral_code    text        UNIQUE,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','suspended','rejected')),
  tier             text        NOT NULL DEFAULT 'standard'
                               CHECK (tier IN ('standard','silver','gold')),
  notes            text,
  payment_method   text,
  payment_details  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partners_user_id_idx    ON partners(user_id);
CREATE INDEX IF NOT EXISTS partners_status_idx     ON partners(status);
CREATE INDEX IF NOT EXISTS partners_referral_code_idx ON partners(referral_code);

-- ── 2. partner_referrals ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_referrals (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        uuid        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referred_org_id   uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  referred_email    text,
  status            text        NOT NULL DEFAULT 'signup'
                               CHECK (status IN ('signup','trial','converted','churned')),
  plan_type         text        CHECK (plan_type IN ('pro_monthly','pro_annual')),
  converted_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_referrals_partner_id_idx ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS partner_referrals_org_id_idx     ON partner_referrals(referred_org_id);

-- ── 3. partner_commissions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_commissions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       uuid        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referral_id      uuid        NOT NULL REFERENCES partner_referrals(id) ON DELETE CASCADE,
  period           text        NOT NULL,   -- e.g. '2026-04'
  commission_type  text        NOT NULL CHECK (commission_type IN ('initial','renewal')),
  amount           numeric(10,2) NOT NULL,
  rate             numeric(5,4) NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','paid')),
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_commissions_partner_id_idx  ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS partner_commissions_referral_id_idx ON partner_commissions(referral_id);
CREATE INDEX IF NOT EXISTS partner_commissions_period_idx      ON partner_commissions(period);

-- ── 4. partner_payouts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_payouts (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id         uuid        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  period             text        NOT NULL,
  total_amount       numeric(10,2) NOT NULL,
  commission_ids     uuid[]      NOT NULL DEFAULT '{}',
  status             text        NOT NULL DEFAULT 'requested'
                                 CHECK (status IN ('requested','processing','paid','rejected')),
  payment_reference  text,
  requested_at       timestamptz NOT NULL DEFAULT now(),
  paid_at            timestamptz
);

CREATE INDEX IF NOT EXISTS partner_payouts_partner_id_idx ON partner_payouts(partner_id);

-- ── 5. Functions ─────────────────────────────────────────────────────────────

-- 5a. Auto-generate referral code on partner approval
CREATE OR REPLACE FUNCTION generate_partner_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate when status changes TO 'approved' and code is not yet set
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.referral_code IS NULL THEN
    NEW.referral_code :=
      upper(left(regexp_replace(NEW.full_name, '[^a-zA-Z]', '', 'g'), 4))
      || '-'
      || upper(left(regexp_replace(NEW.country, '[^a-zA-Z]', '', 'g'), 2))
      || '-'
      || floor(random() * 90 + 10)::int::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_referral_code ON partners;
CREATE TRIGGER trg_partner_referral_code
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION generate_partner_referral_code();

-- 5b. Record a referral from a farmer signup (called from client post-signup)
CREATE OR REPLACE FUNCTION record_partner_referral(
  ref_code  text,
  org_id    uuid,
  ref_email text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  -- Look up approved partner with this code
  SELECT id INTO v_partner_id
  FROM partners
  WHERE referral_code = ref_code
    AND status = 'approved'
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN;  -- Invalid or unapproved code — silently ignore
  END IF;

  -- Don't double-record the same org
  IF EXISTS (
    SELECT 1 FROM partner_referrals
    WHERE partner_id = v_partner_id AND referred_org_id = org_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO partner_referrals (
    partner_id, referred_org_id, referred_email, status
  ) VALUES (
    v_partner_id, org_id, ref_email, 'signup'
  );
END;
$$;

-- 5c. Auto-create commission row when referral is marked 'converted'
CREATE OR REPLACE FUNCTION partner_auto_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_amount  numeric(10,2);
  v_period  text;
BEGIN
  IF NEW.status = 'converted' AND OLD.status != 'converted' THEN
    -- Commission amount based on plan type (30% of plan price)
    v_amount := CASE
      WHEN NEW.plan_type = 'pro_annual'  THEN 25.80
      ELSE 2.70  -- pro_monthly default
    END;

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
      0.30,
      'pending'
    );
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_auto_commission ON partner_referrals;
CREATE TRIGGER trg_partner_auto_commission
  BEFORE UPDATE ON partner_referrals
  FOR EACH ROW
  EXECUTE FUNCTION partner_auto_commission();

-- ── 6. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE partners           ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts    ENABLE ROW LEVEL SECURITY;

-- partners: own row
CREATE POLICY "partners_select_own" ON partners
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "partners_insert_own" ON partners
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "partners_update_own" ON partners
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- partner_referrals: via partner_id → partners.user_id
CREATE POLICY "partner_referrals_select_own" ON partner_referrals
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- partner_commissions: via partner_id
CREATE POLICY "partner_commissions_select_own" ON partner_commissions
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- partner_payouts: own
CREATE POLICY "partner_payouts_select_own" ON partner_payouts
  FOR SELECT TO authenticated
  USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_payouts_insert_own" ON partner_payouts
  FOR INSERT TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- Admin bypass (same email pattern as existing admin policies)
CREATE POLICY "admin_partners_all" ON partners
  FOR ALL TO authenticated
  USING (auth.email() = 'olamide.eyinla@gmail.com')
  WITH CHECK (auth.email() = 'olamide.eyinla@gmail.com');

CREATE POLICY "admin_partner_referrals_all" ON partner_referrals
  FOR ALL TO authenticated
  USING (auth.email() = 'olamide.eyinla@gmail.com')
  WITH CHECK (auth.email() = 'olamide.eyinla@gmail.com');

CREATE POLICY "admin_partner_commissions_all" ON partner_commissions
  FOR ALL TO authenticated
  USING (auth.email() = 'olamide.eyinla@gmail.com')
  WITH CHECK (auth.email() = 'olamide.eyinla@gmail.com');

CREATE POLICY "admin_partner_payouts_all" ON partner_payouts
  FOR ALL TO authenticated
  USING (auth.email() = 'olamide.eyinla@gmail.com')
  WITH CHECK (auth.email() = 'olamide.eyinla@gmail.com');
