-- ── Phase 1: Better Basic Records ─────────────────────────────────────────────

-- Extend layer_daily_records with optional egg grading columns
ALTER TABLE public.layer_daily_records
  ADD COLUMN IF NOT EXISTS egg_grade_a integer,
  ADD COLUMN IF NOT EXISTS egg_grade_b integer,
  ADD COLUMN IF NOT EXISTS egg_grade_c integer;

-- ── batch_closeouts ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.batch_closeouts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  closeout_date          date NOT NULL,
  total_days             integer NOT NULL,
  final_count            integer NOT NULL,
  total_deaths           integer NOT NULL DEFAULT 0,
  mortality_rate         numeric(5,2) NOT NULL DEFAULT 0,
  total_eggs_produced    integer,
  total_feed_consumed_kg numeric(10,2),
  avg_fcr                numeric(5,3),
  total_revenue_cents    integer NOT NULL DEFAULT 0,
  total_feed_cost_cents  integer NOT NULL DEFAULT 0,
  net_profit_cents       integer NOT NULL DEFAULT 0,
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.batch_closeouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.batch_closeouts
  USING (organization_id = public.get_user_org_id());

-- ── thinning_records ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.thinning_records (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  date                   date NOT NULL,
  count                  integer NOT NULL,
  avg_weight_kg          numeric(6,3),
  reason                 text,
  disposal               text NOT NULL DEFAULT 'sold',
  proceeds_amount_cents  integer NOT NULL DEFAULT 0,
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.thinning_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.thinning_records
  USING (organization_id = public.get_user_org_id());

-- ── placement_records ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.placement_records (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  placement_date         date NOT NULL,
  count                  integer NOT NULL,
  source                 text,
  supplier               text,
  unit_cost_cents        integer NOT NULL DEFAULT 0,
  total_cost_cents       integer NOT NULL DEFAULT 0,
  avg_initial_weight_g   numeric(7,1),
  breed_or_strain        text,
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.placement_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.placement_records
  USING (organization_id = public.get_user_org_id());

-- ── fish_stocking_records ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fish_stocking_records (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  stocking_date          date NOT NULL,
  species                text,
  count                  integer NOT NULL,
  avg_weight_g           numeric(7,1),
  source                 text,
  supplier               text,
  price_per_kg_cents     integer NOT NULL DEFAULT 0,
  total_cost_cents       integer NOT NULL DEFAULT 0,
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.fish_stocking_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.fish_stocking_records
  USING (organization_id = public.get_user_org_id());

-- ── litter_condition_logs ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.litter_condition_logs (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  date                   date NOT NULL,
  condition              text NOT NULL,
  ammonia_level          text,
  action                 text NOT NULL DEFAULT 'none',
  material_added         text,
  material_amount_kg     numeric(8,2),
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.litter_condition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.litter_condition_logs
  USING (organization_id = public.get_user_org_id());

-- ── soil_test_records ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.soil_test_records (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  test_date              date NOT NULL,
  lab                    text,
  ph                     numeric(4,2),
  nitrogen_kg_ha         numeric(8,2),
  phosphorus_kg_ha       numeric(8,2),
  potassium_kg_ha        numeric(8,2),
  organic_matter_pct     numeric(5,2),
  recommendation         text,
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.soil_test_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.soil_test_records
  USING (organization_id = public.get_user_org_id());

-- ── post_harvest_records ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.post_harvest_records (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id uuid NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  date                   date NOT NULL,
  total_harvest_kg       numeric(10,2) NOT NULL,
  grade_a_kg             numeric(10,2),
  grade_b_kg             numeric(10,2),
  grade_c_kg             numeric(10,2),
  stored_kg              numeric(10,2),
  sold_kg                numeric(10,2),
  waste_kg               numeric(10,2),
  storage_location       text,
  storage_method         text,
  processing_method      text,
  notes                  text,
  sync_status            text NOT NULL DEFAULT 'pending',
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.post_harvest_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_access" ON public.post_harvest_records
  USING (organization_id = public.get_user_org_id());
