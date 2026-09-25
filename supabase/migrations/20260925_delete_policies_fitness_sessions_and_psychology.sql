-- ============================================================================
-- Aligns DELETE RLS policies with the module-permission checkboxes for the
-- two tables that currently have a "Padam" button in the UI:
--   fitness_test_sessions -> fitness    (Sejarah Ujian Kecergasan)
--   psychology_ratings    -> psychology (Penilaian Psikologi)
--
-- Both tables' INSERT/UPDATE policies already check has_module_permission();
-- only DELETE was left as superadmin/admin-only from the earlier F-10 pass.
-- This brings DELETE in line with the same shape, scoped to only these two
-- tables (the ones with delete UI today) -- not a blanket sweep of every
-- operational table.
--
-- Deleting a fitness_test_sessions row cascades to its fitness_test_results
-- rows (ON DELETE CASCADE already in schema), so no separate policy change
-- is needed there.
--
-- Safe to run more than once.
-- Run in the Supabase SQL editor (or `supabase db push`) on the client project.
-- ============================================================================

-- fitness_test_sessions ------------------------------------------------------
DROP POLICY IF EXISTS "fitness_test_sessions: admin delete" ON "public"."fitness_test_sessions";
DROP POLICY IF EXISTS "fitness_test_sessions: delete"       ON "public"."fitness_test_sessions";
CREATE POLICY "fitness_test_sessions: delete" ON "public"."fitness_test_sessions"
  FOR DELETE USING (
    ("auth"."role"() = 'authenticated'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('fitness'::"text", 'delete'::"text")
    )
  );

-- psychology_ratings ----------------------------------------------------------
DROP POLICY IF EXISTS "psychology_ratings: admin delete" ON "public"."psychology_ratings";
DROP POLICY IF EXISTS "psychology_ratings: delete"       ON "public"."psychology_ratings";
CREATE POLICY "psychology_ratings: delete" ON "public"."psychology_ratings"
  FOR DELETE USING (
    ("auth"."role"() = 'authenticated'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('psychology'::"text", 'delete'::"text")
    )
  );
