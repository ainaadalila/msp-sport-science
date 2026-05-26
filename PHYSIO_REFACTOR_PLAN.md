# Physiotherapy Module Refactor Plan
## Remove Slot Booking, Retain Core Features

---

## 📊 DATABASE CHANGES

### Current Schema Issue
The `physio_slots` table mixes **booking logic** (slot_date, time_slot) with **clinical data** (assessment, treatment, progress). We need to restructure this.

### New Schema Structure

#### 1. **physio_cases** (Already Exists ✅)
```sql
CREATE TABLE physio_cases (
  id uuid PRIMARY KEY
  athlete_id uuid REFERENCES athletes(id)
  open_date date                          -- when injury started
  injury_type text                        -- type of injury
  body_part text                          -- affected body part
  severity text CHECK (severity IN ('mild', 'moderate', 'severe'))
  diagnosis text                          -- medical diagnosis
  referred_by text                        -- who referred
  chief_complaint text                    -- main complaint/COC
  status text CHECK (status IN ('active', 'closed', 'referred'))
  closed_date date                        -- when case closed (if closed)
  physiotherapist_id uuid REFERENCES profiles(id)  -- assigned therapist
  created_at timestamptz
  updated_at timestamptz
);
```

#### 2. **physio_sessions** (REPLACE physio_slots)
```sql
CREATE TABLE physio_sessions (
  id uuid PRIMARY KEY
  case_id uuid REFERENCES physio_cases(id) ON DELETE CASCADE
  session_date date NOT NULL              -- actual session date (remove time_slot)
  duration_minutes integer                -- session duration
  therapist_notes text                    -- what was done in session
  attendance_status text CHECK (attendance_status IN ('completed', 'no_show', 'cancelled'))
  pain_scale_before integer CHECK (pain_scale_before >= 0 AND pain_scale_before <= 10)
  pain_scale_after integer CHECK (pain_scale_after >= 0 AND pain_scale_after <= 10)
  range_of_motion_before integer          -- ROM before session
  range_of_motion_after integer           -- ROM after session
  created_at timestamptz
  updated_at timestamptz
};
```

#### 3. **physio_treatment_plans** (NEW - Treatment Plan Assignment)
```sql
CREATE TABLE physio_treatment_plans (
  id uuid PRIMARY KEY
  case_id uuid REFERENCES physio_cases(id) ON DELETE CASCADE
  plan_name text                          -- e.g. "Phase 1: Initial Recovery"
  start_date date
  end_date date
  rehab_goal text                         -- main goal of this plan
  status text CHECK (status IN ('active', 'completed'))
  created_at timestamptz
  updated_at timestamptz
);
```

#### 4. **physio_prescribed_exercises** (NEW - Exercise Assignment)
```sql
CREATE TABLE physio_prescribed_exercises (
  id uuid PRIMARY KEY
  treatment_plan_id uuid REFERENCES physio_treatment_plans(id) ON DELETE CASCADE
  exercise_name text                      -- e.g. "Quadriceps Stretch"
  description text                        -- how to do it
  sets integer                            -- number of sets
  reps integer                            -- reps per set
  frequency text                          -- daily, 3x/week, etc
  duration_days integer                   -- how many days to do this
  target_muscle text                      -- muscle group
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
  notes text                              -- special instructions
  created_at timestamptz
);
```

#### 5. **physio_measurements** (NEW - Progress Tracking)
```sql
CREATE TABLE physio_measurements (
  id uuid PRIMARY KEY
  case_id uuid REFERENCES physio_cases(id) ON DELETE CASCADE
  session_id uuid REFERENCES physio_sessions(id) ON DELETE CASCADE  -- can be null
  measurement_date date
  measurement_type text CHECK (measurement_type IN ('range_of_motion', 'pain_scale', 'strength', 'mobility', 'circumference'))
  value integer                           -- numeric value
  unit text                               -- 'degrees', '1-10', 'kg', 'cm', etc
  notes text                              -- context/notes
  created_at timestamptz
);
```

