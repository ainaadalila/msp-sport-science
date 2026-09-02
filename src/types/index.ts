export type UserRole = 'superadmin' | 'admin' | 'coach' | 'physio' | 'psikologis' | 'penolong_pegawai' | 'pegawai_belia_sukan' | 'pengguna_biasa'

export interface SubmoduleCRUD {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

export type SubmoduleKey = 'athletes' | 'strength' | 'fitness' | 'fitness_config' | 'inbody' | 'supplement' | 'physio' | 'physio_cases' | 'psychology' | 'reports'

export interface ModulePermissions {
  athletes: SubmoduleCRUD
  strength: SubmoduleCRUD
  fitness: SubmoduleCRUD
  fitness_config: SubmoduleCRUD
  inbody: SubmoduleCRUD
  supplement: SubmoduleCRUD
  physio: SubmoduleCRUD
  physio_cases: SubmoduleCRUD
  psychology: SubmoduleCRUD
  reports: SubmoduleCRUD
  supplement_coordinator: boolean
  supplement_supporter: boolean
  supplement_approver: boolean
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  module_permissions: ModulePermissions
  created_at: string
}

export interface Athlete {
  id: string
  name: string
  ic_number: string
  gender?: 'M' | 'F' | null
  sport_id: string
  sport?: { name: string }
  category?: string | null
  coach_id?: string
  school?: string
  training_centre?: string
  weight?: number | null
  height?: number | null
  championship_year?: number
  status: 'active' | 'rest' | 'injured' | 'not_active'
  created_at: string
  is_elite?: boolean
  photo_url?: string | null
  date_of_birth?: string | null
}

export interface FitnessTest {
  id: string
  athlete_id: string
  session: 'Fasa 1' | 'Fasa 2' | 'Fasa 3' | 'Fasa 4'
  year: number
  push_up?: number
  bleep_test?: number
  yoyo_test?: number
  handgrip?: number
  hexa?: number
  motor_jump?: number
  recorded_by?: string
  created_at: string
}

export interface InBodyRecord {
  id: string
  athlete_id: string
  recorded_date: string
  weight?: number
  smm?: number
  body_fat_mass?: number
  bmi?: number
  fat_pct?: number
  bmr?: number
  inbody_score?: number
  skor?: number
  ulasan?: string
  recorded_by?: string
  created_at: string
}

export interface Supplement {
  id: string
  name: string
  stock: number
  unit: string
  created_at: string
}

export interface SupplementRequest {
  id: string
  athlete_id: string
  supplement_id: string
  quantity: number
  request_date: string
  status: 'pending' | 'semakan_lulus' | 'semakan_tolak' | 'approved' | 'partial' | 'rejected'
  coordinator_id?: string
  coordinator_notes?: string
  supporter_id?: string
  supporter_status?: 'sokong' | 'tidak_sokong'
  supporter_notes?: string
  supporter_reviewed_at?: string
  requested_by?: string
  reviewed_by?: string
  approved_quantity?: number
  created_at: string
}

export interface PhysioSlot {
  id: string
  slot_date: string
  athlete_id: string | null
  diagnosis: string | null
  date_of_injury: string | null
  referred_by: string | null
  chief_complaint: string | null
  injury_type: string | null
  session_type: 'standard' | 'manual' | 'injury' | null
  assessment_notes: string | null
  rehab_plan: string | null
  pain_scale: number | null
  target_muscle: string | null
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
  case_id: string | null
  physiotherapist_id: string | null
  created_at: string
  athlete?: { name: string; sport?: { name: string } } | null
}

export interface PhysioCase {
  id: string
  athlete_id: string | null
  open_date: string
  injury_type: string | null
  status: 'active' | 'closed' | 'referred'
  rts_date: string | null
  close_reason: string | null
  referred_to: string | null
  physio_id: string | null
  created_at: string
  athlete?: { name: string; sport?: { name: string } } | null
}

export interface WeeklyExercise {
  name: string
  weeks: Array<{ sets: string; reps: string; rest: string; intensity: string }>
}

export interface ProgramSession {
  session_number: number
  day: string
  session_type: string
  warmup: string[]
  exercises: WeeklyExercise[]
  core: string[]
}

export interface StructuredProgramData {
  phase: string
  training_goals: string[]
  sessions: ProgramSession[]
}

export interface StrengthConditioning {
  id: string
  athlete_id: string
  session_date: string
  attendance: 'present' | 'absent' | 'mc'
  training_program?: string
  notes?: string
  recorded_by?: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  target_table?: string
  target_id?: string
  ip_address?: string
  created_at: string
}

export type PerformanceBand = 'baik' | 'sederhana' | 'lemah'

// NEW FLEXIBLE FITNESS TEST SYSTEM TYPES
export interface FitnessTestDefinition {
  id: string
  test_name: string
  category: 'muscular_endurance' | 'power' | 'strength' | 'flexibility' | 'agility' | 'speed' | 'cardiovascular' | 'coordination' | 'balance' | 'martial_arts'
  unit: string
  description?: string
  created_at: string
}

export interface FitnessTestNorm {
  id: string
  test_id: string
  gender: 'M' | 'F' | 'both'
  good_min?: number
  good_max?: number
  average_min?: number
  average_max?: number
  poor_min?: number
  poor_max?: number
  rating_direction: 'higher_is_better' | 'lower_is_better'
  created_at: string
}

export interface SportFitnessTest {
  id: string
  sport: string
  test_id: string
  is_mandatory: boolean
  custom_name?: string
  notes?: string
  created_by?: string
  created_at: string
  test?: FitnessTestDefinition
  norms?: FitnessTestNorm[]
}

export interface FitnessTestSession {
  id: string
  athlete_id: string
  session: 'Fasa 1' | 'Fasa 2' | 'Fasa 3' | 'Fasa 4'
  year: number
  recorded_date: string
  recorded_by: string
  created_at: string
  athlete?: { name: string; sport?: { name: string } } | null
}

export interface FitnessTestResult {
  id: string
  session_id: string
  test_id: string
  result_value: number
  rating?: 'baik' | 'sederhana' | 'lemah' | 'tidak_dinilai'
  notes?: string
  created_at: string
  test?: FitnessTestDefinition
}

export interface PhysioRating {
  id: string
  athlete_id: string
  phase: 'persediaan' | 'pertandingan' | 'pemulihan'
  cognitive_anxiety_score: number | null
  somatic_anxiety_score: number | null
  self_confidence_score: number | null
  raw_responses: Record<string, number> | null
  assessment_date: string
  catatan?: string | null
  recorded_by?: string
  created_at: string
  updated_at: string
  athlete?: { name: string; sport?: { name: string } }
}
