drop extension if exists "pg_net";


  create table "public"."athletes" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "ic_number" text not null,
    "sport" text not null,
    "category" text,
    "weight" numeric,
    "height" numeric,
    "status" text default 'active'::text,
    "created_at" timestamp with time zone default now(),
    "date_of_birth" date,
    "gender" text,
    "photo_url" text,
    "is_elite" boolean not null default false
      );


alter table "public"."athletes" enable row level security;


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text not null,
    "target_table" text,
    "target_id" uuid,
    "ip_address" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."coach_schedule_slots" (
    "id" uuid not null default gen_random_uuid(),
    "schedule_id" uuid not null,
    "slot_date" date not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."coach_schedule_slots" enable row level security;


  create table "public"."coach_schedules" (
    "id" uuid not null default gen_random_uuid(),
    "coach_id" uuid not null,
    "sport" text not null,
    "schedule_name" text not null,
    "valid_from" date not null,
    "repeats" boolean default false,
    "repeat_pattern" text,
    "repeat_until" date,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."coach_schedules" enable row level security;


  create table "public"."fitness_test_definitions" (
    "id" uuid not null default gen_random_uuid(),
    "test_name" text not null,
    "category" text not null,
    "unit" text not null,
    "description" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."fitness_test_definitions" enable row level security;


  create table "public"."fitness_test_norms" (
    "id" uuid not null default gen_random_uuid(),
    "test_id" uuid not null,
    "gender" text not null,
    "good_min" numeric,
    "good_max" numeric,
    "average_min" numeric,
    "average_max" numeric,
    "poor_min" numeric,
    "poor_max" numeric,
    "rating_direction" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."fitness_test_norms" enable row level security;


  create table "public"."fitness_test_results" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid not null,
    "test_id" uuid not null,
    "result_value" numeric not null,
    "rating" text,
    "notes" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."fitness_test_results" enable row level security;


  create table "public"."fitness_test_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "athlete_id" uuid not null,
    "session" text not null,
    "year" integer not null,
    "recorded_date" date not null,
    "recorded_by" uuid not null,
    "is_draft" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."fitness_test_sessions" enable row level security;


  create table "public"."fitness_tests" (
    "id" uuid not null default gen_random_uuid(),
    "athlete_id" uuid not null,
    "phase" integer not null,
    "year" integer not null,
    "push_up" integer,
    "squat_endurance" integer,
    "sit_up" integer,
    "plank_sec" integer,
    "pull_up" integer,
    "standing_broad_jump" numeric,
    "counter_movement_jump" numeric,
    "squat_fatigue" integer,
    "medicine_ball_throw" numeric,
    "back_strength" numeric,
    "handgrip" numeric,
    "sit_and_reach" numeric,
    "t_test" numeric,
    "hexagon_agility" numeric,
    "cod_dribble" numeric,
    "sprint_20m" numeric,
    "sprint_40m" numeric,
    "bleep_test" numeric,
    "yoyo_test" numeric,
    "run_2400m" integer,
    "wall_toss" integer,
    "stock_balance" numeric,
    "cross_punch_power" numeric,
    "cross_punch_speed" numeric,
    "roundhouse_kick_speed" numeric,
    "recorded_by" uuid,
    "created_at" timestamp with time zone default now(),
    "is_draft" boolean default false
      );


alter table "public"."fitness_tests" enable row level security;


  create table "public"."inbody_records" (
    "id" uuid not null default gen_random_uuid(),
    "athlete_id" uuid not null,
    "recorded_date" date not null,
    "weight" numeric,
    "smm" numeric,
    "bmi" numeric,
    "fat_pct" numeric,
    "inbody_score" integer,
    "recorded_by" uuid,
    "created_at" timestamp with time zone default now(),
    "body_fat_mass" numeric(5,1),
    "bmr" integer,
    "skor" smallint,
    "ulasan" text,
    "diet_plan_url" text,
    "diet_plan_name" text
      );


alter table "public"."inbody_records" enable row level security;


  create table "public"."physio_cases" (
    "id" uuid not null default gen_random_uuid(),
    "athlete_id" uuid,
    "open_date" date not null,
    "status" text not null default 'active'::text,
    "rts_date" date,
    "close_reason" text,
    "referred_to" text,
    "physio_id" uuid,
    "created_at" timestamp with time zone default now(),
    "injury_type" text,
    "referred_to_doctor" boolean not null default false,
    "referred_date" date
      );


alter table "public"."physio_cases" enable row level security;


  create table "public"."physio_slots" (
    "id" uuid not null default gen_random_uuid(),
    "slot_date" date not null,
    "athlete_id" uuid,
    "injury_type" text,
    "session_type" text,
    "assessment_notes" text,
    "rehab_plan" text,
    "progress_notes" text,
    "physiotherapist_id" uuid,
    "created_at" timestamp with time zone default now(),
    "pain_scale" integer,
    "target_muscle" text,
    "treatment_type" text,
    "attendance_status" text not null default 'scheduled'::text,
    "case_id" uuid,
    "diagnosis" text,
    "date_of_injury" date,
    "referred_by" text,
    "chief_complaint" text,
    "duration_minutes" integer,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."physio_slots" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "role" text not null default 'admin'::text,
    "created_at" timestamp with time zone default now(),
    "module_permissions" jsonb not null default jsonb_build_object('athletes', true, 'inbody', true, 'supplement', true, 'physio', true, 'fitness', true, 'strength', true, 'reports', true, 'supplement_coordinator', false, 'supplement_supporter', false, 'supplement_approver', false)
      );


alter table "public"."profiles" enable row level security;


  create table "public"."sc_programs" (
    "id" uuid not null default gen_random_uuid(),
    "sport" text not null,
    "month" integer not null,
    "year" integer not null,
    "content" text not null,
    "coach_id" uuid,
    "created_at" timestamp with time zone default now(),
    "program_type" text not null default 'text'::text,
    "structured_data" jsonb,
    "start_date" date,
    "end_date" date
      );


alter table "public"."sc_programs" enable row level security;


  create table "public"."sport_fitness_tests" (
    "id" uuid not null default gen_random_uuid(),
    "sport" text not null,
    "test_id" uuid not null,
    "is_mandatory" boolean default false,
    "custom_name" text,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."sport_fitness_tests" enable row level security;


  create table "public"."strength_conditioning" (
    "id" uuid not null default gen_random_uuid(),
    "athlete_id" uuid not null,
    "session_date" date not null,
    "attendance" text not null,
    "training_program" text,
    "notes" text,
    "recorded_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."strength_conditioning" enable row level security;


  create table "public"."supplement_requests" (
    "id" uuid not null default gen_random_uuid(),
    "supplement_id" uuid not null,
    "quantity" integer not null,
    "request_date" date default CURRENT_DATE,
    "status" text default 'pending'::text,
    "requested_by" uuid,
    "reviewed_by" uuid,
    "created_at" timestamp with time zone default now(),
    "sport" text,
    "coordinator_notes" text,
    "coordinator_id" uuid,
    "approved_quantity" integer,
    "supporter_id" uuid,
    "supporter_status" text,
    "supporter_notes" text,
    "supporter_reviewed_at" timestamp with time zone
      );


alter table "public"."supplement_requests" enable row level security;


  create table "public"."supplements" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "stock" integer default 0,
    "unit" text default 'unit'::text,
    "created_at" timestamp with time zone default now(),
    "expiry_date" date
      );


alter table "public"."supplements" enable row level security;

CREATE UNIQUE INDEX athletes_ic_number_key ON public.athletes USING btree (ic_number);

CREATE UNIQUE INDEX athletes_pkey ON public.athletes USING btree (id);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX coach_schedule_slots_pkey ON public.coach_schedule_slots USING btree (id);

CREATE UNIQUE INDEX coach_schedule_slots_schedule_id_slot_date_start_time_key ON public.coach_schedule_slots USING btree (schedule_id, slot_date, start_time);

CREATE UNIQUE INDEX coach_schedules_pkey ON public.coach_schedules USING btree (id);

CREATE UNIQUE INDEX fitness_test_definitions_pkey ON public.fitness_test_definitions USING btree (id);

CREATE UNIQUE INDEX fitness_test_definitions_test_name_key ON public.fitness_test_definitions USING btree (test_name);

CREATE UNIQUE INDEX fitness_test_norms_pkey ON public.fitness_test_norms USING btree (id);

CREATE UNIQUE INDEX fitness_test_norms_test_id_gender_key ON public.fitness_test_norms USING btree (test_id, gender);

CREATE UNIQUE INDEX fitness_test_results_pkey ON public.fitness_test_results USING btree (id);

CREATE UNIQUE INDEX fitness_test_results_session_id_test_id_key ON public.fitness_test_results USING btree (session_id, test_id);

CREATE UNIQUE INDEX fitness_test_sessions_athlete_id_session_year_key ON public.fitness_test_sessions USING btree (athlete_id, session, year);

CREATE UNIQUE INDEX fitness_test_sessions_pkey ON public.fitness_test_sessions USING btree (id);

CREATE UNIQUE INDEX fitness_tests_athlete_id_phase_year_key ON public.fitness_tests USING btree (athlete_id, phase, year);

CREATE UNIQUE INDEX fitness_tests_pkey ON public.fitness_tests USING btree (id);

CREATE UNIQUE INDEX inbody_records_pkey ON public.inbody_records USING btree (id);

CREATE UNIQUE INDEX physio_cases_pkey ON public.physio_cases USING btree (id);

CREATE UNIQUE INDEX physio_slots_pkey ON public.physio_slots USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX sc_programs_pkey ON public.sc_programs USING btree (id);

CREATE UNIQUE INDEX sc_programs_sport_month_year_key ON public.sc_programs USING btree (sport, month, year);

CREATE UNIQUE INDEX sport_fitness_tests_pkey ON public.sport_fitness_tests USING btree (id);

CREATE UNIQUE INDEX sport_fitness_tests_sport_test_id_key ON public.sport_fitness_tests USING btree (sport, test_id);

CREATE UNIQUE INDEX strength_conditioning_pkey ON public.strength_conditioning USING btree (id);

CREATE UNIQUE INDEX supplement_requests_pkey ON public.supplement_requests USING btree (id);

CREATE UNIQUE INDEX supplements_pkey ON public.supplements USING btree (id);

alter table "public"."athletes" add constraint "athletes_pkey" PRIMARY KEY using index "athletes_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."coach_schedule_slots" add constraint "coach_schedule_slots_pkey" PRIMARY KEY using index "coach_schedule_slots_pkey";

alter table "public"."coach_schedules" add constraint "coach_schedules_pkey" PRIMARY KEY using index "coach_schedules_pkey";

alter table "public"."fitness_test_definitions" add constraint "fitness_test_definitions_pkey" PRIMARY KEY using index "fitness_test_definitions_pkey";

alter table "public"."fitness_test_norms" add constraint "fitness_test_norms_pkey" PRIMARY KEY using index "fitness_test_norms_pkey";

alter table "public"."fitness_test_results" add constraint "fitness_test_results_pkey" PRIMARY KEY using index "fitness_test_results_pkey";

alter table "public"."fitness_test_sessions" add constraint "fitness_test_sessions_pkey" PRIMARY KEY using index "fitness_test_sessions_pkey";

alter table "public"."fitness_tests" add constraint "fitness_tests_pkey" PRIMARY KEY using index "fitness_tests_pkey";

alter table "public"."inbody_records" add constraint "inbody_records_pkey" PRIMARY KEY using index "inbody_records_pkey";

alter table "public"."physio_cases" add constraint "physio_cases_pkey" PRIMARY KEY using index "physio_cases_pkey";

alter table "public"."physio_slots" add constraint "physio_slots_pkey" PRIMARY KEY using index "physio_slots_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."sc_programs" add constraint "sc_programs_pkey" PRIMARY KEY using index "sc_programs_pkey";

alter table "public"."sport_fitness_tests" add constraint "sport_fitness_tests_pkey" PRIMARY KEY using index "sport_fitness_tests_pkey";

alter table "public"."strength_conditioning" add constraint "strength_conditioning_pkey" PRIMARY KEY using index "strength_conditioning_pkey";

alter table "public"."supplement_requests" add constraint "supplement_requests_pkey" PRIMARY KEY using index "supplement_requests_pkey";

alter table "public"."supplements" add constraint "supplements_pkey" PRIMARY KEY using index "supplements_pkey";

alter table "public"."athletes" add constraint "athletes_gender_check" CHECK ((gender = ANY (ARRAY['M'::text, 'F'::text]))) not valid;

alter table "public"."athletes" validate constraint "athletes_gender_check";

alter table "public"."athletes" add constraint "athletes_ic_number_key" UNIQUE using index "athletes_ic_number_key";

alter table "public"."athletes" add constraint "athletes_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'rest'::text, 'injured'::text]))) not valid;

alter table "public"."athletes" validate constraint "athletes_status_check";

alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

alter table "public"."coach_schedule_slots" add constraint "coach_schedule_slots_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES public.coach_schedules(id) ON DELETE CASCADE not valid;

alter table "public"."coach_schedule_slots" validate constraint "coach_schedule_slots_schedule_id_fkey";

alter table "public"."coach_schedule_slots" add constraint "coach_schedule_slots_schedule_id_slot_date_start_time_key" UNIQUE using index "coach_schedule_slots_schedule_id_slot_date_start_time_key";

alter table "public"."coach_schedules" add constraint "coach_schedules_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."coach_schedules" validate constraint "coach_schedules_coach_id_fkey";

alter table "public"."coach_schedules" add constraint "coach_schedules_repeat_pattern_check" CHECK ((repeat_pattern = ANY (ARRAY['weekly'::text, 'bi-weekly'::text, 'custom'::text]))) not valid;

alter table "public"."coach_schedules" validate constraint "coach_schedules_repeat_pattern_check";

alter table "public"."fitness_test_definitions" add constraint "fitness_test_definitions_test_name_key" UNIQUE using index "fitness_test_definitions_test_name_key";

alter table "public"."fitness_test_norms" add constraint "fitness_test_norms_gender_check" CHECK ((gender = ANY (ARRAY['M'::text, 'F'::text, 'both'::text]))) not valid;

alter table "public"."fitness_test_norms" validate constraint "fitness_test_norms_gender_check";

alter table "public"."fitness_test_norms" add constraint "fitness_test_norms_rating_direction_check" CHECK ((rating_direction = ANY (ARRAY['higher_is_better'::text, 'lower_is_better'::text]))) not valid;

alter table "public"."fitness_test_norms" validate constraint "fitness_test_norms_rating_direction_check";

alter table "public"."fitness_test_norms" add constraint "fitness_test_norms_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.fitness_test_definitions(id) ON DELETE CASCADE not valid;

alter table "public"."fitness_test_norms" validate constraint "fitness_test_norms_test_id_fkey";

alter table "public"."fitness_test_norms" add constraint "fitness_test_norms_test_id_gender_key" UNIQUE using index "fitness_test_norms_test_id_gender_key";

alter table "public"."fitness_test_results" add constraint "fitness_test_results_rating_check" CHECK ((rating = ANY (ARRAY['baik'::text, 'sederhana'::text, 'lemah'::text, 'not_rated'::text]))) not valid;

alter table "public"."fitness_test_results" validate constraint "fitness_test_results_rating_check";

alter table "public"."fitness_test_results" add constraint "fitness_test_results_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.fitness_test_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."fitness_test_results" validate constraint "fitness_test_results_session_id_fkey";

alter table "public"."fitness_test_results" add constraint "fitness_test_results_session_id_test_id_key" UNIQUE using index "fitness_test_results_session_id_test_id_key";

alter table "public"."fitness_test_results" add constraint "fitness_test_results_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.fitness_test_definitions(id) ON DELETE CASCADE not valid;

alter table "public"."fitness_test_results" validate constraint "fitness_test_results_test_id_fkey";

alter table "public"."fitness_test_sessions" add constraint "fitness_test_sessions_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE not valid;

alter table "public"."fitness_test_sessions" validate constraint "fitness_test_sessions_athlete_id_fkey";

alter table "public"."fitness_test_sessions" add constraint "fitness_test_sessions_athlete_id_session_year_key" UNIQUE using index "fitness_test_sessions_athlete_id_session_year_key";

alter table "public"."fitness_test_sessions" add constraint "fitness_test_sessions_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) not valid;

alter table "public"."fitness_test_sessions" validate constraint "fitness_test_sessions_recorded_by_fkey";

alter table "public"."fitness_test_sessions" add constraint "fitness_test_sessions_session_check" CHECK ((session = ANY (ARRAY['Fasa 1'::text, 'Fasa 2'::text, 'Fasa 3'::text, 'Fasa 4'::text]))) not valid;

alter table "public"."fitness_test_sessions" validate constraint "fitness_test_sessions_session_check";

alter table "public"."fitness_tests" add constraint "fitness_tests_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE not valid;

alter table "public"."fitness_tests" validate constraint "fitness_tests_athlete_id_fkey";

alter table "public"."fitness_tests" add constraint "fitness_tests_athlete_id_phase_year_key" UNIQUE using index "fitness_tests_athlete_id_phase_year_key";

alter table "public"."fitness_tests" add constraint "fitness_tests_phase_check" CHECK ((phase = ANY (ARRAY[1, 2, 3, 4]))) not valid;

alter table "public"."fitness_tests" validate constraint "fitness_tests_phase_check";

alter table "public"."fitness_tests" add constraint "fitness_tests_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) not valid;

alter table "public"."fitness_tests" validate constraint "fitness_tests_recorded_by_fkey";

alter table "public"."inbody_records" add constraint "inbody_records_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE not valid;

alter table "public"."inbody_records" validate constraint "inbody_records_athlete_id_fkey";

alter table "public"."inbody_records" add constraint "inbody_records_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) not valid;

alter table "public"."inbody_records" validate constraint "inbody_records_recorded_by_fkey";

alter table "public"."physio_cases" add constraint "physio_cases_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE SET NULL not valid;

alter table "public"."physio_cases" validate constraint "physio_cases_athlete_id_fkey";

alter table "public"."physio_cases" add constraint "physio_cases_physio_id_fkey" FOREIGN KEY (physio_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."physio_cases" validate constraint "physio_cases_physio_id_fkey";

alter table "public"."physio_cases" add constraint "physio_cases_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text]))) not valid;

alter table "public"."physio_cases" validate constraint "physio_cases_status_check";

alter table "public"."physio_slots" add constraint "physio_slots_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) not valid;

alter table "public"."physio_slots" validate constraint "physio_slots_athlete_id_fkey";

alter table "public"."physio_slots" add constraint "physio_slots_attendance_status_check" CHECK ((attendance_status = ANY (ARRAY['scheduled'::text, 'arrived'::text, 'completed'::text, 'no_show'::text]))) not valid;

alter table "public"."physio_slots" validate constraint "physio_slots_attendance_status_check";

alter table "public"."physio_slots" add constraint "physio_slots_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.physio_cases(id) ON DELETE SET NULL not valid;

alter table "public"."physio_slots" validate constraint "physio_slots_case_id_fkey";

alter table "public"."physio_slots" add constraint "physio_slots_pain_scale_check" CHECK (((pain_scale >= 0) AND (pain_scale <= 10))) not valid;

alter table "public"."physio_slots" validate constraint "physio_slots_pain_scale_check";

alter table "public"."physio_slots" add constraint "physio_slots_physiotherapist_id_fkey" FOREIGN KEY (physiotherapist_id) REFERENCES public.profiles(id) not valid;

alter table "public"."physio_slots" validate constraint "physio_slots_physiotherapist_id_fkey";

alter table "public"."physio_slots" add constraint "physio_slots_session_type_check" CHECK ((session_type = ANY (ARRAY['standard'::text, 'manual'::text, 'injury'::text]))) not valid;

alter table "public"."physio_slots" validate constraint "physio_slots_session_type_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'coach'::text, 'physio'::text, 'psikologis'::text, 'penolong_pegawai'::text, 'pegawai_belia_sukan'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."sc_programs" add constraint "sc_programs_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES public.profiles(id) not valid;

alter table "public"."sc_programs" validate constraint "sc_programs_coach_id_fkey";

alter table "public"."sc_programs" add constraint "sc_programs_month_check" CHECK (((month >= 1) AND (month <= 12))) not valid;

alter table "public"."sc_programs" validate constraint "sc_programs_month_check";

alter table "public"."sc_programs" add constraint "sc_programs_sport_month_year_key" UNIQUE using index "sc_programs_sport_month_year_key";

alter table "public"."sport_fitness_tests" add constraint "sport_fitness_tests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."sport_fitness_tests" validate constraint "sport_fitness_tests_created_by_fkey";

alter table "public"."sport_fitness_tests" add constraint "sport_fitness_tests_sport_test_id_key" UNIQUE using index "sport_fitness_tests_sport_test_id_key";

alter table "public"."sport_fitness_tests" add constraint "sport_fitness_tests_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.fitness_test_definitions(id) ON DELETE CASCADE not valid;

alter table "public"."sport_fitness_tests" validate constraint "sport_fitness_tests_test_id_fkey";

alter table "public"."strength_conditioning" add constraint "strength_conditioning_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE not valid;

alter table "public"."strength_conditioning" validate constraint "strength_conditioning_athlete_id_fkey";

alter table "public"."strength_conditioning" add constraint "strength_conditioning_attendance_check" CHECK ((attendance = ANY (ARRAY['present'::text, 'absent'::text, 'mc'::text]))) not valid;

alter table "public"."strength_conditioning" validate constraint "strength_conditioning_attendance_check";

alter table "public"."strength_conditioning" add constraint "strength_conditioning_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) not valid;

alter table "public"."strength_conditioning" validate constraint "strength_conditioning_recorded_by_fkey";

alter table "public"."supplement_requests" add constraint "supplement_requests_coordinator_id_fkey" FOREIGN KEY (coordinator_id) REFERENCES public.profiles(id) not valid;

alter table "public"."supplement_requests" validate constraint "supplement_requests_coordinator_id_fkey";

alter table "public"."supplement_requests" add constraint "supplement_requests_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."supplement_requests" validate constraint "supplement_requests_quantity_check";

alter table "public"."supplement_requests" add constraint "supplement_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES public.profiles(id) not valid;

alter table "public"."supplement_requests" validate constraint "supplement_requests_requested_by_fkey";

alter table "public"."supplement_requests" add constraint "supplement_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."supplement_requests" validate constraint "supplement_requests_reviewed_by_fkey";

alter table "public"."supplement_requests" add constraint "supplement_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'semakan_lulus'::text, 'semakan_tolak'::text, 'approved'::text, 'partial'::text]))) not valid;

alter table "public"."supplement_requests" validate constraint "supplement_requests_status_check";

alter table "public"."supplement_requests" add constraint "supplement_requests_supplement_id_fkey" FOREIGN KEY (supplement_id) REFERENCES public.supplements(id) not valid;

alter table "public"."supplement_requests" validate constraint "supplement_requests_supplement_id_fkey";

alter table "public"."supplement_requests" add constraint "supplement_requests_supporter_id_fkey" FOREIGN KEY (supporter_id) REFERENCES public.profiles(id) not valid;

alter table "public"."supplement_requests" validate constraint "supplement_requests_supporter_id_fkey";

alter table "public"."supplement_requests" add constraint "supplement_requests_supporter_status_check" CHECK ((supporter_status = ANY (ARRAY['sokong'::text, 'tidak_sokong'::text]))) not valid;

alter table "public"."supplement_requests" validate constraint "supplement_requests_supporter_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select role from profiles where id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  perms jsonb;
  role_val text;
BEGIN
  role_val := COALESCE(new.raw_user_meta_data->>'role', 'pegawai_belia_sukan');
  
  -- Build permissions based on role using CASE
  perms := CASE role_val
    WHEN 'superadmin' THEN '{"athletes":true,"inbody":true,"supplement":true,"physio":true,"fitness":true,"strength":true,"reports":true,"psychology":true,"supplement_coordinator":true,"supplement_supporter":true,"supplement_approver":true}'::jsonb
    WHEN 'admin' THEN '{"athletes":true,"inbody":true,"supplement":true,"physio":true,"fitness":true,"strength":true,"reports":true,"psychology":true,"supplement_coordinator":true,"supplement_supporter":true,"supplement_approver":true}'::jsonb
    WHEN 'coach' THEN '{"athletes":true,"inbody":false,"supplement":false,"physio":false,"fitness":false,"strength":true,"reports":false,"psychology":false,"supplement_coordinator":false,"supplement_supporter":false,"supplement_approver":false}'::jsonb
    WHEN 'physio' THEN '{"athletes":true,"inbody":false,"supplement":false,"physio":true,"fitness":false,"strength":false,"reports":false,"psychology":false,"supplement_coordinator":false,"supplement_supporter":false,"supplement_approver":false}'::jsonb
    WHEN 'psikologis' THEN '{"athletes":true,"inbody":false,"supplement":false,"physio":false,"fitness":false,"strength":false,"reports":false,"psychology":true,"supplement_coordinator":false,"supplement_supporter":false,"supplement_approver":false}'::jsonb
    ELSE '{"athletes":true,"inbody":false,"supplement":false,"physio":false,"fitness":false,"strength":false,"reports":false,"psychology":false,"supplement_coordinator":false,"supplement_supporter":false,"supplement_approver":false}'::jsonb
  END;
  
  INSERT INTO profiles (id, full_name, role, module_permissions, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    role_val,
    perms,
    now()
  );
  
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_supplement_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if new.status = 'approved' and old.status = 'pending' then
    update supplements
    set stock = stock - new.quantity
    where id = new.supplement_id;
  end if;
  return new;
end;
$function$
;

grant delete on table "public"."athletes" to "anon";

grant insert on table "public"."athletes" to "anon";

grant references on table "public"."athletes" to "anon";

grant select on table "public"."athletes" to "anon";

grant trigger on table "public"."athletes" to "anon";

grant truncate on table "public"."athletes" to "anon";

grant update on table "public"."athletes" to "anon";

grant delete on table "public"."athletes" to "authenticated";

grant insert on table "public"."athletes" to "authenticated";

grant references on table "public"."athletes" to "authenticated";

grant select on table "public"."athletes" to "authenticated";

grant trigger on table "public"."athletes" to "authenticated";

grant truncate on table "public"."athletes" to "authenticated";

grant update on table "public"."athletes" to "authenticated";

grant delete on table "public"."athletes" to "service_role";

grant insert on table "public"."athletes" to "service_role";

grant references on table "public"."athletes" to "service_role";

grant select on table "public"."athletes" to "service_role";

grant trigger on table "public"."athletes" to "service_role";

grant truncate on table "public"."athletes" to "service_role";

grant update on table "public"."athletes" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."coach_schedule_slots" to "anon";

grant insert on table "public"."coach_schedule_slots" to "anon";

grant references on table "public"."coach_schedule_slots" to "anon";

grant select on table "public"."coach_schedule_slots" to "anon";

grant trigger on table "public"."coach_schedule_slots" to "anon";

grant truncate on table "public"."coach_schedule_slots" to "anon";

grant update on table "public"."coach_schedule_slots" to "anon";

grant delete on table "public"."coach_schedule_slots" to "authenticated";

grant insert on table "public"."coach_schedule_slots" to "authenticated";

grant references on table "public"."coach_schedule_slots" to "authenticated";

grant select on table "public"."coach_schedule_slots" to "authenticated";

grant trigger on table "public"."coach_schedule_slots" to "authenticated";

grant truncate on table "public"."coach_schedule_slots" to "authenticated";

grant update on table "public"."coach_schedule_slots" to "authenticated";

grant delete on table "public"."coach_schedule_slots" to "service_role";

grant insert on table "public"."coach_schedule_slots" to "service_role";

grant references on table "public"."coach_schedule_slots" to "service_role";

grant select on table "public"."coach_schedule_slots" to "service_role";

grant trigger on table "public"."coach_schedule_slots" to "service_role";

grant truncate on table "public"."coach_schedule_slots" to "service_role";

grant update on table "public"."coach_schedule_slots" to "service_role";

grant delete on table "public"."coach_schedules" to "anon";

grant insert on table "public"."coach_schedules" to "anon";

grant references on table "public"."coach_schedules" to "anon";

grant select on table "public"."coach_schedules" to "anon";

grant trigger on table "public"."coach_schedules" to "anon";

grant truncate on table "public"."coach_schedules" to "anon";

grant update on table "public"."coach_schedules" to "anon";

grant delete on table "public"."coach_schedules" to "authenticated";

grant insert on table "public"."coach_schedules" to "authenticated";

grant references on table "public"."coach_schedules" to "authenticated";

grant select on table "public"."coach_schedules" to "authenticated";

grant trigger on table "public"."coach_schedules" to "authenticated";

grant truncate on table "public"."coach_schedules" to "authenticated";

grant update on table "public"."coach_schedules" to "authenticated";

grant delete on table "public"."coach_schedules" to "service_role";

grant insert on table "public"."coach_schedules" to "service_role";

grant references on table "public"."coach_schedules" to "service_role";

grant select on table "public"."coach_schedules" to "service_role";

grant trigger on table "public"."coach_schedules" to "service_role";

grant truncate on table "public"."coach_schedules" to "service_role";

grant update on table "public"."coach_schedules" to "service_role";

grant delete on table "public"."fitness_test_definitions" to "anon";

grant insert on table "public"."fitness_test_definitions" to "anon";

grant references on table "public"."fitness_test_definitions" to "anon";

grant select on table "public"."fitness_test_definitions" to "anon";

grant trigger on table "public"."fitness_test_definitions" to "anon";

grant truncate on table "public"."fitness_test_definitions" to "anon";

grant update on table "public"."fitness_test_definitions" to "anon";

grant delete on table "public"."fitness_test_definitions" to "authenticated";

grant insert on table "public"."fitness_test_definitions" to "authenticated";

grant references on table "public"."fitness_test_definitions" to "authenticated";

grant select on table "public"."fitness_test_definitions" to "authenticated";

grant trigger on table "public"."fitness_test_definitions" to "authenticated";

grant truncate on table "public"."fitness_test_definitions" to "authenticated";

grant update on table "public"."fitness_test_definitions" to "authenticated";

grant delete on table "public"."fitness_test_definitions" to "service_role";

grant insert on table "public"."fitness_test_definitions" to "service_role";

grant references on table "public"."fitness_test_definitions" to "service_role";

grant select on table "public"."fitness_test_definitions" to "service_role";

grant trigger on table "public"."fitness_test_definitions" to "service_role";

grant truncate on table "public"."fitness_test_definitions" to "service_role";

grant update on table "public"."fitness_test_definitions" to "service_role";

grant delete on table "public"."fitness_test_norms" to "anon";

grant insert on table "public"."fitness_test_norms" to "anon";

grant references on table "public"."fitness_test_norms" to "anon";

grant select on table "public"."fitness_test_norms" to "anon";

grant trigger on table "public"."fitness_test_norms" to "anon";

grant truncate on table "public"."fitness_test_norms" to "anon";

grant update on table "public"."fitness_test_norms" to "anon";

grant delete on table "public"."fitness_test_norms" to "authenticated";

grant insert on table "public"."fitness_test_norms" to "authenticated";

grant references on table "public"."fitness_test_norms" to "authenticated";

grant select on table "public"."fitness_test_norms" to "authenticated";

grant trigger on table "public"."fitness_test_norms" to "authenticated";

grant truncate on table "public"."fitness_test_norms" to "authenticated";

grant update on table "public"."fitness_test_norms" to "authenticated";

grant delete on table "public"."fitness_test_norms" to "service_role";

grant insert on table "public"."fitness_test_norms" to "service_role";

grant references on table "public"."fitness_test_norms" to "service_role";

grant select on table "public"."fitness_test_norms" to "service_role";

grant trigger on table "public"."fitness_test_norms" to "service_role";

grant truncate on table "public"."fitness_test_norms" to "service_role";

grant update on table "public"."fitness_test_norms" to "service_role";

grant delete on table "public"."fitness_test_results" to "anon";

grant insert on table "public"."fitness_test_results" to "anon";

grant references on table "public"."fitness_test_results" to "anon";

grant select on table "public"."fitness_test_results" to "anon";

grant trigger on table "public"."fitness_test_results" to "anon";

grant truncate on table "public"."fitness_test_results" to "anon";

grant update on table "public"."fitness_test_results" to "anon";

grant delete on table "public"."fitness_test_results" to "authenticated";

grant insert on table "public"."fitness_test_results" to "authenticated";

grant references on table "public"."fitness_test_results" to "authenticated";

grant select on table "public"."fitness_test_results" to "authenticated";

grant trigger on table "public"."fitness_test_results" to "authenticated";

grant truncate on table "public"."fitness_test_results" to "authenticated";

grant update on table "public"."fitness_test_results" to "authenticated";

grant delete on table "public"."fitness_test_results" to "service_role";

grant insert on table "public"."fitness_test_results" to "service_role";

grant references on table "public"."fitness_test_results" to "service_role";

grant select on table "public"."fitness_test_results" to "service_role";

grant trigger on table "public"."fitness_test_results" to "service_role";

grant truncate on table "public"."fitness_test_results" to "service_role";

grant update on table "public"."fitness_test_results" to "service_role";

grant delete on table "public"."fitness_test_sessions" to "anon";

grant insert on table "public"."fitness_test_sessions" to "anon";

grant references on table "public"."fitness_test_sessions" to "anon";

grant select on table "public"."fitness_test_sessions" to "anon";

grant trigger on table "public"."fitness_test_sessions" to "anon";

grant truncate on table "public"."fitness_test_sessions" to "anon";

grant update on table "public"."fitness_test_sessions" to "anon";

grant delete on table "public"."fitness_test_sessions" to "authenticated";

grant insert on table "public"."fitness_test_sessions" to "authenticated";

grant references on table "public"."fitness_test_sessions" to "authenticated";

grant select on table "public"."fitness_test_sessions" to "authenticated";

grant trigger on table "public"."fitness_test_sessions" to "authenticated";

grant truncate on table "public"."fitness_test_sessions" to "authenticated";

grant update on table "public"."fitness_test_sessions" to "authenticated";

grant delete on table "public"."fitness_test_sessions" to "service_role";

grant insert on table "public"."fitness_test_sessions" to "service_role";

grant references on table "public"."fitness_test_sessions" to "service_role";

grant select on table "public"."fitness_test_sessions" to "service_role";

grant trigger on table "public"."fitness_test_sessions" to "service_role";

grant truncate on table "public"."fitness_test_sessions" to "service_role";

grant update on table "public"."fitness_test_sessions" to "service_role";

grant delete on table "public"."fitness_tests" to "anon";

grant insert on table "public"."fitness_tests" to "anon";

grant references on table "public"."fitness_tests" to "anon";

grant select on table "public"."fitness_tests" to "anon";

grant trigger on table "public"."fitness_tests" to "anon";

grant truncate on table "public"."fitness_tests" to "anon";

grant update on table "public"."fitness_tests" to "anon";

grant delete on table "public"."fitness_tests" to "authenticated";

grant insert on table "public"."fitness_tests" to "authenticated";

grant references on table "public"."fitness_tests" to "authenticated";

grant select on table "public"."fitness_tests" to "authenticated";

grant trigger on table "public"."fitness_tests" to "authenticated";

grant truncate on table "public"."fitness_tests" to "authenticated";

grant update on table "public"."fitness_tests" to "authenticated";

grant delete on table "public"."fitness_tests" to "service_role";

grant insert on table "public"."fitness_tests" to "service_role";

grant references on table "public"."fitness_tests" to "service_role";

grant select on table "public"."fitness_tests" to "service_role";

grant trigger on table "public"."fitness_tests" to "service_role";

grant truncate on table "public"."fitness_tests" to "service_role";

grant update on table "public"."fitness_tests" to "service_role";

grant delete on table "public"."inbody_records" to "anon";

grant insert on table "public"."inbody_records" to "anon";

grant references on table "public"."inbody_records" to "anon";

grant select on table "public"."inbody_records" to "anon";

grant trigger on table "public"."inbody_records" to "anon";

grant truncate on table "public"."inbody_records" to "anon";

grant update on table "public"."inbody_records" to "anon";

grant delete on table "public"."inbody_records" to "authenticated";

grant insert on table "public"."inbody_records" to "authenticated";

grant references on table "public"."inbody_records" to "authenticated";

grant select on table "public"."inbody_records" to "authenticated";

grant trigger on table "public"."inbody_records" to "authenticated";

grant truncate on table "public"."inbody_records" to "authenticated";

grant update on table "public"."inbody_records" to "authenticated";

grant delete on table "public"."inbody_records" to "service_role";

grant insert on table "public"."inbody_records" to "service_role";

grant references on table "public"."inbody_records" to "service_role";

grant select on table "public"."inbody_records" to "service_role";

grant trigger on table "public"."inbody_records" to "service_role";

grant truncate on table "public"."inbody_records" to "service_role";

grant update on table "public"."inbody_records" to "service_role";

grant delete on table "public"."physio_cases" to "anon";

grant insert on table "public"."physio_cases" to "anon";

grant references on table "public"."physio_cases" to "anon";

grant select on table "public"."physio_cases" to "anon";

grant trigger on table "public"."physio_cases" to "anon";

grant truncate on table "public"."physio_cases" to "anon";

grant update on table "public"."physio_cases" to "anon";

grant delete on table "public"."physio_cases" to "authenticated";

grant insert on table "public"."physio_cases" to "authenticated";

grant references on table "public"."physio_cases" to "authenticated";

grant select on table "public"."physio_cases" to "authenticated";

grant trigger on table "public"."physio_cases" to "authenticated";

grant truncate on table "public"."physio_cases" to "authenticated";

grant update on table "public"."physio_cases" to "authenticated";

grant delete on table "public"."physio_cases" to "service_role";

grant insert on table "public"."physio_cases" to "service_role";

grant references on table "public"."physio_cases" to "service_role";

grant select on table "public"."physio_cases" to "service_role";

grant trigger on table "public"."physio_cases" to "service_role";

grant truncate on table "public"."physio_cases" to "service_role";

grant update on table "public"."physio_cases" to "service_role";

grant delete on table "public"."physio_slots" to "anon";

grant insert on table "public"."physio_slots" to "anon";

grant references on table "public"."physio_slots" to "anon";

grant select on table "public"."physio_slots" to "anon";

grant trigger on table "public"."physio_slots" to "anon";

grant truncate on table "public"."physio_slots" to "anon";

grant update on table "public"."physio_slots" to "anon";

grant delete on table "public"."physio_slots" to "authenticated";

grant insert on table "public"."physio_slots" to "authenticated";

grant references on table "public"."physio_slots" to "authenticated";

grant select on table "public"."physio_slots" to "authenticated";

grant trigger on table "public"."physio_slots" to "authenticated";

grant truncate on table "public"."physio_slots" to "authenticated";

grant update on table "public"."physio_slots" to "authenticated";

grant delete on table "public"."physio_slots" to "service_role";

grant insert on table "public"."physio_slots" to "service_role";

grant references on table "public"."physio_slots" to "service_role";

grant select on table "public"."physio_slots" to "service_role";

grant trigger on table "public"."physio_slots" to "service_role";

grant truncate on table "public"."physio_slots" to "service_role";

grant update on table "public"."physio_slots" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."sc_programs" to "anon";

grant insert on table "public"."sc_programs" to "anon";

grant references on table "public"."sc_programs" to "anon";

grant select on table "public"."sc_programs" to "anon";

grant trigger on table "public"."sc_programs" to "anon";

grant truncate on table "public"."sc_programs" to "anon";

grant update on table "public"."sc_programs" to "anon";

grant delete on table "public"."sc_programs" to "authenticated";

grant insert on table "public"."sc_programs" to "authenticated";

grant references on table "public"."sc_programs" to "authenticated";

grant select on table "public"."sc_programs" to "authenticated";

grant trigger on table "public"."sc_programs" to "authenticated";

grant truncate on table "public"."sc_programs" to "authenticated";

grant update on table "public"."sc_programs" to "authenticated";

grant delete on table "public"."sc_programs" to "service_role";

grant insert on table "public"."sc_programs" to "service_role";

grant references on table "public"."sc_programs" to "service_role";

grant select on table "public"."sc_programs" to "service_role";

grant trigger on table "public"."sc_programs" to "service_role";

grant truncate on table "public"."sc_programs" to "service_role";

grant update on table "public"."sc_programs" to "service_role";

grant delete on table "public"."sport_fitness_tests" to "anon";

grant insert on table "public"."sport_fitness_tests" to "anon";

grant references on table "public"."sport_fitness_tests" to "anon";

grant select on table "public"."sport_fitness_tests" to "anon";

grant trigger on table "public"."sport_fitness_tests" to "anon";

grant truncate on table "public"."sport_fitness_tests" to "anon";

grant update on table "public"."sport_fitness_tests" to "anon";

grant delete on table "public"."sport_fitness_tests" to "authenticated";

grant insert on table "public"."sport_fitness_tests" to "authenticated";

grant references on table "public"."sport_fitness_tests" to "authenticated";

grant select on table "public"."sport_fitness_tests" to "authenticated";

grant trigger on table "public"."sport_fitness_tests" to "authenticated";

grant truncate on table "public"."sport_fitness_tests" to "authenticated";

grant update on table "public"."sport_fitness_tests" to "authenticated";

grant delete on table "public"."sport_fitness_tests" to "service_role";

grant insert on table "public"."sport_fitness_tests" to "service_role";

grant references on table "public"."sport_fitness_tests" to "service_role";

grant select on table "public"."sport_fitness_tests" to "service_role";

grant trigger on table "public"."sport_fitness_tests" to "service_role";

grant truncate on table "public"."sport_fitness_tests" to "service_role";

grant update on table "public"."sport_fitness_tests" to "service_role";

grant delete on table "public"."strength_conditioning" to "anon";

grant insert on table "public"."strength_conditioning" to "anon";

grant references on table "public"."strength_conditioning" to "anon";

grant select on table "public"."strength_conditioning" to "anon";

grant trigger on table "public"."strength_conditioning" to "anon";

grant truncate on table "public"."strength_conditioning" to "anon";

grant update on table "public"."strength_conditioning" to "anon";

grant delete on table "public"."strength_conditioning" to "authenticated";

grant insert on table "public"."strength_conditioning" to "authenticated";

grant references on table "public"."strength_conditioning" to "authenticated";

grant select on table "public"."strength_conditioning" to "authenticated";

grant trigger on table "public"."strength_conditioning" to "authenticated";

grant truncate on table "public"."strength_conditioning" to "authenticated";

grant update on table "public"."strength_conditioning" to "authenticated";

grant delete on table "public"."strength_conditioning" to "service_role";

grant insert on table "public"."strength_conditioning" to "service_role";

grant references on table "public"."strength_conditioning" to "service_role";

grant select on table "public"."strength_conditioning" to "service_role";

grant trigger on table "public"."strength_conditioning" to "service_role";

grant truncate on table "public"."strength_conditioning" to "service_role";

grant update on table "public"."strength_conditioning" to "service_role";

grant delete on table "public"."supplement_requests" to "anon";

grant insert on table "public"."supplement_requests" to "anon";

grant references on table "public"."supplement_requests" to "anon";

grant select on table "public"."supplement_requests" to "anon";

grant trigger on table "public"."supplement_requests" to "anon";

grant truncate on table "public"."supplement_requests" to "anon";

grant update on table "public"."supplement_requests" to "anon";

grant delete on table "public"."supplement_requests" to "authenticated";

grant insert on table "public"."supplement_requests" to "authenticated";

grant references on table "public"."supplement_requests" to "authenticated";

grant select on table "public"."supplement_requests" to "authenticated";

grant trigger on table "public"."supplement_requests" to "authenticated";

grant truncate on table "public"."supplement_requests" to "authenticated";

grant update on table "public"."supplement_requests" to "authenticated";

grant delete on table "public"."supplement_requests" to "service_role";

grant insert on table "public"."supplement_requests" to "service_role";

grant references on table "public"."supplement_requests" to "service_role";

grant select on table "public"."supplement_requests" to "service_role";

grant trigger on table "public"."supplement_requests" to "service_role";

grant truncate on table "public"."supplement_requests" to "service_role";

grant update on table "public"."supplement_requests" to "service_role";

grant delete on table "public"."supplements" to "anon";

grant insert on table "public"."supplements" to "anon";

grant references on table "public"."supplements" to "anon";

grant select on table "public"."supplements" to "anon";

grant trigger on table "public"."supplements" to "anon";

grant truncate on table "public"."supplements" to "anon";

grant update on table "public"."supplements" to "anon";

grant delete on table "public"."supplements" to "authenticated";

grant insert on table "public"."supplements" to "authenticated";

grant references on table "public"."supplements" to "authenticated";

grant select on table "public"."supplements" to "authenticated";

grant trigger on table "public"."supplements" to "authenticated";

grant truncate on table "public"."supplements" to "authenticated";

grant update on table "public"."supplements" to "authenticated";

grant delete on table "public"."supplements" to "service_role";

grant insert on table "public"."supplements" to "service_role";

grant references on table "public"."supplements" to "service_role";

grant select on table "public"."supplements" to "service_role";

grant trigger on table "public"."supplements" to "service_role";

grant truncate on table "public"."supplements" to "service_role";

grant update on table "public"."supplements" to "service_role";


  create policy "Admins full access to athletes"
  on "public"."athletes"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Athlete reads own record"
  on "public"."athletes"
  as permissive
  for select
  to public
using (((public.get_my_role() = 'athlete'::text) AND (id = auth.uid())));



  create policy "Authenticated users can read athletes"
  on "public"."athletes"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Coach reads all athletes"
  on "public"."athletes"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Physio/medical reads athletes"
  on "public"."athletes"
  as permissive
  for select
  to public
using ((public.get_my_role() = ANY (ARRAY['physio'::text, 'medical'::text])));



  create policy "Admins can read all audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Authenticated users can insert own audit logs"
  on "public"."audit_logs"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Authenticated users can read audit_logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "All authenticated can read schedule slots"
  on "public"."coach_schedule_slots"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Anyone authenticated can read slots"
  on "public"."coach_schedule_slots"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Coaches and admins can delete schedule slots"
  on "public"."coach_schedule_slots"
  as permissive
  for delete
  to public
using (((schedule_id IN ( SELECT coach_schedules.id
   FROM public.coach_schedules
  WHERE (coach_schedules.coach_id = auth.uid()))) OR (public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text]))));



  create policy "Coaches and admins can manage slots"
  on "public"."coach_schedule_slots"
  as permissive
  for all
  to public
using ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['superadmin'::text, 'admin'::text, 'coach'::text])));



  create policy "Coaches can manage own schedule slots"
  on "public"."coach_schedule_slots"
  as permissive
  for all
  to public
using (((schedule_id IN ( SELECT coach_schedules.id
   FROM public.coach_schedules
  WHERE (coach_schedules.coach_id = auth.uid()))) OR (public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text]))));



  create policy "All authenticated can read coach schedules"
  on "public"."coach_schedules"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Anyone authenticated can read schedules"
  on "public"."coach_schedules"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Coaches and admins can create schedules"
  on "public"."coach_schedules"
  as permissive
  for insert
  to public