### Migration SQL
```sql
-- Step 1: Create new tables
CREATE TABLE physio_treatment_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES physio_cases(id) ON DELETE CASCADE,
  plan_name text,
  start_date date,
  end_date date,
  rehab_goal text,
  status text CHECK (status IN ('active', 'completed')) NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE physio_prescribed_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id uuid NOT NULL REFERENCES physio_treatment_plans(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  description text,
  sets integer,
  reps integer,
  frequency text,
  duration_days integer,
  target_muscle text,
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE physio_measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES physio_cases(id) ON DELETE CASCADE,
  session_id uuid REFERENCES physio_sessions(id) ON DELETE CASCADE,
  measurement_date date NOT NULL,
  measurement_type text CHECK (measurement_type IN ('range_of_motion', 'pain_scale', 'strength', 'mobility', 'circumference')) NOT NULL,
  value integer NOT NULL,
  unit text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Step 2: Rename physio_slots to physio_sessions
ALTER TABLE physio_slots RENAME TO physio_sessions;

-- Step 3: Modify physio_sessions columns
ALTER TABLE physio_sessions DROP CONSTRAINT IF EXISTS physio_slots_slot_date_time_slot_physiotherapist_id_key;
ALTER TABLE physio_sessions DROP COLUMN IF EXISTS time_slot;
ALTER TABLE physio_sessions DROP COLUMN IF EXISTS physiotherapist_id;
ALTER TABLE physio_sessions RENAME COLUMN slot_date TO session_date;

-- Step 4: Add new columns to physio_sessions if not exist
ALTER TABLE physio_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS therapist_notes text,
  ADD COLUMN IF NOT EXISTS pain_scale_before integer,
  ADD COLUMN IF NOT EXISTS pain_scale_after integer,
  ADD COLUMN IF NOT EXISTS range_of_motion_before integer,
  ADD COLUMN IF NOT EXISTS range_of_motion_after integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 5: Update physio_cases columns
ALTER TABLE physio_cases
  ADD COLUMN IF NOT EXISTS body_part text,
  ADD COLUMN IF NOT EXISTS severity text CHECK (severity IN ('mild', 'moderate', 'severe')),
  ADD COLUMN IF NOT EXISTS closed_date date,
  ADD COLUMN IF NOT EXISTS physiotherapist_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 6: Add RLS policies to new tables
ALTER TABLE physio_treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_prescribed_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_measurements ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access to physio_treatment_plans" ON physio_treatment_plans
  FOR ALL USING (get_my_role() IN ('superadmin', 'admin'));
CREATE POLICY "Admins full access to physio_prescribed_exercises" ON physio_prescribed_exercises
  FOR ALL USING (get_my_role() IN ('superadmin', 'admin'));
CREATE POLICY "Admins full access to physio_measurements" ON physio_measurements
  FOR ALL USING (get_my_role() IN ('superadmin', 'admin'));

-- Physio access
CREATE POLICY "Physio access to their cases treatment plans" ON physio_treatment_plans
  FOR SELECT USING (
    get_my_role() = 'physio' AND
    case_id IN (SELECT id FROM physio_cases WHERE physiotherapist_id = auth.uid())
  );
CREATE POLICY "Physio access to exercises in their plans" ON physio_prescribed_exercises
  FOR SELECT USING (
    treatment_plan_id IN (
      SELECT id FROM physio_treatment_plans WHERE case_id IN 
      (SELECT id FROM physio_cases WHERE physiotherapist_id = auth.uid())
    )
  );
```

---

## 🎨 UI CHANGES

### PhysioPage.tsx Structure (New Tabs)

#### Tab 1: **Kes Aktif (Active Cases)**
- **List View**: All active injury cases
  - Athlete Name → click to view case details
  - Injury Type, Body Part, Date of Injury
  - Severity badge (Mild/Moderate/Severe)
  - Status (Active/Closed)
  - Assigned Therapist
  - Quick actions: Edit, View Details, Close Case

- **Detail Modal**: Full case information
  - Case header (athlete, injury, severity)
  - Diagnosis, referred by, chief complaint
  - Treatment Plans section (below)
  - Sessions list (below)
  - Progress measurements (below)
  - Close case button

