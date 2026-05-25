-- =============================================================
-- MSP Sport Science — Full Database Schema
-- Run this in Supabase SQL Editor (in order)
-- =============================================================


-- =============================================================
-- 1. PROFILES (extends auth.users)
-- =============================================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text check (role in ('superadmin', 'admin', 'coach', 'physio', 'psikologis', 'penolong_pegawai', 'pegawai_belia_sukan')) not null default 'admin',
  module_permissions jsonb default '{
    "athletes": {"read": true, "create": true, "update": true, "delete": true},
    "strength": {"read": false, "create": false, "update": false, "delete": false},
    "fitness": {"read": false, "create": false, "update": false, "delete": false},
    "fitness_config": {"read": false, "create": false, "update": false, "delete": false},
    "inbody": {"read": false, "create": false, "update": false, "delete": false},
    "supplement": {"read": false, "create": false, "update": false, "delete": false},
    "physio": {"read": false, "create": false, "update": false, "delete": false},
    "physio_cases": {"read": false, "create": false, "update": false, "delete": false},
    "psychology": {"read": false, "create": false, "update": false, "delete": false},
    "reports": {"read": true, "create": false, "update": false, "delete": false},
    "supplement_coordinator": false,
    "supplement_supporter": false,
    "supplement_approver": false
  }'::jsonb,
  created_at timestamptz default now()
);

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- =============================================================
-- 2. ATHLETES
-- =============================================================
create table athletes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  ic_number text unique not null,
  sport text not null,
  category text,
  coach_id uuid references profiles(id),
  school text,
  training_centre text,
  weight numeric,
  height numeric,
  championship_year int,
  status text check (status in ('active', 'rest', 'injured')) default 'active',
  created_at timestamptz default now()
);


-- =============================================================
-- 3. FITNESS TESTS
-- =============================================================
create table fitness_tests (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references athletes(id) on delete cascade not null,
  phase int check (phase in (1, 2, 3, 4)) not null,
  year int not null,
  -- Muscular Endurance
  push_up int,
  squat_endurance int,
  sit_up int,
  plank_sec int,           -- in seconds
  pull_up int,
  -- Power
  standing_broad_jump numeric,  -- cm
  counter_movement_jump numeric, -- cm
  squat_fatigue int,
  medicine_ball_throw numeric,  -- m
  -- Strength
  back_strength numeric,        -- kg
  handgrip numeric,             -- kg
  -- Flexibility
  sit_and_reach numeric,        -- cm
  -- Agility
  t_test numeric,               -- seconds
  hexagon_agility numeric,      -- seconds
  cod_dribble numeric,          -- seconds
  -- Speed
  sprint_20m numeric,           -- seconds
  sprint_40m numeric,           -- seconds
  -- Cardiovascular
  bleep_test numeric,           -- level
  yoyo_test numeric,            -- metres
  run_2400m int,                -- seconds
  -- Coordination
  wall_toss int,                -- catches
  -- Balance
  stock_balance numeric,        -- seconds
  -- Martial Arts (Power Kube)
  cross_punch_power numeric,
  cross_punch_speed numeric,    -- seconds
  roundhouse_kick_speed numeric, -- seconds
  recorded_by uuid references profiles(id),
  is_draft boolean default false,
  created_at timestamptz default now(),
  unique (athlete_id, session, year)
);


-- =============================================================
-- 3.5 FITNESS TEST DEFINITIONS (NEW FLEXIBLE SYSTEM)
-- =============================================================
create table fitness_test_definitions (
  id uuid default gen_random_uuid() primary key,
  test_name text not null unique,
  category text not null,           -- muscular_endurance, power, strength, flexibility, agility, speed, cardiovascular, coordination, balance, martial_arts
  unit text not null,               -- reps, cm, seconds, kg, m, level, meter
  description text,
  created_at timestamptz default now()
);

-- Norms table: store gender-specific norms for each test
create table fitness_test_norms (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references fitness_test_definitions(id) on delete cascade not null,
  gender text check (gender in ('M', 'F', 'both')) not null,
  good_min numeric,                 -- good threshold (inclusive)
  good_max numeric,
  average_min numeric,              -- average threshold
  average_max numeric,
  poor_min numeric,                 -- poor threshold
  poor_max numeric,
  rating_direction text check (rating_direction in ('higher_is_better', 'lower_is_better')) not null,
  created_at timestamptz default now(),
  unique (test_id, gender)
);

