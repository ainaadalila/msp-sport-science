-- ============================================================================
-- Aligns INSERT/UPDATE/DELETE RLS policies on the supplements catalog table
-- with the module-permission checkboxes for Pengurusan Suplemen. This table
-- was previously superadmin/admin-only for all writes (intentionally, as
-- master/reference data, pending client sign-off) -- the client has now
-- signed off on making it follow the same checkbox-driven shape used by
-- every other operational table (fitness_test_sessions, psychology_ratings,
-- etc).
--
-- The Edit/Padam/Tambah Suplemen buttons on the Inventori tab already check
-- can('supplement', 'update'/'delete'/'create') client-side -- this migration
-- is what makes the database actually honor those checkboxes.
--
-- Safe to run more than once.
-- Run in the Supabase SQL editor (or `supabase db push`) on the client project.
-- ============================================================================

DROP POLICY IF EXISTS "supplements: admin delete" ON "public"."supplements";
DROP POLICY IF EXISTS "supplements: delete"       ON "public"."supplements";
CREATE POLICY "supplements: delete" ON "public"."supplements"
  FOR DELETE USING (
    ("auth"."role"() = 'authenticated'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('supplement'::"text", 'delete'::"text")
    )
  );

DROP POLICY IF EXISTS "supplements: admin update" ON "public"."supplements";
DROP POLICY IF EXISTS "supplements: update"       ON "public"."supplements";
CREATE POLICY "supplements: update" ON "public"."supplements"
  FOR UPDATE USING (
    ("auth"."role"() = 'authenticated'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('supplement'::"text", 'update'::"text")
    )
  ) WITH CHECK (
    ("auth"."role"() = 'authenticated'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('supplement'::"text", 'update'::"text")
    )
  );

DROP POLICY IF EXISTS "supplements: admin write" ON "public"."supplements";
DROP POLICY IF EXISTS "supplements: insert"       ON "public"."supplements";
CREATE POLICY "supplements: insert" ON "public"."supplements"
  FOR INSERT WITH CHECK (
    ("auth"."role"() = 'authenticated'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('supplement'::"text", 'create'::"text")
    )
  );
