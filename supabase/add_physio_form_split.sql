-- Add physio_cases table
create table if not exists physio_cases (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references athletes(id) on delete cascade,
  open_date date not null,
  injury_type text,
  status text check (status in ('active', 'closed', 'referred')) not null default 'active',
  created_at timestamptz default now()
);

-- Add missing columns to physio_slots
alter table physio_slots
  add column if not exists case_id uuid references physio_cases(id) on delete set null,
  add column if not exists pain_scale integer,
  add column if not exists target_muscle text,
  add column if not exists treatment_type text,
  add column if not exists attendance_status text check (attendance_status in ('scheduled', 'arrived', 'completed', 'no_show')) not null default 'scheduled';

-- Enable RLS on physio_cases
alter table physio_cases enable row level security;

-- Add policies for physio_cases
create policy "Admins full access to physio_cases"
  on physio_cases for all using (get_my_role() in ('superadmin', 'admin'));

create policy "Physio reads active cases for own athletes"
  on physio_cases for select using (
    get_my_role() = 'physio' or
    athlete_id in (select athlete_id from physio_slots where physiotherapist_id = auth.uid())
  );

create policy "Coach reads cases for own athletes"
  on physio_cases for select using (
    get_my_role() = 'coach' and
    athlete_id in (select id from athletes where coach_id = auth.uid())
  );