-- Sport-Test Mapping: which tests apply to each sport (coaches can customize)
create table sport_fitness_tests (
  id uuid default gen_random_uuid() primary key,
  sport text not null,
  test_id uuid references fitness_test_definitions(id) on delete cascade not null,
  is_mandatory boolean default false,
  custom_name text,                 -- allow custom naming per sport
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (sport, test_id)
);

-- Test Sessions: group test results by athlete, session, and date
create table fitness_test_sessions (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references athletes(id) on delete cascade not null,
  session text check (session in ('Fasa 1', 'Fasa 2', 'Fasa 3', 'Fasa 4')) not null,
  year int not null,
  recorded_date date not null,
  recorded_by uuid references profiles(id) not null,
  is_draft boolean default true,
  created_at timestamptz default now(),
  unique (athlete_id, session, year)
);

-- Individual Test Results: stores actual test results
create table fitness_test_results (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references fitness_test_sessions(id) on delete cascade not null,
  test_id uuid references fitness_test_definitions(id) on delete cascade not null,
  result_value numeric not null,
  rating text check (rating in ('good', 'average', 'poor', 'not_rated')),
  notes text,
  created_at timestamptz default now(),
  unique (session_id, test_id)
);

-- =============================================================
-- 4. INBODY RECORDS
-- =============================================================
create table inbody_records (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references athletes(id) on delete cascade not null,
  recorded_date date not null,
  weight numeric,
  smm numeric,        -- skeletal muscle mass (kg)
  bmi numeric,
  fat_pct numeric,    -- body fat %
  tbw numeric,        -- total body water (L)
  protein numeric,    -- kg
  mineral numeric,    -- kg
  inbody_score int,
  recorded_by uuid references profiles(id),
  created_at timestamptz default now()
);


-- =============================================================
-- 5. SUPPLEMENTS (inventory)
-- =============================================================
create table supplements (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  stock int default 0,
  unit text default 'unit',
  created_at timestamptz default now()
);


-- =============================================================
-- 6. SUPPLEMENT REQUESTS
-- =============================================================
create table supplement_requests (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references athletes(id) not null,
  supplement_id uuid references supplements(id) not null,
  quantity int not null check (quantity > 0),
  request_date date default current_date,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  requested_by uuid references profiles(id),
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Decrement stock on approval
create or replace function handle_supplement_approval()
returns trigger as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    update supplements
    set stock = stock - new.quantity
    where id = new.supplement_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_supplement_approved
  after update on supplement_requests
  for each row execute function handle_supplement_approval();


-- =============================================================
-- 7. PHYSIO SLOTS
-- =============================================================
create table physio_slots (
  id uuid default gen_random_uuid() primary key,
  slot_date date not null,
  time_slot text not null,          -- e.g. '07:00', '08:00'
  athlete_id uuid references athletes(id),
  diagnosis text,                   -- medical diagnosis
  date_of_injury date,              -- D.O.I
  referred_by text,                 -- who referred the athlete
  chief_complaint text,             -- COC - main complaint
  injury_type text,
  session_type text check (session_type in ('standard', 'manual', 'injury')),
  assessment_notes text,
  rehab_plan text,
  progress_notes text,
  physiotherapist_id uuid references profiles(id),
  created_at timestamptz default now(),
  unique (slot_date, time_slot, physiotherapist_id)
);


-- =============================================================
-- 8. STRENGTH & CONDITIONING
-- =============================================================
create table strength_conditioning (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references athletes(id) on delete cascade not null,
  session_date date not null,
  attendance text check (attendance in ('present', 'absent', 'mc')) not null,
  training_program text,
  notes text,
  recorded_by uuid references profiles(id),
  created_at timestamptz default now()
);


-- =============================================================
-- 9. SC PROGRAMS (monthly training program per sport)
-- =============================================================
create table sc_programs (
  id uuid default gen_random_uuid() primary key,
  sport text not null,
  month int not null check (month between 1 and 12),
  year int not null,
  content text not null,
  coach_id uuid references profiles(id),
  created_at timestamptz default now(),
  unique (sport, month, year)
);


-- =============================================================
-- 10. COACH ASSIGNMENTS (which S&C coach handles which sport)
-- =============================================================
create table coach_assignments (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references profiles(id) not null,
  sport text not null,
  days_of_week text[],
  notes text,
  created_at timestamptz default now(),
  unique (coach_id, sport)
);


-- =============================================================
-- 11. AUDIT LOGS
-- =============================================================
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  ip_address text,
  created_at timestamptz default now()
);


