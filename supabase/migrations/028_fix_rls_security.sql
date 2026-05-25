-- ── Migration 028: Enable RLS on reference tables and recurring_transactions ──
-- Fixes Supabase Security Advisor "RLS Disabled in Public" warnings for:
--   1. public.breed_standards
--   2. public.default_alert_thresholds
--   3. public.recurring_transactions

-- ── 1. breed_standards ───────────────────────────────────────────────────────
-- Reference/seed data: any authenticated user may read; no writes via API.

ALTER TABLE public.breed_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "breed_standards_select"
  ON public.breed_standards
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── 2. default_alert_thresholds ──────────────────────────────────────────────
-- Reference/seed data: any authenticated user may read; no writes via API.

ALTER TABLE public.default_alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "default_alert_thresholds_select"
  ON public.default_alert_thresholds
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── 3. recurring_transactions ─────────────────────────────────────────────────
-- Ensure RLS is active and the org-scoped policy exists.
-- (Migration 021 defined these, but this re-applies them idempotently.)

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'recurring_transactions'
      AND policyname = 'org_members_recurring'
  ) THEN
    CREATE POLICY "org_members_recurring"
      ON public.recurring_transactions
      USING (organization_id::UUID = public.get_user_org_id());
  END IF;
END;
$$;
