export const ACTION_LABELS: Record<string, string> = {
  // Auth
  login: 'Log Masuk',
  logout: 'Log Keluar',
  // User management
  create_user: 'Daftar Pengguna',
  edit_user: 'Kemaskini Pengguna',
  delete_user: 'Padam Pengguna',
  change_password: 'Tukar Kata Laluan',
  update_own_profile: 'Kemaskini Profil',
  // Athletes
  create_athlete: 'Tambah Atlet',
  update_athlete: 'Kemaskini Atlet',
  delete_athlete: 'Padam Atlet',
  // Coach schedule
  create_coach_schedule: 'Tambah Jadual Jurulatih',
  update_coach_schedule: 'Kemaskini Jadual Jurulatih',
  delete_coach_schedule: 'Padam Jadual Jurulatih',
  delete_coach_schedule_slot: 'Padam Slot Jadual',
  update_coach_assignment: 'Tugasan Jurulatih',
  create_coach_assignment: 'Tugasan Jurulatih Baharu',
  // S&C
  create_sc_session: 'Rekod Sesi S&C',
  update_sc_session: 'Kemaskini Sesi S&C',
  create_sc_program: 'Tambah Program S&C',
  update_sc_program: 'Kemaskini Program S&C',
  // Physio
  create_physio_slot: 'Buat Slot Fisio',
  update_physio_slot: 'Kemaskini Slot Fisio',
  delete_physio_slot: 'Padam Slot Fisio',
  mark_arrived_physio_slot: 'Atlet Hadir Fisio',
  create_physio_case: 'Buka Kes Fisio',
  close_physio_case: 'Tutup Kes Fisio',
  delete_physio_case: 'Padam Kes Fisio',
  open_physio_case: 'Buka Semula Kes Fisio',
  // InBody
  create_inbody: 'Rekod InBody',
  update_inbody: 'Kemaskini InBody',
  upload_inbody_diet_plan: 'Muat Naik Pelan Diet',
  delete_inbody_diet_plan: 'Padam Pelan Diet',
  // Supplement
  create_supplement: 'Tambah Suplemen',
  update_supplement: 'Kemaskini Suplemen',
  delete_supplement: 'Padam Suplemen',
  submit_supplement_request: 'Mohon Suplemen',
  koordinator_approve_supplement: 'Lulus Permohonan (Penyelaras)',
  koordinator_reject_supplement: 'Tolak Permohonan (Penyelaras)',
  approve_supplement: 'Lulus Suplemen',
  approve_supplement_partial: 'Lulus Sebahagian Suplemen',
  supporter_approve_supplement: 'Sokong Suplemen',
  supporter_reject_supplement: 'Tidak Sokong Suplemen',
  // Fitness
  submit_fitness_tests: 'Hantar Ujian Kecergasan',
}

export function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