with check (((coach_id = auth.uid()) OR (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['superadmin'::text, 'admin'::text]))));



  create policy "Coaches and admins can delete schedules"
  on "public"."coach_schedules"
  as permissive
  for delete
  to public
using (((coach_id = auth.uid()) OR (public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text]))));



  create policy "Coaches can manage own schedules"
  on "public"."coach_schedules"
  as permissive
  for all
  to public
using (((coach_id = auth.uid()) OR (public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text]))));



  create policy "allow read"
  on "public"."fitness_test_definitions"
  as permissive
  for select
  to public
using (true);



  create policy "allow read"
  on "public"."fitness_test_norms"
  as permissive
  for select
  to public
using (true);



  create policy "Admins full access to fitness_test_results"
  on "public"."fitness_test_results"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Coach reads all fitness_test_results"
  on "public"."fitness_test_results"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Medical reads all fitness_test_results"
  on "public"."fitness_test_results"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'medical'::text));



  create policy "Staff can insert fitness_test_results"
  on "public"."fitness_test_results"
  as permissive
  for insert
  to public
with check ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text, 'coach'::text, 'medical'::text])));



  create policy "allow all"
  on "public"."fitness_test_results"
  as permissive
  for all
  to public
using ((auth.uid() IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'coach'::text])))));



  create policy "allow read"
  on "public"."fitness_test_results"
  as permissive
  for select
  to public