#### Tab 2: **Pelan Rawatan (Treatment Plans)**
- **List View**: All treatment plans by case
  - Plan name, case (athlete), dates
  - Rehab goal, status (Active/Completed)
  - Number of exercises assigned
  - Quick actions: Edit, View Exercises, Mark Complete

- **Create/Edit Modal**:
  - Select Case (from active cases only)
  - Plan Name (e.g. "Phase 1: Initial Recovery")
  - Start Date, End Date
  - Rehab Goal (textarea)
  - Status toggle (Active/Completed)
  - Save button

- **Exercises Section** (in modal or slide-out):
  - List of prescribed exercises for this plan
  - Exercise name, sets/reps/frequency, target muscle, difficulty
  - Add exercise button → exercise picker/form
  - Edit/Delete exercise buttons

#### Tab 3: **Sesi (Sessions)**
- **List View**: All recorded sessions
  - Date, Case (athlete + injury), Duration
  - Attendance status badge (Completed/No Show/Cancelled)
  - Pain scale before → after
  - ROM before → after
  - Quick actions: Edit, View Notes, Delete

- **Create/Edit Modal**:
  - Select Case (from active cases)
  - Session Date (date picker, no time slot)
  - Duration (in minutes) - input field
  - Attendance Status (dropdown)
  - Pain Scale Before (1-10 slider)
  - Pain Scale After (1-10 slider)
  - ROM Before (degrees input)
  - ROM After (degrees input)
  - Therapist Notes (textarea)
  - Save button

#### Tab 4: **Pengukuran Kemajuan (Progress Measurements)**
- **Timeline View**: Chronological progress
  - Measurement date, type, value, unit
  - Display as:
    - **ROM Chart**: line chart over time
    - **Pain Scale Chart**: line chart (descending = good)
    - **Strength Table**: progressive weights lifted
    - **Mobility Notes**: text notes with dates
  - Add measurement button

- **Add Measurement Modal**:
  - Select Case (from active cases)
  - Select Session (optional - linked session)
  - Measurement Type (dropdown: ROM, Pain Scale, Strength, Mobility, Circumference)
  - Value (number input)
  - Unit (auto-filled based on type, e.g. "degrees", "1-10", "kg")
  - Notes (textarea)
  - Save button

#### Tab 5: **Kes Tertutup (Closed Cases)** [Optional]
- Archive/history view
- Read-only display
- Can reopen case button

---

## 📋 Form Field Mapping

### Removed Fields (Slot Booking)
- ❌ `slot_date` → becomes `session_date` (no time requirement)
- ❌ `time_slot` → completely removed
- ❌ `session_type` → removed (no longer relevant without booking)
- ❌ unique constraint on (slot_date, time_slot, physiotherapist_id)

### Retained Fields (Mapped to New Tables)

**physio_cases (Case Management)**
- ✅ athlete_id
- ✅ open_date (renamed from implied)
- ✅ injury_type
- ✅ diagnosis
- ✅ date_of_injury (moved from session level)
- ✅ referred_by
- ✅ chief_complaint
- ✅ status
- ✅ physiotherapist_id (assigned therapist)

**physio_sessions (Session Recording)**
- ✅ case_id (link to case)
- ✅ session_date (renamed from slot_date, no time)
- ✅ attendance_status
- ✅ assessment_notes (renamed to therapist_notes)
- ✅ progress_notes (included in notes)
- ✅ pain_scale (split into pain_scale_before/after)
- ✅ target_muscle (can reference exercises)
- ✅ treatment_type (part of exercise description)

**physio_treatment_plans (NEW)**
- ✅ rehab_plan (renamed to plan structure)
- ✅ rehab_goal

**physio_measurements (NEW)**
- ✅ pain_scale (as measurement type)
- ✅ range_of_motion (as measurement type)

---

## 🔄 Data Migration Strategy

Since you're changing the structure, you have two options:

### Option A: Fresh Start (Recommended for Demo)
- Run the new SQL migrations
- Start fresh with new cases
- Old data becomes read-only archive (optional, can query from old physio_slots if needed)

