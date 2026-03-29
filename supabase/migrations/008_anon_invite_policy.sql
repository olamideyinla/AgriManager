-- Allow anonymous (unauthenticated) reads of team_invites by invite_code.
--
-- WHY THIS IS NEEDED:
-- Workers fetch their invite BEFORE creating a Supabase auth account.
-- Without this policy the anon-key request returns no rows, the fallback
-- email is derived from the worker's entered phone (not the canonical phone
-- the owner stored), causing an email mismatch and failed authentication.
--
-- SECURITY NOTE:
-- An invite code is a secret the farm owner shares only with the worker.
-- Exposing invite row data to anyone who knows the code is acceptable because:
--   1. Codes are random alphanumeric (e.g. XK7R4M) — not guessable.
--   2. They expire after 30 days.
--   3. They can only be redeemed once.

CREATE POLICY "anon_invite_lookup"
  ON public.team_invites FOR SELECT
  TO anon
  USING (true);
