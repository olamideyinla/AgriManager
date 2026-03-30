-- Admin policies: allow the admin email to read all users and organizations
-- across every organization (bypasses the per-org RLS restriction).

create policy "admin select app_users"
  on public.app_users
  for select
  to authenticated
  using (auth.email() = 'olamide.eyinla@gmail.com');

create policy "admin select organizations"
  on public.organizations
  for select
  to authenticated
  using (auth.email() = 'olamide.eyinla@gmail.com');