### Option B: Migrate Existing Data
```sql
-- Migrate existing physio_slots to physio_cases + physio_sessions
INSERT INTO physio_cases (athlete_id, open_date, injury_type, diagnosis, referred_by, chief_complaint, status, physiotherapist_id)
SELECT DISTINCT
  athlete_id,
  slot_date,
  injury_type,
  diagnosis,
  referred_by,
  chief_complaint,
  'active',
  physiotherapist_id
FROM physio_slots
WHERE athlete_id IS NOT NULL;

-- Then migrate sessions
INSERT INTO physio_sessions (case_id, session_date, attendance_status, pain_scale_before, therapist_notes, range_of_motion_before)
SELECT
  c.id,
  ps.slot_date,
  ps.attendance_status,
  ps.pain_scale,
  CONCAT(ps.assessment_notes, ' | ', COALESCE(ps.progress_notes, '')),
  ps.target_muscle::integer
FROM physio_slots ps
JOIN physio_cases c ON ps.athlete_id = c.athlete_id AND ps.slot_date >= c.open_date
WHERE ps.case_id IS NOT NULL;
```

---

## 📝 TypeScript Types

```typescript
// src/types/physio.ts (new file)

export interface PhysioCase {
  id: string
  athlete_id: string
  open_date: string  // date
  injury_type: string
  body_part: string
  severity: 'mild' | 'moderate' | 'severe'
  diagnosis: string
  referred_by: string
  chief_complaint: string
  status: 'active' | 'closed' | 'referred'
  closed_date: string | null
  physiotherapist_id: string
  created_at: string
  updated_at: string
  athlete?: { name: string; sport: string }
  physiotherapist?: { full_name: string }
}

export interface PhysioSession {
  id: string
  case_id: string
  session_date: string  // date (no time)
  duration_minutes: number
  therapist_notes: string
  attendance_status: 'completed' | 'no_show' | 'cancelled'
  pain_scale_before: number
  pain_scale_after: number
  range_of_motion_before: number
  range_of_motion_after: number
  created_at: string
  updated_at: string
  case?: PhysioCase
}

export interface PhysioTreatmentPlan {
  id: string
  case_id: string
  plan_name: string
  start_date: string  // date
  end_date: string  // date
  rehab_goal: string
  status: 'active' | 'completed'
  created_at: string
  updated_at: string
}

export interface PhysioExercise {
  id: string
  treatment_plan_id: string
  exercise_name: string
  description: string
  sets: number
  reps: number
  frequency: string  // 'daily', '3x/week', etc
  duration_days: number
  target_muscle: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  notes: string
  created_at: string
}

export interface PhysioMeasurement {
  id: string
  case_id: string
  session_id: string | null
  measurement_date: string  // date
  measurement_type: 'range_of_motion' | 'pain_scale' | 'strength' | 'mobility' | 'circumference'
  value: number
  unit: string
  notes: string
  created_at: string
}
```

---

## ✅ Summary of Changes

| Component | Action | Details |
|-----------|--------|---------|
| **Database** | RESTRUCTURE | Split physio_slots into sessions + add cases/plans/exercises/measurements |
| **Booking** | REMOVE | No time_slot, no booking constraints |
| **Case Management** | ENHANCE | Dedicated physio_cases table with full injury tracking |
| **Sessions** | RENAME | physio_slots → physio_sessions (session recording) |
| **Treatment Plans** | NEW | physio_treatment_plans table |
| **Exercises** | NEW | physio_prescribed_exercises table |
| **Progress** | NEW | physio_measurements table with timeline |
| **UI Tabs** | RESTRUCTURE | Cases → Plans → Sessions → Measurements |

---

## 🚀 Implementation Order

1. **SQL Migrations** → Run new table creation + RLS policies
2. **TypeScript Types** → Add new types
3. **PhysioPage.tsx** → Restructure with new tabs
4. **API Functions** → Create handlers for each table
5. **Modals** → Build case, plan, session, measurement forms
6. **Testing** → Create, edit, view cases and sessions

Ready to proceed with implementation?