-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table profiles enable row level security;
alter table athletes enable row level security;
alter table fitness_tests enable row level security;
alter table fitness_test_sessions enable row level security;
alter table fitness_test_results enable row level security;
alter table inbody_records enable row level security;
alter table supplements enable row level security;
alter table supplement_requests enable row level security;
alter table physio_slots enable row level security;
alter table strength_conditioning enable row level security;
alter table sc_programs enable row level security;
alter table coach_assignments enable row level security;
alter table audit_logs enable row level security;

-- Helper: get current user role
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer;

-- profiles
create policy "Users can read own profile"
  on profiles for select using (id = auth.uid());
create policy "Admins can read all profiles"
  on profiles for select using (get_my_role() in ('superadmin', 'admin'));
create policy "Admins can update profiles"
  on profiles for update using (get_my_role() in ('superadmin', 'admin'));

-- athletes
create policy "Admins full access to athletes"
  on athletes for all using (get_my_role() in ('superadmin', 'admin'));
create policy "Coach reads all athletes"
  on athletes for select using (
    get_my_role() = 'coach'
  );
create policy "Physio/medical reads athletes"
  on athletes for select using (
    get_my_role() in ('physio', 'medical')
  );
create policy "Athlete reads own record"
  on athletes for select using (
    get_my_role() = 'athlete' and id = auth.uid()
  );

-- fitness_tests
create policy "Admins full access to fitness_tests"
  on fitness_tests for all using (get_my_role() in ('superadmin', 'admin'));
create policy "Coach reads all fitness_tests"
  on fitness_tests for select using (
    get_my_role() = 'coach'
  );
create policy "Medical reads all fitness_tests"
  on fitness_tests for select using (
    get_my_role() = 'medical'
  );
create policy "Staff can insert fitness_tests"
  on fitness_tests for insert with check (
    get_my_role() in ('superadmin', 'admin', 'coach', 'medical')
  );
create policy "Athlete reads own fitness_tests"
  on fitness_tests for select using (
    get_my_role() = 'athlete' and athlete_id = auth.uid()
  );

-- fitness_test_sessions
create policy "Admins full access to fitness_test_sessions"
  on fitness_test_sessions for all using (get_my_role() in ('superadmin', 'admin'));
create policy "Coach reads all fitness_test_sessions"
  on fitness_test_sessions for select using (get_my_role() = 'coach');
create policy "Medical reads all fitness_test_sessions"
  on fitness_test_sessions for select using (get_my_role() = 'medical');
create policy "Staff can insert fitness_test_sessions"
  on fitness_test_sessions for insert with check (
    get_my_role() in ('superadmin', 'admin', 'coach', 'medical')
  );

-- fitness_test_results
create policy "Admins full access to fitness_test_results"
  on fitness_test_results for all using (get_my_role() in ('superadmin', 'admin'));
create policy "Coach reads all fitness_test_results"
  on fitness_test_results for select using (get_my_role() = 'coach');
create policy "Medical reads all fitness_test_results"
  on fitness_test_results for select using (get_my_role() = 'medical');
create policy "Staff can insert fitness_test_results"
  on fitness_test_results for insert with check (
    get_my_role() in ('superadmin', 'admin', 'coach', 'medical')
  );

-- inbody_records
create policy "Admins full access to inbody_records"
  on inbody_records for all using (get_my_role() in ('superadmin', 'admin'));
create policy "Medical/coach can insert inbody_records"
  on inbody_records for insert with check (
    get_my_role() in ('medical', 'coach', 'admin', 'superadmin')
  );
create policy "Coach reads all inbody_records"
  on inbody_records for select using (
    get_my_role() = 'coach'
  );
create policy "Medical reads all inbody_records"
  on inbody_records for select using (
    get_my_role() = 'medical'
  );
create policy "Athlete reads own inbody"
  on inbody_records for select using (
    get_my_role() = 'athlete' and athlete_id = auth.uid()
  );

-- supplements
create policy "All authenticated users can read supplements"
  on supplements for select using (auth.role() = 'authenticated');
create policy "Admins/medical manage supplements"
  on supplements for all using (get_my_role() in ('superadmin', 'admin', 'medical'));

-- supplement_requests
create policy "Admins/medical full access to supplement_requests"
  on supplement_requests for all using (get_my_role() in ('superadmin', 'admin', 'medical'));
create policy "Coach can request supplements"
  on supplement_requests for insert with check (get_my_role() = 'coach');
create policy "Coach reads all requests"
  on supplement_requests for select using (get_my_role() = 'coach');

