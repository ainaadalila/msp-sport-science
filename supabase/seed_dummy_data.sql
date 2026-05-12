-- =============================================================
-- MSP Sport Science — Dummy Data Seed Script
-- Run this in Supabase SQL Editor after schema.sql
-- =============================================================

-- =============================================================
-- 1. PROFILES - Using existing auth users (do not insert)
-- Note: Profiles must be created via Supabase auth first
-- Replace NULL values below with actual profile UUIDs once auth users exist
-- =============================================================


-- =============================================================
-- 2. INSERT ATHLETES (10 athletes across different sports)
-- =============================================================
INSERT INTO athletes (id, name, ic_number, sport, category, weight, height, status, date_of_birth, gender) VALUES
-- Basketball
('10000000-0000-0000-0000-000000000001', 'Amir Karim', '990101-01-1234', 'Basketball', 'Guard', 82.5, 188.0, 'active', '1999-01-01', 'M'),
('10000000-0000-0000-0000-000000000002', 'Zara Mohd', '000305-05-5678', 'Basketball', 'Forward', 70.0, 175.0, 'active', '2000-03-05', 'F'),

-- Badminton
('10000000-0000-0000-0000-000000000003', 'Hafiz Azhar', '980815-08-2345', 'Badminton', 'Single', 68.0, 172.0, 'active', '1998-08-15', 'M'),
('10000000-0000-0000-0000-000000000004', 'Nur Amira', '010302-10-3456', 'Badminton', 'Double', 58.0, 163.0, 'active', '2001-03-02', 'F'),

-- Martial Arts
('10000000-0000-0000-0000-000000000005', 'Aziz Malik', '970510-05-4567', 'Martial Arts', 'Taekwondo', 72.0, 180.0, 'active', '1997-05-10', 'M'),
('10000000-0000-0000-0000-000000000006', 'Farah Ismail', '020611-11-5678', 'Martial Arts', 'Silat', 62.0, 168.0, 'injured', '2002-06-11', 'F'),

-- Football
('10000000-0000-0000-0000-000000000007', 'Ricky Santos', '980203-02-6789', 'Football', 'Forward', 78.0, 178.0, 'active', '1998-02-03', 'M'),
('10000000-0000-0000-0000-000000000008', 'Lina Ahmad', '010920-09-7890', 'Football', 'Midfielder', 65.0, 171.0, 'active', '2001-09-20', 'F'),

-- Volleyball
('10000000-0000-0000-0000-000000000009', 'Budi Santoso', '000704-07-8901', 'Volleyball', 'Middle Blocker', 85.0, 195.0, 'active', '2000-07-04', 'M'),
('10000000-0000-0000-0000-000000000010', 'Maya Hassan', '010415-04-9012', 'Volleyball', 'Setter', 60.0, 169.0, 'rest', '2001-04-15', 'F')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- 3. INSERT SC PROGRAMS (Monthly training programs)
-- =============================================================
INSERT INTO sc_programs (sport, month, year, content, coach_id) VALUES
('Basketball', 5, 2026, 'Phase 1: Aerobic conditioning. Focus on cardiovascular capacity and endurance. Daily 2-hour sessions.', NULL),
('Basketball', 6, 2026, 'Phase 2: Strength & Power. Plyometric drills and resistance training. 3x weekly.', NULL),
('Badminton', 5, 2026, 'Speed and agility development. Court movement patterns and footwork. 1.5 hours daily.', NULL),
('Badminton', 6, 2026, 'Match preparation. Tactical drills and competitive play simulation.', NULL),
('Football', 5, 2026, 'Technical skills: Ball control, dribbling, and possession exercises. 2 hours daily.', NULL),
('Football', 6, 2026, 'Tactical training. Set pieces, formations, and game strategies. Full match play.', NULL),
('Martial Arts', 5, 2026, 'Fundamental techniques. Stance, punch and kick drills. 1.5 hours daily.', NULL),
('Martial Arts', 6, 2026, 'Sparring and combat scenarios. Competition preparation and techniques refinement.', NULL),
('Volleyball', 5, 2026, 'Basic fundamentals. Passing, setting, spiking drills and coordination exercises.', NULL),
('Volleyball', 6, 2026, 'Team strategies and game tactics. 6v6 matches and game situation training.', NULL)
ON CONFLICT (sport, month, year) DO NOTHING;


