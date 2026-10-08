-- ============================================================================
-- Adds three Strength tests scored relative to the athlete's body weight:
-- 1RM Squat, 1RM Bench Press, 1RM Deadlift.
--
-- The stored result_value is the ratio (weight lifted / body weight), e.g.
-- 80 kg lifted at 70 kg body weight = 1.14. The coach enters the kg lifted on
-- the Ujian Kecergasan form and the app works out the ratio; the kg lifted and
-- body weight used are kept in the result's notes.
--
-- Norm (same for lelaki and perempuan, higher is better):
--   Baik       >= 1.0
--   Sederhana  0.5 - 0.99
--   Lemah      < 0.5
--
-- The tests still need to be ticked per sport in Konfigurasi Ujian before
-- they show up on that sport's test form.
--
-- Safe to run more than once.
-- Run in the Supabase SQL editor (or `supabase db push`) on the client project.
-- ============================================================================

INSERT INTO public.fitness_test_definitions (test_name, category, unit, description)
VALUES
  ('1RM Squat',       'strength', 'x berat badan', 'One-rep max back squat relative to body weight (kg lifted / body weight kg)'),
  ('1RM Bench Press', 'strength', 'x berat badan', 'One-rep max bench press relative to body weight (kg lifted / body weight kg)'),
  ('1RM Deadlift',    'strength', 'x berat badan', 'One-rep max deadlift relative to body weight (kg lifted / body weight kg)')
ON CONFLICT (test_name) DO NOTHING;

INSERT INTO public.fitness_test_norms
  (test_id, gender, good_min, good_max, average_min, average_max, poor_min, poor_max, rating_direction)
SELECT d.id, 'both', 1.0, NULL, 0.5, 0.99, NULL, 0.49, 'higher_is_better'
FROM public.fitness_test_definitions d
WHERE d.test_name IN ('1RM Squat', '1RM Bench Press', '1RM Deadlift')
  AND NOT EXISTS (SELECT 1 FROM public.fitness_test_norms n WHERE n.test_id = d.id);
