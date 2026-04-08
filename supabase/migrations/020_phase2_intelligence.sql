-- ── Phase 2: Feed & Cost Intelligence + Animal Registry + Budget & Targets ─────

-- ── animal_records ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.animal_records (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  tag_id                 text NOT NULL,
  name                   text,
  sex                    text NOT NULL DEFAULT 'unknown',
  birth_date             date,
  dam_id                 uuid REFERENCES public.animal_records(id) ON DELETE SET NULL,
  sire_id                uuid REFERENCES public.animal_records(id) ON DELETE SET NULL,
  breed_or_strain        text,
  acquisition_date       date NOT NULL,
  acquisition_cost_cents integer,
  status                 text NOT NULL DEFAULT 'active',
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.animal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.animal_records
  USING (organization_id = public.get_user_org_id());
CREATE INDEX IF NOT EXISTS animal_records_enterprise_status_idx
  ON public.animal_records(enterprise_instance_id, status);

-- ── animal_weight_entries ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.animal_weight_entries (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id              uuid NOT NULL REFERENCES public.animal_records(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date                   date NOT NULL,
  weight_kg              numeric(8,3) NOT NULL,
  body_condition_score   numeric(3,1),
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.animal_weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.animal_weight_entries
  USING (organization_id = public.get_user_org_id());
CREATE INDEX IF NOT EXISTS animal_weight_entries_animal_date_idx
  ON public.animal_weight_entries(animal_id, date);

-- ── animal_events ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.animal_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id              uuid NOT NULL REFERENCES public.animal_records(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date                   date NOT NULL,
  event_type             text NOT NULL,
  description            text,
  amount_cents           integer,
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.animal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.animal_events
  USING (organization_id = public.get_user_org_id());
CREATE INDEX IF NOT EXISTS animal_events_animal_date_idx
  ON public.animal_events(animal_id, date);

-- ── enterprise_budgets ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.enterprise_budgets (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_instance_id   uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  organization_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_type              text NOT NULL DEFAULT 'batch',
  period_label             text NOT NULL,
  revenue_target_cents     integer NOT NULL DEFAULT 0,
  total_cost_budget_cents  integer NOT NULL DEFAULT 0,
  feed_cost_budget_cents   integer,
  labor_cost_budget_cents  integer,
  medication_budget_cents  integer,
  other_cost_budget_cents  integer,
  notes                    text,
  sync_status              text NOT NULL DEFAULT 'pending',
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);
ALTER TABLE public.enterprise_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.enterprise_budgets
  USING (organization_id = public.get_user_org_id());
CREATE INDEX IF NOT EXISTS enterprise_budgets_enterprise_period_idx
  ON public.enterprise_budgets(enterprise_instance_id, period_type);
