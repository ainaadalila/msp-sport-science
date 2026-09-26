-- ============================================================================
-- Removes the Penyelaras Semak (coordinator) step from the Permohonan
-- Suplemen approval workflow. New flow: pending -> Penyokong (Sokong/Tidak
-- Sokong) -> Pegawai Pelulus (Lulus Penuh/Sebahagian), same as before minus
-- the coordinator step in front.
--
-- 1. Drops the coordinator UPDATE policy entirely -- Penyelaras Semak no
--    longer has any way to touch a request via RLS, regardless of whether
--    someone's profile still has supplement_coordinator = true.
--
-- 2. Widens the supporter UPDATE policy so Penyokong can act directly on
--    'pending' requests (previously only 'semakan_lulus', which only
--    existed once a coordinator had approved it). USING also still allows
--    'semakan_lulus' so any request that was already coordinator-approved
--    before this migration runs keeps working exactly as before. WITH CHECK
--    allows the result to land on either 'semakan_lulus' (sokong) or the
--    terminal 'semakan_tolak' (tidak sokong).
--
-- 3. Fixes approve_supplement_request(): it hard-required
--    get_my_role() IN ('superadmin','admin'), so a non-admin Pegawai Pelulus
--    could never actually approve anything despite the UI showing them the
--    Lulus Penuh/Lulus Sebahagian buttons. Now also accepts
--    has_module_permission('supplement_approver').
--
-- Nothing here touches audit_logs.action -- koordinator_approve_supplement /
-- koordinator_reject_supplement stay in that allowlist since historical rows
-- already use them; the frontend just stops producing new ones.
--
-- Safe to run more than once.
-- Run in the Supabase SQL editor (or `supabase db push`) on the client project.
-- ============================================================================

DROP POLICY IF EXISTS "supplement_requests: coordinator update" ON "public"."supplement_requests";

DROP POLICY IF EXISTS "supplement_requests: supporter update" ON "public"."supplement_requests";
CREATE POLICY "supplement_requests: supporter update" ON "public"."supplement_requests"
  FOR UPDATE USING (
    ("auth"."role"() = 'authenticated'::"text")
    AND "public"."has_module_permission"('supplement_supporter'::"text")
    AND ("status" = ANY (ARRAY['pending'::"text", 'semakan_lulus'::"text"]))
  ) WITH CHECK (
    ("auth"."role"() = 'authenticated'::"text")
    AND "public"."has_module_permission"('supplement_supporter'::"text")
    AND ("requested_by" <> "auth"."uid"())
    AND ("status" = ANY (ARRAY['semakan_lulus'::"text", 'semakan_tolak'::"text"]))
  );

CREATE OR REPLACE FUNCTION "public"."approve_supplement_request"("p_request_id" "uuid", "p_status" "text", "p_approved_quantity" integer DEFAULT NULL::integer, "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request supplement_requests%ROWTYPE;
  v_quantity int;
  v_new_stock int;
BEGIN
  IF get_my_role() NOT IN ('superadmin', 'admin') AND NOT has_module_permission('supplement_approver') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_request FROM supplement_requests WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'Cannot approve your own request';
  END IF;

  IF v_request.status != 'semakan_lulus' THEN
    RAISE EXCEPTION 'Request is not ready for approval';
  END IF;

  v_quantity := COALESCE(p_approved_quantity, v_request.quantity);

  UPDATE supplements
  SET stock = stock - v_quantity
  WHERE id = v_request.supplement_id AND stock >= v_quantity
  RETURNING stock INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  UPDATE supplement_requests
  SET
    status = p_status,
    reviewed_by = auth.uid(),
    approved_quantity = p_approved_quantity
  WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'new_stock', v_new_stock);
END;
$$;