-- =============================================================
-- 4. INSERT STRENGTH & CONDITIONING RECORDS
-- =============================================================
INSERT INTO strength_conditioning (athlete_id, session_date, attendance, training_program, notes, recorded_by) VALUES
-- Amir Karim
('10000000-0000-0000-0000-000000000001', '2026-05-01', 'present', 'Aerobic conditioning', 'Good performance. Completed all exercises without issue.', NULL),
('10000000-0000-0000-0000-000000000001', '2026-05-03', 'present', 'Plyometric training', 'Excellent. Vertical jump improved noticeably.', NULL),
('10000000-0000-0000-0000-000000000001', '2026-05-05', 'absent', NULL, 'Sick leave - provided medical note.', NULL),
-- Zara Mohd
('10000000-0000-0000-0000-000000000002', '2026-05-02', 'present', 'Aerobic conditioning', 'Steady pace. Needs improvement in intensity level.', NULL),
('10000000-0000-0000-0000-000000000002', '2026-05-04', 'present', 'Strength training', 'Good form. Bench press performance improved.', NULL),
-- Hafiz Azhar
('10000000-0000-0000-0000-000000000003', '2026-05-01', 'present', 'Speed agility drills', 'Excellent footwork improvements. Ready for next phase.', NULL),
('10000000-0000-0000-0000-000000000003', '2026-05-04', 'present', 'Court movement', 'Good lateral movement. Needs practice on transitions.', NULL),
-- Nur Amira
('10000000-0000-0000-0000-000000000004', '2026-05-02', 'present', 'Flexibility training', 'Improved range of motion. Progressing well.', NULL),
('10000000-0000-0000-0000-000000000004', '2026-05-05', 'mc', NULL, 'Medical certificate provided - menstrual issue.', NULL),
-- Aziz Malik
('10000000-0000-0000-0000-000000000005', '2026-05-03', 'present', 'Punch and kick drills', 'Powerful strikes demonstrated. Needs better control.', NULL),
('10000000-0000-0000-0000-000000000005', '2026-05-06', 'present', 'Combat sparring', 'Good footwork and timing. Ready for competition.', NULL),
-- Farah Ismail
('10000000-0000-0000-0000-000000000006', '2026-05-01', 'absent', NULL, 'Injury recovery - ankle sprain from training.', NULL),
-- Ricky Santos
('10000000-0000-0000-0000-000000000007', '2026-05-02', 'present', 'Ball control drills', 'Excellent first touch and ball handling.', NULL),
('10000000-0000-0000-0000-000000000007', '2026-05-04', 'present', 'Possession exercises', 'Great teamwork and communication on field.', NULL),
-- Lina Ahmad
('10000000-0000-0000-0000-000000000008', '2026-05-03', 'present', 'Dribbling practice', 'Improved speed and control. Consistent performance.', NULL),
('10000000-0000-0000-0000-000000000008', '2026-05-05', 'present', 'Tactical drills', 'Good positioning and game awareness.', NULL),
-- Budi Santoso
('10000000-0000-0000-0000-000000000009', '2026-05-01', 'present', 'Jumping and blocking', 'Excellent vertical jump. Outstanding defensive skills.', NULL),
('10000000-0000-0000-0000-000000000009', '2026-05-04', 'present', 'Serve practice', 'Good consistency. Power serve accuracy improving.', NULL),
-- Maya Hassan
('10000000-0000-0000-0000-000000000010', '2026-05-02', 'absent', NULL, 'Rest day as per rehabilitation plan.', NULL),
('10000000-0000-0000-0000-000000000010', '2026-05-06', 'present', 'Setting drills', 'Good ball placement and court vision.', NULL)
ON CONFLICT DO NOTHING;


