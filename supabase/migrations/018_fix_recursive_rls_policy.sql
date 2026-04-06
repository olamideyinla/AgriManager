-- 018_fix_recursive_rls_policy.sql
-- Fixes infinite recursion in "super_partner_view_subpartners" policy.
-- The original policy queried partners inside a partners policy → loop.
-- Solution: SECURITY DEFINER function bypasses RLS for the id lookup.

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "super_partner_view_subpartners" ON public.partners;

-- 2. Create a security-definer helper that looks up the caller's partner id
--    without triggering RLS (runs as the function owner, not the caller).
CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 3. Recreate the policy using the helper — no self-referencing subquery
CREATE POLICY "super_partner_view_subpartners" ON public.partners
  FOR SELECT TO authenticated
  USING (
    parent_partner_id = public.get_my_partner_id()
  );
