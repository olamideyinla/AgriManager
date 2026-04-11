-- 027_fix_partners_rls_recursion.sql
-- Migration 026 accidentally re-introduced the recursive partners policy
-- that 018_fix_recursive_rls_policy.sql had already fixed.
-- This restores the SECURITY DEFINER approach so the admin page can load.

-- Re-ensure the helper function exists (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Drop the recursive policy added by migration 026
DROP POLICY IF EXISTS "super_partner_view_subpartners" ON public.partners;

-- Recreate with non-recursive helper
CREATE POLICY "super_partner_view_subpartners" ON public.partners
  FOR SELECT TO authenticated
  USING (
    parent_partner_id = public.get_my_partner_id()
  );