-- =============================================================
-- 5. INSERT INBODY RECORDS
-- =============================================================
INSERT INTO inbody_records (athlete_id, recorded_date, weight, smm, bmi, fat_pct, body_fat_mass, bmr, inbody_score, skor, recorded_by) VALUES
-- Amir Karim
('10000000-0000-0000-0000-000000000001', '2026-04-01', 82.5, 36.2, 23.3, 16.2, 13.3, 1856, 82, 82, NULL),
('10000000-0000-0000-0000-000000000001', '2026-05-01', 83.1, 37.1, 23.5, 15.8, 13.1, 1868, 84, 84, NULL),
-- Zara Mohd
('10000000-0000-0000-0000-000000000002', '2026-04-01', 70.0, 29.8, 22.9, 18.5, 12.95, 1642, 78, 78, NULL),
('10000000-0000-0000-0000-000000000002', '2026-05-01', 69.8, 30.2, 22.8, 17.9, 12.5, 1638, 80, 80, NULL),
-- Hafiz Azhar
('10000000-0000-0000-0000-000000000003', '2026-04-05', 68.0, 31.5, 23.0, 15.3, 10.4, 1742, 81, 81, NULL),
('10000000-0000-0000-0000-000000000003', '2026-05-05', 67.9, 31.8, 23.0, 14.9, 10.1, 1748, 83, 83, NULL),
-- Nur Amira
('10000000-0000-0000-0000-000000000004', '2026-04-10', 58.0, 24.9, 21.8, 19.2, 11.1, 1438, 76, 76, NULL),
('10000000-0000-0000-0000-000000000004', '2026-05-10', 58.2, 25.2, 21.9, 18.8, 10.94, 1445, 78, 78, NULL),
-- Aziz Malik
('10000000-0000-0000-0000-000000000005', '2026-04-03', 72.0, 33.1, 22.2, 14.5, 10.44, 1825, 85, 85, NULL),
('10000000-0000-0000-0000-000000000005', '2026-05-03', 72.5, 33.5, 22.4, 14.1, 10.22, 1832, 87, 87, NULL),
-- Farah Ismail
('10000000-0000-0000-0000-000000000006', '2026-04-15', 62.0, 26.8, 21.9, 17.8, 11.04, 1565, 79, 79, NULL),
-- Ricky Santos
('10000000-0000-0000-0000-000000000007', '2026-04-08', 78.0, 35.2, 24.6, 16.9, 13.18, 1792, 80, 80, NULL),
('10000000-0000-0000-0000-000000000007', '2026-05-08', 77.9, 35.8, 24.5, 16.3, 12.69, 1798, 82, 82, NULL),
-- Lina Ahmad
('10000000-0000-0000-0000-000000000008', '2026-04-12', 65.0, 28.5, 22.2, 19.8, 12.87, 1552, 75, 75, NULL),
-- Budi Santoso
('10000000-0000-0000-0000-000000000009', '2026-04-20', 85.0, 39.2, 22.4, 12.8, 10.88, 1968, 88, 88, NULL),
('10000000-0000-0000-0000-000000000009', '2026-05-20', 85.5, 39.8, 22.6, 12.3, 10.52, 1982, 90, 90, NULL),
-- Maya Hassan
('10000000-0000-0000-0000-000000000010', '2026-04-25', 60.0, 25.8, 21.0, 18.5, 11.1, 1485, 77, 77, NULL)
ON CONFLICT DO NOTHING;


