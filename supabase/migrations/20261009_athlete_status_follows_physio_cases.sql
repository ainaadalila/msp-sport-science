-- ============================================================================
-- Athlete status follows their physio cases:
--   * an athlete with at least one open (status = 'active') physio case is
--     CEDERA (athletes.status = 'injured')
--   * once their last open case is closed (or referred out, or deleted) they
--     go back to AKTIF (athletes.status = 'active')
--
-- Done with a trigger on physio_cases so it applies no matter where a case is
-- opened, closed or deleted, and every screen that reads athletes.status
-- (Atlet list badge and Status filter, Atlet Aktif counters, header alert)
-- stays in step.
--
-- Going back to AKTIF only happens if the athlete is currently 'injured', so
-- a REHAT / TIDAK AKTIF set by hand isn't overwritten when a case closes.
-- Opening a case does set CEDERA whatever the status was.
--
-- The function is SECURITY DEFINER so physio staff who can manage cases but
-- can't edit athlete profiles (RLS) still trigger the status change.
--
-- Backfill at the bottom marks every athlete who has an open case as CEDERA.
-- Athletes already set to CEDERA by hand with no open case are left as they
-- are.
--
-- Safe to run more than once.
-- Run in the Supabase SQL editor (or `supabase db push`) on the client project.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_athlete_status_from_physio_cases(p_athlete_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_athlete_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM physio_cases WHERE athlete_id = p_athlete_id AND status = 'active') THEN
    UPDATE athletes SET status = 'injured'
    WHERE id = p_athlete_id AND status IS DISTINCT FROM 'injured';
  ELSE
    UPDATE athletes SET status = 'active'
    WHERE id = p_athlete_id AND status = 'injured';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.physio_cases_sync_athlete_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM sync_athlete_status_from_physio_cases(NEW.athlete_id);
  END IF;
  -- Covers deletes, and a case moved from one athlete to another
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.athlete_id IS DISTINCT FROM NEW.athlete_id) THEN
    PERFORM sync_athlete_status_from_physio_cases(OLD.athlete_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS physio_cases_sync_athlete_status ON public.physio_cases;
CREATE TRIGGER physio_cases_sync_athlete_status
  AFTER INSERT OR DELETE OR UPDATE OF status, athlete_id ON public.physio_cases
  FOR EACH ROW EXECUTE FUNCTION public.physio_cases_sync_athlete_status();

-- Backfill: athletes who already have an open case
UPDATE public.athletes a
SET status = 'injured'
WHERE a.status IS DISTINCT FROM 'injured'
  AND EXISTS (SELECT 1 FROM public.physio_cases c WHERE c.athlete_id = a.id AND c.status = 'active');