using (true);



  create policy "Admins full access to fitness_test_sessions"
  on "public"."fitness_test_sessions"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Coach reads all fitness_test_sessions"
  on "public"."fitness_test_sessions"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Medical reads all fitness_test_sessions"
  on "public"."fitness_test_sessions"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'medical'::text));



  create policy "Staff can insert fitness_test_sessions"
  on "public"."fitness_test_sessions"
  as permissive
  for insert
  to public
with check ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text, 'coach'::text, 'medical'::text])));



  create policy "allow all"
  on "public"."fitness_test_sessions"
  as permissive
  for all
  to public
using ((auth.uid() IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'coach'::text])))));



  create policy "allow read"
  on "public"."fitness_test_sessions"
  as permissive
  for select
  to public
using (true);



  create policy "Admins full access to fitness_tests"
  on "public"."fitness_tests"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Athlete reads own fitness_tests"
  on "public"."fitness_tests"
  as permissive
  for select
  to public
using (((public.get_my_role() = 'athlete'::text) AND (athlete_id = auth.uid())));



  create policy "Coach reads all fitness_tests"
  on "public"."fitness_tests"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Staff can insert fitness_tests"
  on "public"."fitness_tests"
  as permissive
  for insert
  to public
with check ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text, 'coach'::text, 'medical'::text])));



  create policy "Admins full access to inbody_records"
  on "public"."inbody_records"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Athlete reads own inbody"
  on "public"."inbody_records"
  as permissive
  for select
  to public