-- physio_slots
create policy "Admins full access to physio_slots"
  on physio_slots for all using (get_my_role() in ('superadmin', 'admin'));
create policy "Physio manages all slots"
  on physio_slots for all using (
    get_my_role() = 'physio'
  );
create policy "Coach reads all physio slots"
  on physio_slots for select using (
    get_my_role() = 'coach'
  );

-- sc_programs
create policy "Admins full access to sc_programs"
  on sc_programs for all using (get_my_role() in ('superadmin', 'admin'));
create policy "Coaches can read sc_programs"
  on sc_programs for select using (get_my_role() = 'coach');
create policy "Coaches can insert sc_programs"
  on sc_programs for insert with check (
    get_my_role() = 'coach'
  );
create policy "Coaches can update sc_programs"
  on sc_programs for update using (
    get_my_role() = 'coach'
  );

-- coach_assignments
create policy "Admins full access to coach_assignments"
  on coach_assignments for all using (get_my_role() in ('superadmin', 'admin'));
create policy "All authenticated users can read coach_assignments"
  on coach_assignments for select using (auth.role() = 'authenticated');

-- strength_conditioning
create policy "Admins full access to strength_conditioning"
  on strength_conditioning for all using (get_my_role() in ('superadmin', 'admin'));
create policy "Coach accesses all strength_conditioning"
  on strength_conditioning for all using (
    get_my_role() = 'coach'
  );

-- audit_logs
create policy "Authenticated users can insert own audit logs"
  on audit_logs for insert with check (user_id = auth.uid());
create policy "Admins can read all audit logs"
  on audit_logs for select using (get_my_role() in ('superadmin', 'admin'));


-- =============================================================
-- MIGRATION: Upgrade existing users to CRUD permissions (run once)
-- =============================================================
-- If you have existing users with boolean module_permissions, run this to convert to CRUD format:
-- UPDATE profiles
-- SET module_permissions = jsonb_build_object(
--   'athletes',       jsonb_build_object('read', COALESCE((module_permissions->>'athletes')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'strength',       jsonb_build_object('read', COALESCE((module_permissions->>'strength')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'fitness',        jsonb_build_object('read', COALESCE((module_permissions->>'fitness')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'fitness_config', jsonb_build_object('read', false, 'create', false, 'update', false, 'delete', false),
--   'inbody',         jsonb_build_object('read', COALESCE((module_permissions->>'inbody')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'supplement',     jsonb_build_object('read', COALESCE((module_permissions->>'supplement')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'physio',         jsonb_build_object('read', COALESCE((module_permissions->>'physio')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'physio_cases',   jsonb_build_object('read', COALESCE((module_permissions->>'physio')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'psychology',     jsonb_build_object('read', COALESCE((module_permissions->>'psychology')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'reports',        jsonb_build_object('read', COALESCE((module_permissions->>'reports')::boolean, false), 'create', false, 'update', false, 'delete', false),
--   'supplement_coordinator', COALESCE((module_permissions->>'supplement_coordinator')::boolean, false),
--   'supplement_supporter',   COALESCE((module_permissions->>'supplement_supporter')::boolean, false),
--   'supplement_approver',    COALESCE((module_permissions->>'supplement_approver')::boolean, false)
-- )
-- WHERE module_permissions IS NOT NULL
--   AND module_permissions ? 'athletes'
--   AND NOT (module_permissions -> 'athletes' ? 'read');


-- =============================================================
-- SEED DATA (sample athletes + supplements for testing)
-- =============================================================
-- Run after creating your first superadmin user account

-- insert into athletes (name, ic_number, sport, category, status) values
--   ('Ahmad Faris bin Razak',   '020315-06-1234', 'Badminton', 'Lelaki Bawah 21', 'active'),
--   ('Nurul Ain binti Hassan',  '030722-10-5678', 'Renang',    'Wanita Bawah 20', 'active'),
--   ('Haziq Irfan bin Malik',   '010909-05-9012', 'Olahraga',  'Lelaki Senior',   'active'),
--   ('Siti Hajar binti Yusof',  '040301-08-3456', 'Silat',     'Wanita Bawah 18', 'injured'),
--   ('Muhammad Zaki bin Idris', '000512-03-7890', 'Hoki',      'Lelaki Bawah 23', 'rest');

-- insert into supplements (name, stock, unit) values
--   ('Protein Powder', 50, 'beg'),
--   ('Vitamin C',      200, 'tablet'),
--   ('Creatine',       30, 'beg'),
--   ('Omega-3',        100, 'kapsul'),
--   ('Magnesium',      80, 'tablet');