-- =============================================================
-- 6. INSERT PHYSIO CASES
-- =============================================================
INSERT INTO physio_cases (athlete_id, open_date, status, injury_type, physio_id) VALUES
('10000000-0000-0000-0000-000000000006', '2026-04-25', 'active', 'Ankle sprain Grade 1', NULL),
('10000000-0000-0000-0000-000000000001', '2026-04-28', 'active', 'Knee tendinitis', NULL),
('10000000-0000-0000-0000-000000000003', '2026-04-15', 'closed', 'Shoulder strain', NULL)
ON CONFLICT DO NOTHING;


-- =============================================================
-- 7. INSERT PHYSIO SLOTS
-- =============================================================
INSERT INTO physio_slots (slot_date, time_slot, athlete_id, injury_type, session_type, pain_scale, target_muscle, treatment_type, attendance_status, assessment_notes, rehab_plan, progress_notes, physiotherapist_id, case_id, diagnosis, date_of_injury, referred_by, chief_complaint) VALUES
-- Farah Ismail - Ankle sprain case
('2026-05-01', '09:00', '10000000-0000-0000-0000-000000000006', 'Sprain', 'injury', 6, 'Ankle', 'Manual therapy', 'completed', 'Mild swelling, limited ROM, patient alert and cooperative', 'Rest, ice, compression. ROM exercises day 3. Gradual weight bearing by day 5.', 'Day 1: Mild improvement, swelling reduced slightly', NULL, (SELECT id FROM physio_cases WHERE athlete_id = '10000000-0000-0000-0000-000000000006' LIMIT 1), 'Grade 1 ankle sprain', '2026-04-25', 'Coach Ahmad Rashid', 'Right ankle pain and swelling'),
('2026-05-03', '10:30', '10000000-0000-0000-0000-000000000006', 'Sprain', 'standard', 5, 'Ankle', 'Manual therapy', 'completed', 'Improved flexibility, pain reducing, good compliance', 'Continue exercises, weight bearing training, balance exercises', 'Day 3: Good progress, mobility improved', NULL, (SELECT id FROM physio_cases WHERE athlete_id = '10000000-0000-0000-0000-000000000006' LIMIT 1), 'Grade 1 ankle sprain', '2026-04-25', 'Coach Ahmad Rashid', 'Right ankle pain'),

-- Amir Karim - Knee tendinitis case
('2026-05-04', '08:00', '10000000-0000-0000-0000-000000000001', 'Tendinitis', 'standard', 4, 'Knee', 'Modalities + Exercise', 'completed', 'Slight inflammation around patella, good ROM', 'Ice, reduce impact training, strengthening exercises, stretching routine', 'Stable condition, can return to gradual training', NULL, (SELECT id FROM physio_cases WHERE athlete_id = '10000000-0000-0000-0000-000000000001' LIMIT 1), 'Knee soreness - overuse', '2026-04-28', 'Coach Ahmad Rashid', 'Left knee discomfort during training'),

-- Hafiz Azhar - Shoulder check (routine)
('2026-05-06', '11:00', '10000000-0000-0000-0000-000000000003', 'Muscle strain', 'standard', 2, 'Shoulder', 'Manual therapy', 'completed', 'Tight deltoids and rotator cuff, improved since last session', 'Stretching routine, massage therapy, mobility work', 'Responding well to treatment, ready to resume training', NULL, (SELECT id FROM physio_cases WHERE athlete_id = '10000000-0000-0000-0000-000000000003' LIMIT 1), 'Shoulder tightness from training', '2026-05-01', 'Coach Nur Aqilah', 'Right shoulder tension')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 8. INSERT FITNESS TEST SESSIONS AND RESULTS
-- =============================================================
INSERT INTO fitness_test_sessions (athlete_id, session, year, recorded_date, recorded_by, is_draft) VALUES
-- Amir Karim - Basketball
((SELECT id FROM athletes WHERE name = 'Amir Karim'), 'Fasa 1', 2026, '2026-04-10', '99999999-0000-0000-0000-000000000001', false),
((SELECT id FROM athletes WHERE name = 'Amir Karim'), 'Fasa 2', 2026, '2026-05-10', '99999999-0000-0000-0000-000000000001', false),
-- Zara Mohd - Basketball
((SELECT id FROM athletes WHERE name = 'Zara Mohd'), 'Fasa 1', 2026, '2026-04-12', '99999999-0000-0000-0000-000000000001', false),
((SELECT id FROM athletes WHERE name = 'Zara Mohd'), 'Fasa 2', 2026, '2026-05-12', '99999999-0000-0000-0000-000000000001', false),
-- Hafiz Azhar - Badminton
((SELECT id FROM athletes WHERE name = 'Hafiz Azhar'), 'Fasa 1', 2026, '2026-04-15', '99999999-0000-0000-0000-000000000001', false),
((SELECT id FROM athletes WHERE name = 'Hafiz Azhar'), 'Fasa 2', 2026, '2026-05-15', '99999999-0000-0000-0000-000000000001', false),
-- Nur Amira - Badminton
((SELECT id FROM athletes WHERE name = 'Nur Amira'), 'Fasa 1', 2026, '2026-04-18', '99999999-0000-0000-0000-000000000001', false),
((SELECT id FROM athletes WHERE name = 'Nur Amira'), 'Fasa 2', 2026, '2026-05-18', '99999999-0000-0000-0000-000000000001', false),
-- Aziz Malik - Martial Arts
((SELECT id FROM athletes WHERE name = 'Aziz Malik'), 'Fasa 1', 2026, '2026-04-20', '99999999-0000-0000-0000-000000000001', false),
((SELECT id FROM athletes WHERE name = 'Aziz Malik'), 'Fasa 2', 2026, '2026-05-20', '99999999-0000-0000-0000-000000000001', false),
-- Ricky Santos - Football
((SELECT id FROM athletes WHERE name = 'Ricky Santos'), 'Fasa 1', 2026, '2026-04-22', '99999999-0000-0000-0000-000000000001', false),
((SELECT id FROM athletes WHERE name = 'Ricky Santos'), 'Fasa 2', 2026, '2026-05-22', '99999999-0000-0000-0000-000000000001', false),
-- Lina Ahmad - Football
((SELECT id FROM athletes WHERE name = 'Lina Ahmad'), 'Fasa 1', 2026, '2026-04-25', '99999999-0000-0000-0000-000000000001', false),
((SELECT id FROM athletes WHERE name = 'Lina Ahmad'), 'Fasa 2', 2026, '2026-05-25', '99999999-0000-0000-0000-000000000001', false),
-- Budi Santoso - Volleyball
((SELECT id FROM athletes WHERE name = 'Budi Santoso'), 'Fasa 1', 2026, '2026-04-28', '99999999-0000-0000-0000-000000000001', false),
((SELECT id FROM athletes WHERE name = 'Budi Santoso'), 'Fasa 2', 2026, '2026-05-28', '99999999-0000-0000-0000-000000000001', false),
-- Maya Hassan - Volleyball
((SELECT id FROM athletes WHERE name = 'Maya Hassan'), 'Fasa 1', 2026, '2026-04-30', '99999999-0000-0000-0000-000000000001', false)
ON CONFLICT (athlete_id, session, year) DO NOTHING;

-- Insert fitness test results for each athlete
-- Amir Karim - Fasa 1
INSERT INTO fitness_test_results (session_id, test_id, result_value, rating, notes) VALUES
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up'), 45, 'good', 'Good form throughout'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat'), 50, 'good', 'Excellent depth and control'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit Up'), 52, 'good', 'Strong core'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Plank'), 75, 'good', 'Steady hold, good form'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Pull Up'), 12, 'good', 'Full range of motion'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump'), 235, 'good', 'Powerful jump'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump'), 58, 'good', 'Excellent vertical'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Seated Medicine Ball Throw'), 8.5, 'average', 'Good distance'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength'), 85, 'good', 'Strong back'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength'), 48, 'good', 'Strong grip');