using (((public.get_my_role() = 'athlete'::text) AND (athlete_id = auth.uid())));



  create policy "Coach reads all inbody_records"
  on "public"."inbody_records"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Medical/coach can insert inbody_records"
  on "public"."inbody_records"
  as permissive
  for insert
  to public
with check ((public.get_my_role() = ANY (ARRAY['medical'::text, 'coach'::text, 'admin'::text, 'superadmin'::text])));



  create policy "Admins full access to physio_cases"
  on "public"."physio_cases"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Physio reads active cases"
  on "public"."physio_cases"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'physio'::text));



  create policy "physio_cases: full access"
  on "public"."physio_cases"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Admins full access to physio_slots"
  on "public"."physio_slots"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Coach reads all physio slots"
  on "public"."physio_slots"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Physio manages all slots"
  on "public"."physio_slots"
  as permissive
  for all
  to public
using ((public.get_my_role() = 'physio'::text));



  create policy "Admins can read all profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Admins can update profiles"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Allow insert on profiles"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check (true);



  create policy "Authenticated users can read profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Users can read own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((id = auth.uid()));



  create policy "Admins full access to sc_programs"
  on "public"."sc_programs"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Coaches can insert sc_programs"
  on "public"."sc_programs"
  as permissive
  for insert
  to public
