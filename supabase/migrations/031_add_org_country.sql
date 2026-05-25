-- ── Migration 031: Add country column to organizations ───────────────────────
-- Stores the CURRENCY_MAP country key (e.g. 'NG', 'KE') on the org record.
-- Country is selected during signup and is the single source of truth for
-- determining the org's currency across the entire PWA.
-- Existing rows keep their current currency; country will be NULL until
-- users sign up through the updated flow.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS country TEXT;
