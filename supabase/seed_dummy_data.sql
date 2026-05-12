-- =============================================================
-- MSP Sport Science — Dummy Data Seed Script
-- Run this in Supabase SQL Editor after schema.sql
-- =============================================================

-- =============================================================
-- 1. INSERT SAMPLE PROFILES (3 profiles: superadmin, admin, coach)
-- =============================================================
INSERT INTO profiles (id, full_name, role) VALUES
('00000000-0000-0000-0000-000000000001', 'Ahmad Rashid', 'coach'),
('00000000-0000-0000-0000-000000000002', 'Encik Faizal', 'admin'),
('00000000-0000-0000-0000-000000000003', 'Tuan Hj. Rahman', 'superadmin')
ON CONFLICT (id) DO NOTHING;


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
('Basketball', 5, 2026, 'Phase 1: Aerobic conditioning. Focus on cardiovascular capacity and endurance. Daily 2-hour sessions.', '00000000-0000-0000-0000-000000000001'),
('Basketball', 6, 2026, 'Phase 2: Strength & Power. Plyometric drills and resistance training. 3x weekly.', '00000000-0000-0000-0000-000000000001'),
('Badminton', 5, 2026, 'Speed and agility development. Court movement patterns and footwork. 1.5 hours daily.', '00000000-0000-0000-0000-000000000001'),
('Badminton', 6, 2026, 'Match preparation. Tactical drills and competitive play simulation.', '00000000-0000-0000-0000-000000000001'),
('Football', 5, 2026, 'Technical skills: Ball control, dribbling, and possession exercises. 2 hours daily.', '00000000-0000-0000-0000-000000000001'),
('Football', 6, 2026, 'Tactical training. Set pieces, formations, and game strategies. Full match play.', '00000000-0000-0000-0000-000000000001'),
('Martial Arts', 5, 2026, 'Fundamental techniques. Stance, punch and kick drills. 1.5 hours daily.', '00000000-0000-0000-0000-000000000001'),
('Martial Arts', 6, 2026, 'Sparring and combat scenarios. Competition preparation and techniques refinement.', '00000000-0000-0000-0000-000000000001'),
('Volleyball', 5, 2026, 'Basic fundamentals. Passing, setting, spiking drills and coordination exercises.', '00000000-0000-0000-0000-000000000001'),
('Volleyball', 6, 2026, 'Team strategies and game tactics. 6v6 matches and game situation training.', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (sport, month, year) DO NOTHING;


-- =============================================================
-- 4. INSERT STRENGTH & CONDITIONING RECORDS
-- =============================================================
INSERT INTO strength_conditioning (athlete_id, session_date, attendance, training_program, notes, recorded_by) VALUES
-- Amir Karim
('10000000-0000-0000-0000-000000000001', '2026-05-01', 'present', 'Aerobic conditioning', 'Good performance. Completed all exercises without issue.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '2026-05-03', 'present', 'Plyometric training', 'Excellent. Vertical jump improved noticeably.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '2026-05-05', 'absent', NULL, 'Sick leave - provided medical note.', '00000000-0000-0000-0000-000000000001'),
-- Zara Mohd
('10000000-0000-0000-0000-000000000002', '2026-05-02', 'present', 'Aerobic conditioning', 'Steady pace. Needs improvement in intensity level.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000002', '2026-05-04', 'present', 'Strength training', 'Good form. Bench press performance improved.', '00000000-0000-0000-0000-000000000001'),
-- Hafiz Azhar
('10000000-0000-0000-0000-000000000003', '2026-05-01', 'present', 'Speed agility drills', 'Excellent footwork improvements. Ready for next phase.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000003', '2026-05-04', 'present', 'Court movement', 'Good lateral movement. Needs practice on transitions.', '00000000-0000-0000-0000-000000000001'),
-- Nur Amira
('10000000-0000-0000-0000-000000000004', '2026-05-02', 'present', 'Flexibility training', 'Improved range of motion. Progressing well.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000004', '2026-05-05', 'mc', NULL, 'Medical certificate provided - menstrual issue.', '00000000-0000-0000-0000-000000000001'),
-- Aziz Malik
('10000000-0000-0000-0000-000000000005', '2026-05-03', 'present', 'Punch and kick drills', 'Powerful strikes demonstrated. Needs better control.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000005', '2026-05-06', 'present', 'Combat sparring', 'Good footwork and timing. Ready for competition.', '00000000-0000-0000-0000-000000000001'),
-- Farah Ismail
('10000000-0000-0000-0000-000000000006', '2026-05-01', 'absent', NULL, 'Injury recovery - ankle sprain from training.', '00000000-0000-0000-0000-000000000001'),
-- Ricky Santos
('10000000-0000-0000-0000-000000000007', '2026-05-02', 'present', 'Ball control drills', 'Excellent first touch and ball handling.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000007', '2026-05-04', 'present', 'Possession exercises', 'Great teamwork and communication on field.', '00000000-0000-0000-0000-000000000001'),
-- Lina Ahmad
('10000000-0000-0000-0000-000000000008', '2026-05-03', 'present', 'Dribbling practice', 'Improved speed and control. Consistent performance.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000008', '2026-05-05', 'present', 'Tactical drills', 'Good positioning and game awareness.', '00000000-0000-0000-0000-000000000001'),
-- Budi Santoso
('10000000-0000-0000-0000-000000000009', '2026-05-01', 'present', 'Jumping and blocking', 'Excellent vertical jump. Outstanding defensive skills.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000009', '2026-05-04', 'present', 'Serve practice', 'Good consistency. Power serve accuracy improving.', '00000000-0000-0000-0000-000000000001'),
-- Maya Hassan
('10000000-0000-0000-0000-000000000010', '2026-05-02', 'absent', NULL, 'Rest day as per rehabilitation plan.', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000010', '2026-05-06', 'present', 'Setting drills', 'Good ball placement and court vision.', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 5. INSERT INBODY RECORDS
-- =============================================================
INSERT INTO inbody_records (athlete_id, recorded_date, weight, smm, bmi, fat_pct, body_fat_mass, bmr, inbody_score, skor, recorded_by) VALUES
-- Amir Karim
('10000000-0000-0000-0000-000000000001', '2026-04-01', 82.5, 36.2, 23.3, 16.2, 13.3, 1856, 82, 82, '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '2026-05-01', 83.1, 37.1, 23.5, 15.8, 13.1, 1868, 84, 84, '00000000-0000-0000-0000-000000000001'),
-- Zara Mohd
('10000000-0000-0000-0000-000000000002', '2026-04-01', 70.0, 29.8, 22.9, 18.5, 12.95, 1642, 78, 78, '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000002', '2026-05-01', 69.8, 30.2, 22.8, 17.9, 12.5, 1638, 80, 80, '00000000-0000-0000-0000-000000000001'),
-- Hafiz Azhar
('10000000-0000-0000-0000-000000000003', '2026-04-05', 68.0, 31.5, 23.0, 15.3, 10.4, 1742, 81, 81, '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000003', '2026-05-05', 67.9, 31.8, 23.0, 14.9, 10.1, 1748, 83, 83, '00000000-0000-0000-0000-000000000001'),
-- Nur Amira
('10000000-0000-0000-0000-000000000004', '2026-04-10', 58.0, 24.9, 21.8, 19.2, 11.1, 1438, 76, 76, '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000004', '2026-05-10', 58.2, 25.2, 21.9, 18.8, 10.94, 1445, 78, 78, '00000000-0000-0000-0000-000000000001'),
-- Aziz Malik
('10000000-0000-0000-0000-000000000005', '2026-04-03', 72.0, 33.1, 22.2, 14.5, 10.44, 1825, 85, 85, '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000005', '2026-05-03', 72.5, 33.5, 22.4, 14.1, 10.22, 1832, 87, 87, '00000000-0000-0000-0000-000000000001'),
-- Farah Ismail
('10000000-0000-0000-0000-000000000006', '2026-04-15', 62.0, 26.8, 21.9, 17.8, 11.04, 1565, 79, 79, '00000000-0000-0000-0000-000000000001'),
-- Ricky Santos
('10000000-0000-0000-0000-000000000007', '2026-04-08', 78.0, 35.2, 24.6, 16.9, 13.18, 1792, 80, 80, '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000007', '2026-05-08', 77.9, 35.8, 24.5, 16.3, 12.69, 1798, 82, 82, '00000000-0000-0000-0000-000000000001'),
-- Lina Ahmad
('10000000-0000-0000-0000-000000000008', '2026-04-12', 65.0, 28.5, 22.2, 19.8, 12.87, 1552, 75, 75, '00000000-0000-0000-0000-000000000001'),
-- Budi Santoso
('10000000-0000-0000-0000-000000000009', '2026-04-20', 85.0, 39.2, 22.4, 12.8, 10.88, 1968, 88, 88, '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000009', '2026-05-20', 85.5, 39.8, 22.6, 12.3, 10.52, 1982, 90, 90, '00000000-0000-0000-0000-000000000001'),
-- Maya Hassan
('10000000-0000-0000-0000-000000000010', '2026-04-25', 60.0, 25.8, 21.0, 18.5, 11.1, 1485, 77, 77, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 6. INSERT PHYSIO CASES
-- =============================================================
INSERT INTO physio_cases (athlete_id, open_date, status, injury_type, physio_id) VALUES
('10000000-0000-0000-0000-000000000006', '2026-04-25', 'active', 'Ankle sprain Grade 1', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '2026-04-28', 'active', 'Knee tendinitis', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000003', '2026-04-15', 'closed', 'Shoulder strain', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 7. INSERT PHYSIO SLOTS
-- =============================================================
INSERT INTO physio_slots (slot_date, time_slot, athlete_id, injury_type, session_type, pain_scale, target_muscle, treatment_type, attendance_status, assessment_notes, rehab_plan, progress_notes, physiotherapist_id, case_id, diagnosis, date_of_injury, referred_by, chief_complaint) VALUES
-- Farah Ismail - Ankle sprain case
('2026-05-01', '09:00', '10000000-0000-0000-0000-000000000006', 'Sprain', 'injury', 6, 'Ankle', 'Manual therapy', 'present', 'Mild swelling, limited ROM, patient alert and cooperative', 'Rest, ice, compression. ROM exercises day 3. Gradual weight bearing by day 5.', 'Day 1: Mild improvement, swelling reduced slightly', '00000000-0000-0000-0000-000000000001', (SELECT id FROM physio_cases WHERE athlete_id = '10000000-0000-0000-0000-000000000006' LIMIT 1), 'Grade 1 ankle sprain', '2026-04-25', 'Coach Ahmad Rashid', 'Right ankle pain and swelling'),
('2026-05-03', '10:30', '10000000-0000-0000-0000-000000000006', 'Sprain', 'standard', 5, 'Ankle', 'Manual therapy', 'present', 'Improved flexibility, pain reducing, good compliance', 'Continue exercises, weight bearing training, balance exercises', 'Day 3: Good progress, mobility improved', '00000000-0000-0000-0000-000000000001', (SELECT id FROM physio_cases WHERE athlete_id = '10000000-0000-0000-0000-000000000006' LIMIT 1), 'Grade 1 ankle sprain', '2026-04-25', 'Coach Ahmad Rashid', 'Right ankle pain'),

-- Amir Karim - Knee tendinitis case
('2026-05-04', '08:00', '10000000-0000-0000-0000-000000000001', 'Tendinitis', 'standard', 4, 'Knee', 'Modalities + Exercise', 'present', 'Slight inflammation around patella, good ROM', 'Ice, reduce impact training, strengthening exercises, stretching routine', 'Stable condition, can return to gradual training', '00000000-0000-0000-0000-000000000001', (SELECT id FROM physio_cases WHERE athlete_id = '10000000-0000-0000-0000-000000000001' LIMIT 1), 'Knee soreness - overuse', '2026-04-28', 'Coach Ahmad Rashid', 'Left knee discomfort during training'),

-- Hafiz Azhar - Shoulder check (routine)
('2026-05-06', '11:00', '10000000-0000-0000-0000-000000000003', 'Muscle strain', 'standard', 2, 'Shoulder', 'Manual therapy', 'present', 'Tight deltoids and rotator cuff, improved since last session', 'Stretching routine, massage therapy, mobility work', 'Responding well to treatment, ready to resume training', '00000000-0000-0000-0000-000000000001', (SELECT id FROM physio_cases WHERE athlete_id = '10000000-0000-0000-0000-000000000003' LIMIT 1), 'Shoulder tightness from training', '2026-05-01', 'Coach Nur Aqilah', 'Right shoulder tension')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 8. INSERT SUPPLEMENTS
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
-- 9. INSERT SUPPLEMENT REQUESTS
-- =============================================================
INSERT INTO supplement_requests (athlete_id, supplement_id, quantity, request_date, status, requested_by, reviewed_by, sport, approved_quantity) VALUES
-- Amir Karim requests Whey Protein
((SELECT id FROM athletes WHERE name = 'Amir Karim'), (SELECT id FROM supplements WHERE name = 'Whey Protein Powder'), 5, '2026-05-01', 'approved', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Basketball', 5),
-- Zara Mohd requests BCAA
((SELECT id FROM athletes WHERE name = 'Zara Mohd'), (SELECT id FROM supplements WHERE name = 'BCAA Amino Acids'), 2, '2026-05-02', 'approved', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Basketball', 2),
-- Hafiz Azhar requests Electrolyte
((SELECT id FROM athletes WHERE name = 'Hafiz Azhar'), (SELECT id FROM supplements WHERE name = 'Electrolyte Drink Mix'), 3, '2026-05-03', 'pending', '10000000-0000-0000-0000-000000000003', NULL, 'Badminton', NULL),
-- Aziz Malik requests Creatine
((SELECT id FROM athletes WHERE name = 'Aziz Malik'), (SELECT id FROM supplements WHERE name = 'Creatine Monohydrate'), 2, '2026-05-04', 'approved', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Martial Arts', 2),
-- Budi Santoso requests Whey Protein
((SELECT id FROM athletes WHERE name = 'Budi Santoso'), (SELECT id FROM supplements WHERE name = 'Whey Protein Powder'), 8, '2026-05-05', 'approved', '10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', 'Volleyball', 8),
-- Ricky Santos requests Vitamin D
((SELECT id FROM athletes WHERE name = 'Ricky Santos'), (SELECT id FROM supplements WHERE name = 'Vitamin D3'), 30, '2026-05-06', 'pending', '10000000-0000-0000-0000-000000000007', NULL, 'Football', NULL),
-- Lina Ahmad requests Fish Oil
((SELECT id FROM athletes WHERE name = 'Lina Ahmad'), (SELECT id FROM supplements WHERE name = 'Fish Oil Omega-3'), 1, '2026-05-01', 'rejected', '10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'Football', 0)
ON CONFLICT DO NOTHING;


-- =============================================================
-- 10. VERIFY DATA WAS INSERTED
-- =============================================================
SELECT 'Profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'Athletes', COUNT(*) FROM athletes
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
