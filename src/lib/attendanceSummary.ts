// "Ringkasan Kehadiran Bulanan" — report rows (one per session, each with a
// Kehadiran value) counted per sport and athlete, like an Excel pivot of
// Sukan / Nama Atlet against Kehadiran. Used by the S&C and Fisioterapi
// reports, each with its own set of attendance statuses (= columns).

export const SC_ATTENDANCE_STATUSES = ['Hadir', 'MC', 'Tidak Hadir']
export const PHYSIO_ATTENDANCE_STATUSES = ['Hadir', 'Selesai', 'Tidak Hadir', 'Belum Direkod']

const NO_STATUS = 'Tiada Rekod'
const NO_SPORT = 'TIADA SUKAN'

type Counts = Record<string, number>

interface AthleteSummary { name: string; counts: Counts; total: number }
interface SportSummary { sport: string; counts: Counts; total: number; athletes: AthleteSummary[] }

export interface AttendanceSummary {
  sports: SportSummary[]
  counts: Counts
  total: number
  // Only shown when some sessions have no attendance recorded
  columns: string[]
}

function statusOf(row: Record<string, unknown>, statuses: string[]) {
  const v = String(row['Kehadiran'] ?? '').trim()
  return statuses.includes(v) ? v : NO_STATUS
}

function sportOf(row: Record<string, unknown>) {
  const v = String(row['Sukan'] ?? '').trim()
  return v && v !== '—' ? v : NO_SPORT
}

export function buildAttendanceSummary(rows: Record<string, unknown>[], statuses: string[]): AttendanceSummary {
  const bySport = new Map<string, Map<string, Counts>>()
  for (const row of rows) {
    const sport = sportOf(row)
    const name = String(row['Nama Atlet'] ?? '—')
    if (!bySport.has(sport)) bySport.set(sport, new Map())
    const athletes = bySport.get(sport)!
    if (!athletes.has(name)) athletes.set(name, {})
    const counts = athletes.get(name)!
    const status = statusOf(row, statuses)
    counts[status] = (counts[status] ?? 0) + 1
  }

  const add = (into: Counts, from: Counts) => {
    for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v
  }
  const sum = (c: Counts) => Object.values(c).reduce((a, b) => a + b, 0)

  const grand: Counts = {}
  const sports: SportSummary[] = [...bySport.entries()]
    .sort(([a], [b]) => (a === NO_SPORT ? 1 : b === NO_SPORT ? -1 : a.localeCompare(b)))
    .map(([sport, athleteMap]) => {
      const sportCounts: Counts = {}
      const athletes = [...athleteMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, counts]) => {
          add(sportCounts, counts)
          return { name, counts, total: sum(counts) }
        })
      add(grand, sportCounts)
      return { sport, counts: sportCounts, total: sum(sportCounts), athletes }
    })

  return {
    sports,
    counts: grand,
    total: sum(grand),
    columns: grand[NO_STATUS] ? [...statuses, NO_STATUS] : [...statuses],
  }
}

export function attendanceSummaryCsvRows(summary: AttendanceSummary): Record<string, unknown>[] {
  const line = (sport: string, name: string, counts: Counts, total: number) => ({
    'Sukan': sport,
    'Nama Atlet': name,
    ...Object.fromEntries(summary.columns.map(c => [c, counts[c] ?? 0])),
    'Jumlah': total,
  })
  const out: Record<string, unknown>[] = []
  for (const s of summary.sports) {
    for (const a of s.athletes) out.push(line(s.sport, a.name, a.counts, a.total))
    out.push(line(s.sport, `JUMLAH ${s.sport}`, s.counts, s.total))
  }
  out.push(line('', 'JUMLAH KESELURUHAN', summary.counts, summary.total))
  return out
}
