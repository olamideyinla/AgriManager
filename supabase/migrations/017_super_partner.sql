-- 017_super_partner.sql
-- Adds Super Partner hierarchy: parent_partner_id, recruitment codes,
-- override commissions (10% of sub-partner commissions), and RLS for network view.

-- 1a. New columns on partners
ALTER TABLE public.partners
  ADD COLUMN partner_type      text NOT NULL DEFAULT 'standard'
    CHECK (partner_type IN ('standard', 'super')),
  ADD COLUMN parent_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN recruitment_code  text UNIQUE,
  ADD COLUMN recruited_by_code text;

CREATE INDEX IF NOT EXISTS partners_parent_id_idx        ON public.partners(parent_partner_id);
CREATE INDEX IF NOT EXISTS partners_recruitment_code_idx ON public.partners(recruitment_code);

-- 1b. Extend commission_type check + add source link
ALTER TABLE public.partner_commissions
  DROP CONSTRAINT IF EXISTS partner_commissions_commission_type_check;
ALTER TABLE public.partner_commissions
  ADD CONSTRAINT partner_commissions_commission_type_check
  CHECK (commission_type IN ('initial', 'renewal', 'override'));

ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS source_commission_id uuid
    REFERENCES public.partner_commissions(id) ON DELETE SET NULL;

-- 1c. Trigger: generate recruitment_code when partner is promoted to super
--     Format: upper(first 6 alpha chars of full_name) + '-' + 2-digit random
--     e.g. "John Olawale" → JOHNOL-48
CREATE OR REPLACE FUNCTION public.generate_partner_recruitment_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  IF NEW.partner_type = 'super'
     AND (OLD.partner_type IS DISTINCT FROM 'super')
     AND NEW.recruitment_code IS NULL THEN
    NEW.recruitment_code :=
      upper(left(regexp_replace(NEW.full_name, '[^a-zA-Z]', '', 'g'), 6))
      || '-'
      || floor(random() * 90 + 10)::int::text;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_partner_recruitment_code ON public.partners;
CREATE TRIGGER trg_partner_recruitment_code
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.generate_partner_recruitment_code();

-- 1d. Trigger: create 10% override commission for super partner on each sub-partner commission
CREATE OR REPLACE FUNCTION public.partner_override_commission()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
DECLARE
  v_super_id uuid;
  v_rate     numeric(5,4) := 0.10;
BEGIN
  -- Only cascade on direct types — prevent override-of-override
  IF NEW.commission_type NOT IN ('initial', 'renewal') THEN
    RETURN NEW;
  END IF;

  SELECT parent_partner_id INTO v_super_id
    FROM public.partners WHERE id = NEW.partner_id;

  IF v_super_id IS NOT NULL THEN
    INSERT INTO public.partner_commissions
      (partner_id, referral_id, period, commission_type, amount, rate, status, source_commission_id)
    VALUES
      (v_super_id, NEW.referral_id, NEW.period, 'override',
       GREATEST(round(NEW.amount * v_rate, 2), 0.01),
       v_rate, 'pending', NEW.id);
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_partner_override_commission ON public.partner_commissions;
CREATE TRIGGER trg_partner_override_commission
  AFTER INSERT ON public.partner_commissions
  FOR EACH ROW EXECUTE FUNCTION public.partner_override_commission();

-- 1e. RLS: Super Partners can SELECT their sub-partners' partner rows
CREATE POLICY "super_partner_view_subpartners" ON public.partners
  FOR SELECT TO authenticated
  USING (
    parent_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );
