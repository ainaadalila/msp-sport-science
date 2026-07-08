


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select role from profiles where id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  full_name_val text;
BEGIN
  full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', new.email);

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    full_name_val,
    'pegawai_belia_sukan'
  );

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_supplement_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    update supplements
    set stock = stock - new.quantity
    where id = new.supplement_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_supplement_approval"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "ic_number" "text" NOT NULL,
    "category" "text",
    "weight" numeric,
    "height" numeric,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "date_of_birth" "date",
    "gender" "text",
    "photo_url" "text",
    "is_elite" boolean DEFAULT false NOT NULL,
    "sport_id" "uuid" NOT NULL,
    CONSTRAINT "athletes_gender_check" CHECK (("gender" = ANY (ARRAY['M'::"text", 'F'::"text"]))),
    CONSTRAINT "athletes_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'rest'::"text", 'injured'::"text", 'not_active'::"text"])))
);


ALTER TABLE "public"."athletes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "target_table" "text",
    "target_id" "uuid",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_schedule_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "slot_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coach_schedule_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coach_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coach_id" "uuid",
    "sport" "text" NOT NULL,
    "schedule_name" "text" NOT NULL,
    "valid_from" "date" NOT NULL,
    "repeats" boolean DEFAULT false,
    "repeat_pattern" "text",
    "repeat_until" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coach_schedules_repeat_pattern_check" CHECK (("repeat_pattern" = ANY (ARRAY['weekly'::"text", 'bi-weekly'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."coach_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitness_test_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fitness_test_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitness_test_norms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "gender" "text" NOT NULL,
    "good_min" numeric,
    "good_max" numeric,
    "average_min" numeric,
    "average_max" numeric,
    "poor_min" numeric,
    "poor_max" numeric,
    "rating_direction" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fitness_test_norms_gender_check" CHECK (("gender" = ANY (ARRAY['M'::"text", 'F'::"text", 'both'::"text"]))),
    CONSTRAINT "fitness_test_norms_rating_direction_check" CHECK (("rating_direction" = ANY (ARRAY['higher_is_better'::"text", 'lower_is_better'::"text"])))
);


ALTER TABLE "public"."fitness_test_norms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitness_test_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "test_id" "uuid" NOT NULL,
    "result_value" numeric NOT NULL,
    "rating" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fitness_test_results_rating_check" CHECK (("rating" = ANY (ARRAY['baik'::"text", 'sederhana'::"text", 'lemah'::"text", 'not_rated'::"text"])))
);


ALTER TABLE "public"."fitness_test_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitness_test_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "session" "text" NOT NULL,
    "year" integer NOT NULL,
    "recorded_date" "date" NOT NULL,
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fitness_test_sessions_session_check" CHECK (("session" = ANY (ARRAY['Fasa 1'::"text", 'Fasa 2'::"text", 'Fasa 3'::"text", 'Fasa 4'::"text"])))
);


ALTER TABLE "public"."fitness_test_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inbody_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "recorded_date" "date" NOT NULL,
    "weight" numeric,
    "smm" numeric,
    "bmi" numeric,
    "fat_pct" numeric,
    "inbody_score" integer,
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "body_fat_mass" numeric(5,1),
    "bmr" integer,
    "skor" smallint,
    "ulasan" "text",
    "diet_plan_url" "text",
    "diet_plan_name" "text",
    "catatan" "text"
);


ALTER TABLE "public"."inbody_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physio_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid",
    "open_date" "date" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "rts_date" "date",
    "close_reason" "text",
    "referred_to" "text",
    "physio_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "injury_type" "text",
    "referred_to_doctor" boolean DEFAULT false NOT NULL,
    "referred_date" "date",
    CONSTRAINT "physio_cases_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."physio_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physio_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slot_date" "date" NOT NULL,
    "athlete_id" "uuid",
    "injury_type" "text",
    "session_type" "text",
    "assessment_notes" "text",
    "rehab_plan" "text",
    "physiotherapist_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "pain_scale" integer,
    "target_muscle" "text",
    "attendance_status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "case_id" "uuid",
    "diagnosis" "text",
    "date_of_injury" "date",
    "referred_by" "text",
    "chief_complaint" "text",
    "duration_minutes" integer,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "physio_slots_attendance_status_check" CHECK (("attendance_status" = ANY (ARRAY['scheduled'::"text", 'arrived'::"text", 'completed'::"text", 'no_show'::"text"]))),
    CONSTRAINT "physio_slots_pain_scale_check" CHECK ((("pain_scale" >= 0) AND ("pain_scale" <= 10))),
    CONSTRAINT "physio_slots_session_type_check" CHECK (("session_type" = ANY (ARRAY['standard'::"text", 'manual'::"text", 'injury'::"text"])))
);


ALTER TABLE "public"."physio_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "module_permissions" "jsonb" DEFAULT "jsonb_build_object"('athletes', true, 'inbody', true, 'supplement', true, 'physio', true, 'fitness', true, 'strength', true, 'reports', true, 'supplement_coordinator', false, 'supplement_supporter', false, 'supplement_approver', false) NOT NULL,
    "ic_number" "text",
    "unit" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['superadmin'::"text", 'admin'::"text", 'coach'::"text", 'physio'::"text", 'psikologis'::"text", 'penolong_pegawai'::"text", 'pegawai_belia_sukan'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."ic_number" IS 'User IC number or identification number';



COMMENT ON COLUMN "public"."profiles"."unit" IS 'User department or organizational unit';



CREATE TABLE IF NOT EXISTS "public"."psychology_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "phase" "text" NOT NULL,
    "cognitive_anxiety_score" integer,
    "somatic_anxiety_score" integer,
    "self_confidence_score" integer,
    "raw_responses" "jsonb",
    "assessment_date" "date" NOT NULL,
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "catatan" "text"
);


ALTER TABLE "public"."psychology_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sc_programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sport" "text" NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "coach_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "program_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "structured_data" "jsonb",
    "start_date" "date",
    "end_date" "date",
    CONSTRAINT "sc_programs_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."sc_programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sport_fitness_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sport" "text" NOT NULL,
    "test_id" "uuid" NOT NULL,
    "is_mandatory" boolean DEFAULT false,
    "custom_name" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sport_fitness_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."strength_conditioning" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "session_date" "date" NOT NULL,
    "attendance" "text" NOT NULL,
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "strength_conditioning_attendance_check" CHECK (("attendance" = ANY (ARRAY['present'::"text", 'absent'::"text", 'mc'::"text"])))
);


ALTER TABLE "public"."strength_conditioning" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplement_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplement_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "request_date" "date" DEFAULT CURRENT_DATE,
    "status" "text" DEFAULT 'pending'::"text",
    "requested_by" "uuid",
    "reviewed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sport" "text",
    "coordinator_notes" "text",
    "coordinator_id" "uuid",
    "approved_quantity" integer,
    "supporter_id" "uuid",
    "supporter_status" "text",
    "supporter_notes" "text",
    "supporter_reviewed_at" timestamp with time zone,
    "pemohon_name" "text",
    CONSTRAINT "supplement_requests_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "supplement_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'semakan_lulus'::"text", 'semakan_tolak'::"text", 'approved'::"text", 'partial'::"text"]))),
    CONSTRAINT "supplement_requests_supporter_status_check" CHECK (("supporter_status" = ANY (ARRAY['sokong'::"text", 'tidak_sokong'::"text"])))
);


ALTER TABLE "public"."supplement_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."supplement_requests"."pemohon_name" IS 'Name of the person requesting the supplement (applicant name)';



CREATE TABLE IF NOT EXISTS "public"."supplements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "stock" integer DEFAULT 0,
    "unit" "text" DEFAULT 'unit'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expiry_date" "date"
);


ALTER TABLE "public"."supplements" OWNER TO "postgres";


ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_ic_number_key" UNIQUE ("ic_number");



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_schedule_slots"
    ADD CONSTRAINT "coach_schedule_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coach_schedule_slots"
    ADD CONSTRAINT "coach_schedule_slots_schedule_id_slot_date_start_time_key" UNIQUE ("schedule_id", "slot_date", "start_time");



