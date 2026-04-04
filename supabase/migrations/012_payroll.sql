-- ── Payroll module tables ──────────────────────────────────────────────────────
-- Migration 012: payroll_settings, worker_payroll_profiles, payroll_runs,
--                payslip_records, remittance_obligations

-- ── payroll_settings ──────────────────────────────────────────────────────────

create table if not exists public.payroll_settings (
  id                        uuid primary key,
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  country_code              text not null default 'NG',
  is_registered_employer    boolean not null default false,
  employer_tax_id           text,
  pension_enrolled          boolean not null default true,
  pfa_name                  text,
  pfa_account_number        text,
  state_of_operation        text,
  nhf_enrolled              boolean not null default false,
  nhis_enrolled             boolean not null default false,
  pay_day                   integer not null default 25 check (pay_day between 1 and 28),
  payroll_rate_overrides    jsonb not null default '[]',
  default_salary_structure  jsonb,
  sync_status               text not null default 'synced',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create unique index if not exists payroll_settings_org_idx
  on public.payroll_settings (organization_id);

alter table public.payroll_settings enable row level security;

create policy "payroll_settings org member"
  on public.payroll_settings
  for all
  to authenticated
  using (organization_id = get_user_org_id())
  with check (organization_id = get_user_org_id());

-- ── worker_payroll_profiles ───────────────────────────────────────────────────

create table if not exists public.worker_payroll_profiles (
  id                        uuid primary key,
  worker_id                 uuid not null,
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  salary_type               text not null check (salary_type in ('monthly', 'daily')),
  gross_monthly_salary      numeric,
  daily_rate                numeric,
  salary_structure          jsonb not null default '{}',
  tax_id                    text,
  annual_rent_paid          numeric,
  has_rent_documentation    boolean not null default false,
  pension_applicable        boolean not null default true,
  pension_pin               text,
  nhf_applicable            boolean not null default false,
  nhis_applicable           boolean not null default false,
  life_insurance_premium    numeric,
  other_deductions          jsonb not null default '[]',
  bank_name                 text,
  bank_account_number       text,
  start_date                date not null,
  sync_status               text not null default 'synced',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists worker_payroll_profiles_org_idx
  on public.worker_payroll_profiles (organization_id);
create unique index if not exists worker_payroll_profiles_worker_idx
  on public.worker_payroll_profiles (worker_id);

alter table public.worker_payroll_profiles enable row level security;

create policy "worker_payroll_profiles org member"
  on public.worker_payroll_profiles
  for all
  to authenticated
  using (organization_id = get_user_org_id())
  with check (organization_id = get_user_org_id());

-- ── payroll_runs ──────────────────────────────────────────────────────────────

create table if not exists public.payroll_runs (
  id                          uuid primary key,
  organization_id             uuid not null references public.organizations(id) on delete cascade,
  period                      text not null,   -- YYYY-MM
  status                      text not null check (status in ('draft', 'approved', 'paid')),
  run_date                    date not null,
  approved_by                 text,
  approved_at                 timestamptz,
  total_gross_pay             numeric not null default 0,
  total_net_pay               numeric not null default 0,
  total_employee_deductions   numeric not null default 0,
  total_employer_costs        numeric not null default 0,
  total_paye                  numeric not null default 0,
  total_pension               numeric not null default 0,
  worker_count                integer not null default 0,
  country_code                text not null,
  profile_version_date        text not null,
  notes                       text,
  sync_status                 text not null default 'synced',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (organization_id, period)
);

create index if not exists payroll_runs_org_period_idx
  on public.payroll_runs (organization_id, period desc);

alter table public.payroll_runs enable row level security;

create policy "payroll_runs org member"
  on public.payroll_runs
  for all
  to authenticated
  using (organization_id = get_user_org_id())
  with check (organization_id = get_user_org_id());

-- ── payslip_records ───────────────────────────────────────────────────────────

create table if not exists public.payslip_records (
  id                        uuid primary key,
  payroll_run_id            uuid not null references public.payroll_runs(id) on delete cascade,
  worker_id                 uuid not null,
  worker_name               text not null,
  period                    text not null,
  earnings                  jsonb not null default '[]',
  deductions                jsonb not null default '[]',
  employer_contributions    jsonb not null default '[]',
  gross_pay                 numeric not null default 0,
  total_deductions          numeric not null default 0,
  net_pay                   numeric not null default 0,
  total_employer_cost       numeric not null default 0,
  taxable_income            numeric not null default 0,
  applied_reliefs           jsonb not null default '[]',
  assumptions               jsonb not null default '[]',
  sync_status               text not null default 'synced',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists payslip_records_run_idx
  on public.payslip_records (payroll_run_id);
create index if not exists payslip_records_worker_period_idx
  on public.payslip_records (worker_id, period);

alter table public.payslip_records enable row level security;

-- Payslips inherit org access via the payroll_run
create policy "payslip_records via run"
  on public.payslip_records
  for all
  to authenticated
  using (
    payroll_run_id in (
      select id from public.payroll_runs
      where organization_id = get_user_org_id()
    )
  )
  with check (
    payroll_run_id in (
      select id from public.payroll_runs
      where organization_id = get_user_org_id()
    )
  );

-- ── remittance_obligations ────────────────────────────────────────────────────

create table if not exists public.remittance_obligations (
  id                    uuid primary key,
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  period                text not null,
  deduction_type        text not null,
  deduction_name        text not null,
  total_amount          numeric not null default 0,
  due_date              date not null,
  remittance_to         text not null,
  status                text not null check (status in ('pending', 'remitted', 'overdue')),
  remitted_date         date,
  remitted_amount       numeric,
  remitted_reference    text,
  notes                 text,
  sync_status           text not null default 'synced',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists remittance_obligations_org_period_idx
  on public.remittance_obligations (organization_id, period desc);
create index if not exists remittance_obligations_status_idx
  on public.remittance_obligations (organization_id, status);

alter table public.remittance_obligations enable row level security;

create policy "remittance_obligations org member"
  on public.remittance_obligations
  for all
  to authenticated
  using (organization_id = get_user_org_id())
  with check (organization_id = get_user_org_id());

-- ── updated_at triggers ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'payroll_settings','worker_payroll_profiles','payroll_runs',
    'payslip_records','remittance_obligations'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t
    );
  end loop;
exception when duplicate_object then null;
end $$;
