-- ── Migration 029: Fix Supabase Security Advisor Warnings ───────────────────
-- Addresses 39 warnings across three categories:
--
--   A. Function Search Path Mutable
--        → Recreate all functions with SET search_path = public
--   B. Public / Signed-In Users Can Execute SECURITY DEFINER
--        → REVOKE EXECUTE FROM PUBLIC; GRANT to authenticated only
--   C. RLS Policy Always True
--        → Tighten team_invites insert / update WITH CHECK clauses
--
-- NOTE: Two "always true" policies are intentionally left as-is because
-- they cannot be made more specific without breaking app functionality:
--   • team_invites.anon_invite_lookup  USING (true)   — anon invite redemption flow
--   • contact_messages."anon insert"   WITH CHECK (true) — public contact form

-- ════════════════════════════════════════════════════════════════════════════
-- A. FUNCTION SEARCH PATH MUTABLE
-- ════════════════════════════════════════════════════════════════════════════

-- ── Timestamp trigger helpers ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_server_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.server_updated_at = now();
  RETURN NEW;
END;
$$;

-- ── RLS helper functions (002_rls_policies.sql) ──────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM app_users
  WHERE id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM app_users
  WHERE id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_infra_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assigned_infrastructure_ids
  FROM app_users
  WHERE id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_location_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assigned_farm_location_ids
  FROM app_users
  WHERE id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_enterprise(p_enterprise_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enterprise_instances ei
    JOIN infrastructures inf ON inf.id = ei.infrastructure_id
    JOIN farm_locations fl   ON fl.id  = inf.farm_location_id
    JOIN app_users au        ON au.id  = auth.uid()
    WHERE ei.id = p_enterprise_id
      AND au.organization_id = fl.organization_id
      AND au.is_active = TRUE
      AND (
        au.role IN ('owner')
        OR (
          au.role = 'manager' AND (
            array_length(au.assigned_farm_location_ids, 1) IS NULL
            OR fl.id = ANY(au.assigned_farm_location_ids)
          )
        )
        OR (
          au.role IN ('supervisor', 'worker') AND
          inf.id = ANY(au.assigned_infrastructure_ids)
        )
        OR au.role = 'viewer'
      )
  );
$$;

-- ── Partner trigger functions ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_partner_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (OLD.status IS DISTINCT FROM 'approved')
     AND NEW.referral_code IS NULL THEN
    NEW.referral_code :=
      upper(left(regexp_replace(NEW.full_name, '[^a-zA-Z]', '', 'g'), 4))
      || '-'
      || upper(left(regexp_replace(NEW.country,    '[^a-zA-Z]', '', 'g'), 2))
      || '-'
      || floor(random() * 90 + 10)::int::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Latest version: 20% rate, NGN fallback defaults (from 015_commission_rate_20pct.sql)
CREATE OR REPLACE FUNCTION public.partner_auto_commission()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_rate   numeric(5,4) := 0.20;
  v_amount numeric(10,2);
  v_period text;
BEGIN
  IF NEW.status = 'converted' AND OLD.status != 'converted' THEN
    IF NEW.subscription_amount IS NOT NULL AND NEW.subscription_amount > 0 THEN
      v_amount := round(NEW.subscription_amount * v_rate, 2);
    ELSE
      v_amount := CASE
        WHEN NEW.plan_type = 'pro_annual' THEN 24000.00
        ELSE 3000.00
      END;
    END IF;
    v_period := to_char(now(), 'YYYY-MM');
    INSERT INTO partner_commissions
      (partner_id, referral_id, period, commission_type, amount, rate, status)
    VALUES
      (NEW.partner_id, NEW.id, v_period, 'initial', v_amount, v_rate, 'pending');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Latest version from 026_fix_partner_schema.sql
CREATE OR REPLACE FUNCTION public.generate_partner_recruitment_code()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Latest version from 026_fix_partner_schema.sql
CREATE OR REPLACE FUNCTION public.partner_override_commission()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_super_id UUID;
  v_rate     NUMERIC(5,4) := 0.10;
BEGIN
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
$$;

-- Latest version from 027_fix_partners_rls_recursion.sql
CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- B. REVOKE PUBLIC EXECUTE — GRANT TO authenticated ONLY
-- ════════════════════════════════════════════════════════════════════════════

-- Trigger functions: called by PG trigger system only, no user EXECUTE needed
REVOKE EXECUTE ON FUNCTION public.update_updated_at()                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_server_updated_at()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_partner_referral_code()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.partner_auto_commission()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_partner_recruitment_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.partner_override_commission()      FROM PUBLIC;

-- API / RLS functions: authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_user_role()                         FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_role()                         TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_org_id()                       FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_org_id()                       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_infra_ids()                    FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_infra_ids()                    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_location_ids()                 FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_location_ids()                 TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_can_access_enterprise(UUID)        FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.user_can_access_enterprise(UUID)        TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_enterprise_weekly_summary(UUID, DATE, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_enterprise_weekly_summary(UUID, DATE, DATE) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_farm_financial_summary(UUID, DATE, DATE)    FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_farm_financial_summary(UUID, DATE, DATE)    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_sync_batch(TEXT, TIMESTAMPTZ, INT)         FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_sync_batch(TEXT, TIMESTAMPTZ, INT)         TO authenticated;

REVOKE EXECUTE ON FUNCTION public.upsert_sync_record(TEXT, JSONB)                FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.upsert_sync_record(TEXT, JSONB)                TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_partner_id()                            FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_my_partner_id()                            TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_partner_referral(TEXT, UUID, TEXT)      FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.record_partner_referral(TEXT, UUID, TEXT)      TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- C. RLS POLICY ALWAYS TRUE — tighten team_invites policies
-- ════════════════════════════════════════════════════════════════════════════

-- invite_insert: was WITH CHECK (true) — now scoped to the caller's org
DROP POLICY IF EXISTS "invite_insert" ON public.team_invites;
CREATE POLICY "invite_insert"
  ON public.team_invites FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id());

-- invite_update: was WITH CHECK (true) — now ensures row stays in caller's org
--                or is being redeemed by the current user
DROP POLICY IF EXISTS "invite_update" ON public.team_invites;
CREATE POLICY "invite_update"
  ON public.team_invites FOR UPDATE
  TO authenticated
  USING (redeemed_at IS NULL)
  WITH CHECK (
    organization_id = public.get_user_org_id()
    OR redeemed_by = auth.uid()
  );