-- Amir Karim - Fasa 2 (improvements)
INSERT INTO fitness_test_results (session_id, test_id, result_value, rating, notes) VALUES
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 2' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up'), 48, 'good', 'Improved endurance'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 2' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat'), 55, 'good', 'Better strength'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 2' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump'), 62, 'good', 'Noticeable improvement'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Amir Karim') AND session = 'Fasa 2' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength'), 88, 'good', 'Stronger');

-- Zara Mohd - Fasa 1
INSERT INTO fitness_test_results (session_id, test_id, result_value, rating, notes) VALUES
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Zara Mohd') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up'), 28, 'average', 'Modified push-ups'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Zara Mohd') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit Up'), 45, 'good', 'Good core strength'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Zara Mohd') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump'), 195, 'average', 'Good form'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Zara Mohd') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump'), 48, 'average', 'Decent jump height'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Zara Mohd') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength'), 38, 'average', 'Fair grip');

-- Hafiz Azhar - Fasa 1
INSERT INTO fitness_test_results (session_id, test_id, result_value, rating, notes) VALUES
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Hafiz Azhar') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up'), 42, 'good', 'Excellent form'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Hafiz Azhar') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'T-Test'), 9.2, 'good', 'Fast agility'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Hafiz Azhar') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility'), 10.8, 'good', 'Quick footwork'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Hafiz Azhar') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint'), 2.65, 'good', 'Good speed'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Hafiz Azhar') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Sit and Reach'), 32, 'good', 'Good flexibility');

-- Aziz Malik - Fasa 1 (Martial Arts)
INSERT INTO fitness_test_results (session_id, test_id, result_value, rating, notes) VALUES
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Aziz Malik') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Push Up'), 48, 'good', 'Explosive power'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Aziz Malik') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Squat'), 58, 'good', 'Great leg strength'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Aziz Malik') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength'), 92, 'good', 'Excellent strength'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Aziz Malik') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint'), 2.55, 'good', 'Very fast'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Aziz Malik') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Handgrip Strength'), 52, 'good', 'Powerful grip');

-- Ricky Santos - Fasa 1 (Football)
INSERT INTO fitness_test_results (session_id, test_id, result_value, rating, notes) VALUES
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Ricky Santos') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint'), 2.8, 'good', 'Good speed for forwards'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Ricky Santos') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = '40m Sprint'), 5.2, 'good', 'Sustained speed'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Ricky Santos') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Hexagon Agility'), 11.5, 'average', 'Good for football'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Ricky Santos') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump'), 245, 'good', 'Explosive power'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Ricky Santos') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Bleep Test'), 2400, 'good', 'Good cardiovascular fitness');

-- Budi Santoso - Fasa 1 (Volleyball)
INSERT INTO fitness_test_results (session_id, test_id, result_value, rating, notes) VALUES
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Budi Santoso') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Counter Movement Jump'), 68, 'good', 'Excellent vertical for volleyball'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Budi Santoso') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Standing Broad Jump'), 260, 'good', 'Powerful'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Budi Santoso') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Back Strength'), 95, 'good', 'Very strong'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Budi Santoso') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = '20m Sprint'), 2.75, 'good', 'Quick movements'),
((SELECT id FROM fitness_test_sessions WHERE athlete_id = (SELECT id FROM athletes WHERE name = 'Budi Santoso') AND session = 'Fasa 1' LIMIT 1),
 (SELECT id FROM fitness_test_definitions WHERE test_name = 'Bleep Test'), 2650, 'good', 'Excellent endurance')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 9. INSERT SUPPLEMENTS
