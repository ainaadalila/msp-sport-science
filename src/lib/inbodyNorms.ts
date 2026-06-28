export const BADGE_GREEN  = 'bg-green-50 text-[#3A9E6A] border border-green-200'
export const BADGE_ORANGE = 'bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]'
export const BADGE_RED    = 'bg-red-50 text-[#D44040] border border-red-200'
export const BADGE_GRAY   = 'bg-gray-100 text-[#888] border border-gray-200'

export type NormResult = { label: string; style: string }

export function sukmaSMM(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  return v >= 30 ? { label: 'BAIK', style: BADGE_GREEN } : { label: 'LEMAH', style: BADGE_RED }
}

export function sukmaBMI(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  if (v < 18) return { label: 'RENDAH', style: BADGE_ORANGE }
  if (v <= 24) return { label: 'NORMAL', style: BADGE_GREEN }
  return { label: 'TINGGI', style: BADGE_RED }
}

export function sukmaFat(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  return v <= 15 ? { label: 'BAIK', style: BADGE_GREEN } : { label: 'MELEBIHI', style: BADGE_RED }
}

export function sukmaScore(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  if (v >= 80) return { label: 'BAIK', style: BADGE_GREEN }
  if (v >= 60) return { label: 'SEDERHANA', style: BADGE_ORANGE }
  return { label: 'LEMAH', style: BADGE_RED }
}

export function sukmaFatMass(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  return v <= 5 ? { label: 'BAIK', style: BADGE_GREEN } : { label: 'MELEBIHI', style: BADGE_RED }
}

export function computeSkor(r: { smm: number | null; body_fat_mass: number | null; bmi: number | null; fat_pct: number | null; inbody_score: number | null }): number {
  let s = 0
  if (r.smm != null && r.smm >= 30) s++
  if (r.body_fat_mass != null && r.body_fat_mass <= 5) s++
  if (r.bmi != null && r.bmi >= 18 && r.bmi <= 24) s++
  if (r.fat_pct != null && r.fat_pct <= 15) s++
  if (r.inbody_score != null && r.inbody_score >= 80) s++
  return s
}

export function computeUlasan(skor: number): string {
  if (skor >= 4) return 'BAIK'
  if (skor === 3) return 'SEDERHANA'
  return 'LEMAH'
}
