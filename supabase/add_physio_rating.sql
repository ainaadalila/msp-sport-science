-- Create physio_ratings table for storing assessment scores from Google Form data
create table if not exists physio_ratings (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid not null references athletes(id) on delete cascade,
  phase text check (phase in ('persediaan', 'pertandingan', 'pemulihan')) not null,
  cognitive_anxiety_score integer,                    -- sum of questions 1, 6, 8, 11, 15
  somatic_anxiety_score integer,                       -- sum of questions 2, 5, 7, 10, 12, 14, 17
  self_confidence_score integer,                       -- sum of questions 3, 4, 9, 13, 16 (q3 reverse scored)
  raw_responses jsonb,                                 -- store original responses for reference
  assessment_date date not null,
  recorded_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table physio_ratings enable row level security;

-- Admin full access
create policy "Admins full access to physio_ratings"
  on physio_ratings for all using (get_my_role() in ('superadmin', 'admin'));

-- Physio can see ratings for their athletes (if they have physio_cases)
create policy "Physio reads ratings for their cases"
  on physio_ratings for select using (
    get_my_role() = 'physio' and
    athlete_id in (
      select athlete_id from physio_cases
      where physiotherapist_id = auth.uid()
    )
  );

-- Coach can see ratings for their athletes
create policy "Coach reads ratings for own athletes"
  on physio_ratings for select using (
    get_my_role() = 'coach' and
    athlete_id in (select id from athletes where coach_id = auth.uid())
  );

-- Insert/Update policies
create policy "Admin and physio can insert/update physio_ratings"
  on physio_ratings for insert with check (get_my_role() in ('superadmin', 'admin', 'physio'));

create policy "Admin and physio can update physio_ratings"
  on physio_ratings for update using (get_my_role() in ('superadmin', 'admin', 'physio'));
