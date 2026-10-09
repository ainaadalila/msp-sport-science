// Tests scored as weight lifted ÷ body weight (1RM Squat / Bench Press /
// Deadlift). The coach enters the kg lifted; result_value stores the ratio and
// the kg + body weight used are kept as the first line of the result's notes.

export const RELATIVE_STRENGTH_UNIT = 'x berat badan'

export function isRelativeStrengthUnit(unit: string | undefined | null) {
  return unit === RELATIVE_STRENGTH_UNIT
}

export function relativeStrengthRatio(liftedKg: number, bodyWeightKg: number) {
  return Math.round((liftedKg / bodyWeightKg) * 100) / 100
}

const NOTE_PREFIX = '[1RM]'
const NOTE_RE = /^\[1RM\] Beban ([\d.]+) kg · Berat badan ([\d.]+) kg$/

export function formatLiftNote(liftedKg: number, bodyWeightKg: number, otherNotes?: string) {
  const line = `${NOTE_PREFIX} Beban ${liftedKg} kg · Berat badan ${bodyWeightKg} kg`
  return otherNotes?.trim() ? `${line}\n${otherNotes.trim()}` : line
}

export function parseLiftNote(notes: string | null | undefined): { liftedKg?: number; bodyWeightKg?: number; otherNotes: string } {
  if (!notes) return { otherNotes: '' }
  const [first, ...rest] = notes.split('\n')
  const m = first.match(NOTE_RE)
  if (!m) return { otherNotes: notes }
  return { liftedKg: parseFloat(m[1]), bodyWeightKg: parseFloat(m[2]), otherNotes: rest.join('\n') }
}
