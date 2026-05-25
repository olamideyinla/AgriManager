-- ── Migration 029b: Patch — complete the remaining steps from 029 ─────────────
-- The upsert_sync_record function does not exist in production (003_functions.sql
-- was never applied), so its REVOKE was skipped. This patch runs everything that
-- came after that failing line.

-- ── Remaining REVOKE / GRANT from Part B ─────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_my_partner_id()                       FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_my_partner_id()                       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_partner_referral(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.record_partner_referral(TEXT, UUID, TEXT) TO authenticated;

-- ── Part C: RLS Policy Always True — tighten team_invites policies ────────────

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