ALTER TABLE ONLY "public"."coach_schedules"
    ADD CONSTRAINT "coach_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitness_test_definitions"
    ADD CONSTRAINT "fitness_test_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitness_test_definitions"
    ADD CONSTRAINT "fitness_test_definitions_test_name_key" UNIQUE ("test_name");



ALTER TABLE ONLY "public"."fitness_test_norms"
    ADD CONSTRAINT "fitness_test_norms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitness_test_norms"
    ADD CONSTRAINT "fitness_test_norms_test_id_gender_key" UNIQUE ("test_id", "gender");



ALTER TABLE ONLY "public"."fitness_test_results"
    ADD CONSTRAINT "fitness_test_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitness_test_results"
    ADD CONSTRAINT "fitness_test_results_session_id_test_id_key" UNIQUE ("session_id", "test_id");



ALTER TABLE ONLY "public"."fitness_test_sessions"
    ADD CONSTRAINT "fitness_test_sessions_athlete_id_session_year_key" UNIQUE ("athlete_id", "session", "year");



ALTER TABLE ONLY "public"."fitness_test_sessions"
    ADD CONSTRAINT "fitness_test_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inbody_records"
    ADD CONSTRAINT "inbody_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physio_cases"
    ADD CONSTRAINT "physio_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physio_slots"
    ADD CONSTRAINT "physio_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."psychology_ratings"
    ADD CONSTRAINT "psychology_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sc_programs"
    ADD CONSTRAINT "sc_programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sport_fitness_tests"
    ADD CONSTRAINT "sport_fitness_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sport_fitness_tests"
    ADD CONSTRAINT "sport_fitness_tests_sport_test_id_key" UNIQUE ("sport", "test_id");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."strength_conditioning"
    ADD CONSTRAINT "strength_conditioning_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplement_requests"
    ADD CONSTRAINT "supplement_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplements"
    ADD CONSTRAINT "supplements_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_athletes_sport_id" ON "public"."athletes" USING "btree" ("sport_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_inbody_records_athlete_id" ON "public"."inbody_records" USING "btree" ("athlete_id");



CREATE INDEX "idx_physio_cases_athlete_id" ON "public"."physio_cases" USING "btree" ("athlete_id");



CREATE INDEX "idx_physio_slots_athlete_id" ON "public"."physio_slots" USING "btree" ("athlete_id");



CREATE INDEX "idx_physio_slots_physiotherapist_id" ON "public"."physio_slots" USING "btree" ("physiotherapist_id");



CREATE INDEX "idx_strength_conditioning_athlete_id" ON "public"."strength_conditioning" USING "btree" ("athlete_id");



CREATE INDEX "idx_supplement_requests_coordinator_id" ON "public"."supplement_requests" USING "btree" ("coordinator_id");



CREATE INDEX "idx_supplement_requests_created_at" ON "public"."supplement_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_supplement_requests_status" ON "public"."supplement_requests" USING "btree" ("status");



CREATE INDEX "idx_supplement_requests_status_created" ON "public"."supplement_requests" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_supplement_requests_supporter_id" ON "public"."supplement_requests" USING "btree" ("supporter_id");



CREATE OR REPLACE TRIGGER "on_supplement_approved" AFTER UPDATE ON "public"."supplement_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_supplement_approval"();



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coach_schedule_slots"
    ADD CONSTRAINT "coach_schedule_slots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."coach_schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coach_schedules"
    ADD CONSTRAINT "coach_schedules_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fitness_test_norms"
    ADD CONSTRAINT "fitness_test_norms_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."fitness_test_definitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitness_test_results"
    ADD CONSTRAINT "fitness_test_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."fitness_test_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitness_test_results"
    ADD CONSTRAINT "fitness_test_results_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."fitness_test_definitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitness_test_sessions"
    ADD CONSTRAINT "fitness_test_sessions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitness_test_sessions"
    ADD CONSTRAINT "fitness_test_sessions_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inbody_records"
    ADD CONSTRAINT "inbody_records_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inbody_records"
    ADD CONSTRAINT "inbody_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_cases"
    ADD CONSTRAINT "physio_cases_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_cases"
    ADD CONSTRAINT "physio_cases_physio_id_fkey" FOREIGN KEY ("physio_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_slots"
    ADD CONSTRAINT "physio_slots_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id");



ALTER TABLE ONLY "public"."physio_slots"
    ADD CONSTRAINT "physio_slots_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."physio_cases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_slots"
    ADD CONSTRAINT "physio_slots_physiotherapist_id_fkey" FOREIGN KEY ("physiotherapist_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."psychology_ratings"
    ADD CONSTRAINT "psychology_ratings_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."psychology_ratings"
    ADD CONSTRAINT "psychology_ratings_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sc_programs"
    ADD CONSTRAINT "sc_programs_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sport_fitness_tests"
    ADD CONSTRAINT "sport_fitness_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sport_fitness_tests"
    ADD CONSTRAINT "sport_fitness_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."fitness_test_definitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."strength_conditioning"
    ADD CONSTRAINT "strength_conditioning_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."strength_conditioning"
    ADD CONSTRAINT "strength_conditioning_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_requests"
    ADD CONSTRAINT "supplement_requests_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_requests"
    ADD CONSTRAINT "supplement_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_requests"
    ADD CONSTRAINT "supplement_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplement_requests"
    ADD CONSTRAINT "supplement_requests_supplement_id_fkey" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id");



ALTER TABLE ONLY "public"."supplement_requests"
    ADD CONSTRAINT "supplement_requests_supporter_id_fkey" FOREIGN KEY ("supporter_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."athletes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "athletes: admin delete" ON "public"."athletes" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "athletes: admin update" ON "public"."athletes" FOR UPDATE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))) WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "athletes: admin write" ON "public"."athletes" FOR INSERT WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "athletes: read" ON "public"."athletes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs: admin read" ON "public"."audit_logs" FOR SELECT USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "audit_logs: insert own" ON "public"."audit_logs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."coach_schedule_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_schedule_slots: admin delete" ON "public"."coach_schedule_slots" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "coach_schedule_slots: insert" ON "public"."coach_schedule_slots" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "coach_schedule_slots: read" ON "public"."coach_schedule_slots" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "coach_schedule_slots: update" ON "public"."coach_schedule_slots" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."coach_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach_schedules: admin delete" ON "public"."coach_schedules" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "coach_schedules: insert" ON "public"."coach_schedules" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "coach_schedules: read" ON "public"."coach_schedules" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "coach_schedules: update" ON "public"."coach_schedules" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."fitness_test_definitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fitness_test_definitions: admin write" ON "public"."fitness_test_definitions" USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))) WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "fitness_test_definitions: read" ON "public"."fitness_test_definitions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."fitness_test_norms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fitness_test_norms: admin write" ON "public"."fitness_test_norms" USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))) WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "fitness_test_norms: read" ON "public"."fitness_test_norms" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."fitness_test_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fitness_test_results: admin delete" ON "public"."fitness_test_results" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "fitness_test_results: insert" ON "public"."fitness_test_results" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "fitness_test_results: read" ON "public"."fitness_test_results" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "fitness_test_results: update" ON "public"."fitness_test_results" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."fitness_test_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fitness_test_sessions: admin delete" ON "public"."fitness_test_sessions" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "fitness_test_sessions: insert" ON "public"."fitness_test_sessions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "fitness_test_sessions: read" ON "public"."fitness_test_sessions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "fitness_test_sessions: update" ON "public"."fitness_test_sessions" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."inbody_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inbody_records: admin delete" ON "public"."inbody_records" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "inbody_records: insert" ON "public"."inbody_records" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inbody_records: read" ON "public"."inbody_records" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inbody_records: update" ON "public"."inbody_records" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."physio_cases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physio_cases: admin delete" ON "public"."physio_cases" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "physio_cases: insert" ON "public"."physio_cases" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "physio_cases: read" ON "public"."physio_cases" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "physio_cases: update" ON "public"."physio_cases" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."physio_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physio_slots: admin delete" ON "public"."physio_slots" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "physio_slots: insert" ON "public"."physio_slots" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "physio_slots: read" ON "public"."physio_slots" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "physio_slots: update" ON "public"."physio_slots" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles: admin write" ON "public"."profiles" FOR UPDATE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))) WITH CHECK ((("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])) AND ("id" <> "auth"."uid"()) AND (("public"."get_my_role"() = 'superadmin'::"text") OR ("role" <> 'superadmin'::"text"))));