-- =============================================================
INSERT INTO supplements (name, stock, unit, expiry_date) VALUES
('Whey Protein Powder', 45, 'kg', '2027-05-01'),
('Creatine Monohydrate', 12, 'kg', '2027-08-15'),
('BCAA Amino Acids', 20, 'boxes', '2027-03-20'),
('Vitamin D3', 100, 'tablets', '2027-12-31'),
('Electrolyte Drink Mix', 30, 'boxes', '2027-07-10'),
('Magnesium Supplement', 60, 'tablets', '2027-10-05'),
('Fish Oil Omega-3', 75, 'capsules', '2027-06-15'),
('Multivitamin', 90, 'tablets', '2027-11-30')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 10. INSERT SUPPLEMENT REQUESTS
-- =============================================================
INSERT INTO supplement_requests (athlete_id, supplement_id, quantity, request_date, status, requested_by, reviewed_by, sport, approved_quantity) VALUES
-- Amir Karim requests Whey Protein
((SELECT id FROM athletes WHERE name = 'Amir Karim'), (SELECT id FROM supplements WHERE name = 'Whey Protein Powder'), 5, '2026-05-01', 'approved', NULL, NULL, 'Basketball', 5),
-- Zara Mohd requests BCAA
((SELECT id FROM athletes WHERE name = 'Zara Mohd'), (SELECT id FROM supplements WHERE name = 'BCAA Amino Acids'), 2, '2026-05-02', 'approved', NULL, NULL, 'Basketball', 2),
-- Hafiz Azhar requests Electrolyte
((SELECT id FROM athletes WHERE name = 'Hafiz Azhar'), (SELECT id FROM supplements WHERE name = 'Electrolyte Drink Mix'), 3, '2026-05-03', 'pending', NULL, NULL, 'Badminton', NULL),
-- Aziz Malik requests Creatine
((SELECT id FROM athletes WHERE name = 'Aziz Malik'), (SELECT id FROM supplements WHERE name = 'Creatine Monohydrate'), 2, '2026-05-04', 'approved', NULL, NULL, 'Martial Arts', 2),
-- Budi Santoso requests Whey Protein
((SELECT id FROM athletes WHERE name = 'Budi Santoso'), (SELECT id FROM supplements WHERE name = 'Whey Protein Powder'), 8, '2026-05-05', 'approved', NULL, NULL, 'Volleyball', 8),
-- Ricky Santos requests Vitamin D
((SELECT id FROM athletes WHERE name = 'Ricky Santos'), (SELECT id FROM supplements WHERE name = 'Vitamin D3'), 30, '2026-05-06', 'pending', NULL, NULL, 'Football', NULL),
-- Lina Ahmad requests Fish Oil
((SELECT id FROM athletes WHERE name = 'Lina Ahmad'), (SELECT id FROM supplements WHERE name = 'Fish Oil Omega-3'), 1, '2026-05-01', 'pending', NULL, NULL, 'Football', NULL)
ON CONFLICT DO NOTHING;


-- =============================================================
-- 11. VERIFY DATA WAS INSERTED
-- =============================================================
SELECT 'Athletes' as table_name, COUNT(*) as record_count FROM athletes
UNION ALL
SELECT 'Fitness Test Sessions', COUNT(*) FROM fitness_test_sessions
UNION ALL
SELECT 'Fitness Test Results', COUNT(*) FROM fitness_test_results
UNION ALL
SELECT 'Strength & Conditioning', COUNT(*) FROM strength_conditioning
UNION ALL
SELECT 'InBody Records', COUNT(*) FROM inbody_records
UNION ALL
SELECT 'Physio Cases', COUNT(*) FROM physio_cases
UNION ALL
SELECT 'Physio Slots', COUNT(*) FROM physio_slots
UNION ALL
SELECT 'SC Programs', COUNT(*) FROM sc_programs
UNION ALL
SELECT 'Supplements', COUNT(*) FROM supplements
UNION ALL
SELECT 'Supplement Requests', COUNT(*) FROM supplement_requests;
