-- ============================================================================
-- Adds Edit/Padam support for supplement_requests (Permohonan Suplemen),
-- gated by the same "Pengurusan Suplemen" Kemaskini/Padam checkboxes that
-- already govern the Inventori tab (no separate Permohonan checklist item
-- exists yet, per client decision).
--
-- Before this migration:
--   - There was NO delete policy on supplement_requests at all -- nobody
--     (not even admin/superadmin) could delete a request via the app.
--   - UPDATE was only possible through the coordinator/supporter policies,
--     which exist purely to move status forward through the approval
--     workflow (pending -> semakan_lulus/semakan_tolak -> approved/rejected).
--     There was no way to edit a request's own details (sport, supplement,
--     quantity, pemohon_name).
--
-- This migration adds:
--   1. A DELETE policy, any status, gated by has_module_permission('supplement','delete').
--   2. A general UPDATE policy for editing a request's own details, gated by
--      has_module_permission('supplement','update') -- but restricted via
--      USING+WITH CHECK to status = 'pending' only, so it can never be used
--      to edit a request that a coordinator/supporter/approver has already
--      acted on (which would make their recorded decision apply to a
--      different item/quantity than what they actually reviewed).
--
-- Also widens the audit_logs.action allowlist to accept the two new audit
-- actions this feature logs (edit_supplement_request, delete_supplement_request)
-- -- logAction() inserts would otherwise violate audit_logs_action_check.
--
-- Safe to run more than once.
-- Run in the Supabase SQL editor (or `supabase db push`) on the client project.
-- ============================================================================

ALTER TABLE "public"."audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_action_check";
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY[
    'login'::"text", 'logout'::"text", 'change_password'::"text",
    'create_user'::"text", 'edit_user'::"text", 'delete_user'::"text", 'update_own_profile'::"text",
    'create_athlete'::"text", 'update_athlete'::"text", 'delete_athlete'::"text",
    'create_coach_schedule'::"text", 'update_coach_schedule'::"text", 'delete_coach_schedule'::"text", 'delete_coach_schedule_slot'::"text", 'create_coach_assignment'::"text", 'update_coach_assignment'::"text",
    'create_sc_session'::"text", 'update_sc_session'::"text", 'create_sc_program'::"text", 'update_sc_program'::"text",
    'create_physio_slot'::"text", 'update_physio_slot'::"text", 'delete_physio_slot'::"text", 'mark_arrived_physio_slot'::"text",
    'create_physio_case'::"text", 'close_physio_case'::"text", 'delete_physio_case'::"text", 'open_physio_case'::"text", 'refer_physio_case'::"text",
    'create_inbody'::"text", 'update_inbody'::"text", 'upload_inbody_diet_plan'::"text", 'delete_inbody_diet_plan'::"text",
    'create_supplement'::"text", 'update_supplement'::"text", 'delete_supplement'::"text", 'submit_supplement_request'::"text", 'edit_supplement_request'::"text", 'delete_supplement_request'::"text",
    'koordinator_approve_supplement'::"text", 'koordinator_reject_supplement'::"text", 'approve_supplement'::"text", 'approve_supplement_partial'::"text", 'supporter_approve_supplement'::"text", 'supporter_reject_supplement'::"text",
    'submit_fitness_tests'::"text"
])));

DROP POLICY IF EXISTS "supplement_requests: delete" ON "public"."supplement_requests";
CREATE POLICY "supplement_requests: delete" ON "public"."supplement_requests"
  FOR DELETE USING (
    ("auth"."role"() = 'authenticated'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('supplement'::"text", 'delete'::"text")
    )
  );

DROP POLICY IF EXISTS "supplement_requests: general update" ON "public"."supplement_requests";
CREATE POLICY "supplement_requests: general update" ON "public"."supplement_requests"
  FOR UPDATE USING (
    ("auth"."role"() = 'authenticated'::"text")
    AND ("status" = 'pending'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('supplement'::"text", 'update'::"text")
    )
  ) WITH CHECK (
    ("auth"."role"() = 'authenticated'::"text")
    AND ("status" = 'pending'::"text")
    AND (
      ("public"."get_my_role"() = ANY (ARRAY['superadmin'::"text", 'admin'::"text"]))
      OR "public"."has_module_permission"('supplement'::"text", 'update'::"text")
    )
  );