with check ((public.get_my_role() = 'coach'::text));



  create policy "Coaches can read sc_programs"
  on "public"."sc_programs"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Coaches can update sc_programs"
  on "public"."sc_programs"
  as permissive
  for update
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "allow insert/update/delete"
  on "public"."sport_fitness_tests"
  as permissive
  for all
  to public
using ((auth.uid() IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'coach'::text])))));



  create policy "allow read"
  on "public"."sport_fitness_tests"
  as permissive
  for select
  to public
using (true);



  create policy "Admins full access to strength_conditioning"
  on "public"."strength_conditioning"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Coach accesses all strength_conditioning"
  on "public"."strength_conditioning"
  as permissive
  for all
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Admins/medical full access to supplement_requests"
  on "public"."supplement_requests"
  as permissive
  for all
  to public
using ((public.get_my_role() = ANY (ARRAY['superadmin'::text, 'admin'::text, 'medical'::text])));



  create policy "Authenticated users can read supplement_requests"
  on "public"."supplement_requests"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Coach can request supplements"
  on "public"."supplement_requests"
  as permissive
  for insert
  to public
with check ((public.get_my_role() = 'coach'::text));



  create policy "Coach reads all requests"
  on "public"."supplement_requests"
  as permissive
  for select
  to public
using ((public.get_my_role() = 'coach'::text));



  create policy "Admins delete supplements"
  on "public"."supplements"
  as permissive
  for delete
  to authenticated
using (((auth.jwt() ->> 'user_role'::text) = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Admins insert supplements"
  on "public"."supplements"
  as permissive
  for insert
  to authenticated
with check (((auth.jwt() ->> 'user_role'::text) = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Admins update supplements"
  on "public"."supplements"
  as permissive
  for update
  to authenticated
using (((auth.jwt() ->> 'user_role'::text) = ANY (ARRAY['superadmin'::text, 'admin'::text])));



  create policy "Authenticated users can update supplement stock"
  on "public"."supplements"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Read supplements for all"
  on "public"."supplements"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER on_supplement_approved AFTER UPDATE ON public.supplement_requests FOR EACH ROW EXECUTE FUNCTION public.handle_supplement_approval();


  create policy "Allow authenticated users to upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'inbody_diet_plans'::text));



  create policy "Allow public read access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'inbody_diet_plans'::text));



  create policy "Allow users to delete own files"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'inbody_diet_plans'::text));



  create policy "Auth delete athlete photos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'athlete-photos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Auth update athlete photos"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'athlete-photos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Auth upload athlete photos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'athlete-photos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Public read athlete photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'athlete-photos'::text));



