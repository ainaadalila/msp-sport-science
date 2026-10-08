-- ============================================================================
-- Adds left/right versions of two existing tests, scored with the same norms
-- as the originals:
--   Handgrip Strength  -> Handgrip Strength Left, Handgrip Strength Right
--   Stock Balance Test -> Stock Balance Test Left, Stock Balance Test Right
--
-- Norms are copied from the original test's rows in fitness_test_norms (per
-- gender), so they match whatever is live in this database. The original
-- tests are left as they are.
--
-- The new tests still need to be ticked per sport in Konfigurasi Ujian
-- before they show up on that sport's test form.
--
-- Safe to run more than once.
-- Run in the Supabase SQL editor (or `supabase db push`) on the client project.
-- ============================================================================

INSERT INTO public.fitness_test_definitions (test_name, category, unit, description)
SELECT v.new_name, src.category, src.unit, v.description
FROM (VALUES
  ('Handgrip Strength Left',   'Handgrip Strength',  'Grip strength in kg, left hand'),
  ('Handgrip Strength Right',  'Handgrip Strength',  'Grip strength in kg, right hand'),
  ('Stock Balance Test Left',  'Stock Balance Test', 'Time held in seconds, standing on left leg'),
  ('Stock Balance Test Right', 'Stock Balance Test', 'Time held in seconds, standing on right leg')
) AS v(new_name, source_name, description)
JOIN public.fitness_test_definitions src ON src.test_name = v.source_name
ON CONFLICT (test_name) DO NOTHING;

INSERT INTO public.fitness_test_norms
  (test_id, gender, good_min, good_max, average_min, average_max, poor_min, poor_max, rating_direction)
SELECT nd.id, sn.gender, sn.good_min, sn.good_max, sn.average_min, sn.average_max, sn.poor_min, sn.poor_max, sn.rating_direction
FROM (VALUES
  ('Handgrip Strength Left',   'Handgrip Strength'),
  ('Handgrip Strength Right',  'Handgrip Strength'),
  ('Stock Balance Test Left',  'Stock Balance Test'),
  ('Stock Balance Test Right', 'Stock Balance Test')
) AS v(new_name, source_name)
JOIN public.fitness_test_definitions nd ON nd.test_name = v.new_name
JOIN public.fitness_test_definitions sd ON sd.test_name = v.source_name
JOIN public.fitness_test_norms sn ON sn.test_id = sd.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.fitness_test_norms n WHERE n.test_id = nd.id AND n.gender = sn.gender
);
