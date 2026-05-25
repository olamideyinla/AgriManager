-- ── Migration 030: Fix remaining Security Advisor warnings ──────────────────
--
-- Fixes:
--   1. public.set_updated_at — Function Search Path Mutable
--      (exists in DB but was never in a migration file)
--   2. "Public Can Execute SECURITY DEFINER" — REVOKE FROM PUBLIC was not
--      sufficient; Supabase also holds a direct grant on the anon role.
--      Explicit REVOKE FROM anon clears the remaining warnings.
--
-- Cannot fix (intentional / unavoidable):
--   • "Signed-In Users Can Execute" — authenticated users MUST be able to call
--     these SECURITY DEFINER functions for RLS policies to evaluate correctly.
--     Revoking from authenticated would break all row-level security.
--   • contact_messages "RLS Policy Always True" — anonymous contact form has
--     no org context; WITH CHECK (true) is the only option.
--   • "Leaked Password Protection Disabled" — enable in the Supabase Dashboard:
--     Authentication → Settings → Password → Enable Leaked Password Protection.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Fix set_updated_at (missing SET search_path = public)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Explicitly REVOKE FROM anon for all SECURITY DEFINER functions
--    (clears the "Public Can Execute" warnings)
-- ════════════════════════════════════════════════════════════════════════════

-- Trigger-only functions — no role should call these directly
REVOKE EXECUTE ON FUNCTION public.update_updated_at()                FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()                FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_server_updated_at()         FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_server_updated_at()         FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()             FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()             FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_partner_referral_code()   FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_partner_referral_code()   FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_auto_commission()          FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_auto_commission()          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_partner_recruitment_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_partner_recruitment_code() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_override_commission()      FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_override_commission()      FROM authenticated;

-- API / RLS functions — revoke from anon only; authenticated must keep access
REVOKE EXECUTE ON FUNCTION public.get_user_role()                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_org_id()                            FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_infra_ids()                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_location_ids()                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_enterprise(UUID)             FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_enterprise_weekly_summary(UUID, DATE, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_farm_financial_summary(UUID, DATE, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sync_batch(TEXT, TIMESTAMPTZ, INT)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_partner_id()                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_partner_referral(TEXT, UUID, TEXT)    FROM anon;