CREATE POLICY "profiles: read" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."psychology_ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "psychology_ratings: admin delete" ON "public"."psychology_ratings" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "psychology_ratings: insert" ON "public"."psychology_ratings" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "psychology_ratings: read" ON "public"."psychology_ratings" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "psychology_ratings: update" ON "public"."psychology_ratings" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."sc_programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sc_programs: admin delete" ON "public"."sc_programs" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "sc_programs: insert" ON "public"."sc_programs" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "sc_programs: read" ON "public"."sc_programs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "sc_programs: update" ON "public"."sc_programs" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."sport_fitness_tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sport_fitness_tests: admin write" ON "public"."sport_fitness_tests" USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))) WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "sport_fitness_tests: read" ON "public"."sport_fitness_tests" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."sports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sports: admin write" ON "public"."sports" USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))) WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "sports: read" ON "public"."sports" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."strength_conditioning" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "strength_conditioning: admin delete" ON "public"."strength_conditioning" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "strength_conditioning: insert" ON "public"."strength_conditioning" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "strength_conditioning: read" ON "public"."strength_conditioning" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "strength_conditioning: update" ON "public"."strength_conditioning" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."supplement_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplement_requests: admin update" ON "public"."supplement_requests" FOR UPDATE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))) WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "supplement_requests: insert own" ON "public"."supplement_requests" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "supplement_requests: read" ON "public"."supplement_requests" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."supplements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supplements: admin delete" ON "public"."supplements" FOR DELETE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "supplements: admin update" ON "public"."supplements" FOR UPDATE USING (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))) WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "supplements: admin write" ON "public"."supplements" FOR INSERT WITH CHECK (("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"])));



CREATE POLICY "supplements: read" ON "public"."supplements" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_supplement_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_supplement_approval"() TO "service_role";


















GRANT ALL ON TABLE "public"."athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."athletes" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."coach_schedule_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_schedule_slots" TO "service_role";



GRANT ALL ON TABLE "public"."coach_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."coach_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."fitness_test_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."fitness_test_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."fitness_test_norms" TO "authenticated";
GRANT ALL ON TABLE "public"."fitness_test_norms" TO "service_role";



GRANT ALL ON TABLE "public"."fitness_test_results" TO "authenticated";
GRANT ALL ON TABLE "public"."fitness_test_results" TO "service_role";



GRANT ALL ON TABLE "public"."fitness_test_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."fitness_test_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."inbody_records" TO "authenticated";
GRANT ALL ON TABLE "public"."inbody_records" TO "service_role";



GRANT ALL ON TABLE "public"."physio_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."physio_cases" TO "service_role";



GRANT ALL ON TABLE "public"."physio_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."physio_slots" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."psychology_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."psychology_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."sc_programs" TO "authenticated";
GRANT ALL ON TABLE "public"."sc_programs" TO "service_role";



GRANT ALL ON TABLE "public"."sport_fitness_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."sport_fitness_tests" TO "service_role";



GRANT ALL ON TABLE "public"."sports" TO "authenticated";
GRANT ALL ON TABLE "public"."sports" TO "service_role";



GRANT ALL ON TABLE "public"."strength_conditioning" TO "authenticated";
GRANT ALL ON TABLE "public"."strength_conditioning" TO "service_role";



GRANT ALL ON TABLE "public"."supplement_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."supplement_requests" TO "service_role";



GRANT ALL ON TABLE "public"."supplements" TO "authenticated";
GRANT ALL ON TABLE "public"."supplements" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































