import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface Athlete {
  id: string
  name: string
  ic_number: string
  date_of_birth: string | null
  gender: 'M' | 'F' | null
  sport_id: string
  sport?: { name: string }
  category: string | null
  status: 'active' | 'rest' | 'injured' | 'not_active'
  weight: number | null
  height: number | null
  photo_url: string | null
  is_elite: boolean
}

interface InBodyRecord {
  recorded_date: string
  weight: number | null
  smm: number | null
  bmi: number | null
  fat_pct: number | null
  inbody_score: number | null
}

interface FitnessTest {
  id: string
  session: string
  year: number
  recorded_date: string
}

interface FitnessTestResult {
  test_id: string
  result_value: number
  rating: 'baik' | 'sederhana' | 'lemah' | 'tidak_dinilai'
  test_name: string
}

interface SCRecord {
  session_date: string
  attendance: 'present' | 'absent' | 'mc'
}

interface PhysioSlot {
  slot_date: string
  session_type: string | null
  injury_type: string | null
}

const statusStyle: Record<string, string> = {
  active: 'bg-green-50 text-[#3A9E6A] border border-green-200',
  rest: 'bg-gray-100 text-[#888] border border-gray-200',
  injured: 'bg-red-50 text-[#D44040] border border-red-200',
  not_active: 'bg-slate-100 text-[#666] border border-slate-300',
}

const attendanceStyle: Record<string, string> = {
  present: 'bg-[#3A9E6A]',
  absent: 'bg-[#D44040]',
  mc: 'bg-[#3A7EC8]',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatIC(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 6) return digits
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
}

function calcAge(dob: string) {
  const diff = Date.now() - new Date(dob + 'T00:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function inbodyScoreColor(score: number) {
  if (score >= 80) return 'text-[#3A9E6A]'
  if (score >= 60) return 'text-[#F56A00]'
  return 'text-[#D44040]'
}

function Avatar({ name, url, size }: { name: string; url: string | null; size: number }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover bg-gray-100" />
  }
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      style={{ width: size, height: size, background: '#F56A00' }}
      className="rounded-full flex items-center justify-center shrink-0"
    >
      <span className="text-white font-bold text-xl">{initials}</span>
    </div>
  )
}

export default function AthleteProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [inbody, setInbody] = useState<InBodyRecord | null>(null)
  const [fitness, setFitness] = useState<FitnessTest | null>(null)
  const [fitnessResults, setFitnessResults] = useState<FitnessTestResult[]>([])
  const [scRecords, setScRecords] = useState<SCRecord[]>([])
  const [physio, setPhysio] = useState<PhysioSlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (id) fetchAll(id)
  }, [id])

  async function fetchAll(athleteId: string) {
    setLoading(true)

    // Fetch athlete first to get sport for supplement query
    const { data: athData } = await supabase.from('athletes').select('id, name, ic_number, sport_id, sport:sports!sport_id(name), status, gender, date_of_birth, weight, height, is_elite, photo_url, category, created_at').eq('id', athleteId).single() as any
    if (!athData) { navigate('/athletes', { replace: true }); return }
    setAthlete(athData)

    // Run all remaining queries in parallel
    const [inbodyRes, fitnessSessionRes, scRes, physioRes, fitnessResultsRes] = await Promise.all([
      supabase.from('inbody_records').select('recorded_date, weight, smm, bmi, fat_pct, inbody_score')
        .eq('athlete_id', athleteId).order('recorded_date', { ascending: false }).limit(1).single(),
      supabase.from('fitness_test_sessions').select('id, session, year, recorded_date')
        .eq('athlete_id', athleteId).order('recorded_date', { ascending: false }).limit(1).single(),
      supabase.from('strength_conditioning').select('session_date, attendance')
        .eq('athlete_id', athleteId).order('session_date', { ascending: false }).limit(20),
      supabase.from('physio_slots').select('slot_date, session_type, injury_type')
        .eq('athlete_id', athleteId).order('slot_date', { ascending: false }).limit(1).single(),
      supabase.from('fitness_test_sessions').select('id').eq('athlete_id', athleteId).order('recorded_date', { ascending: false }).limit(1).single()
        .then(async (sessionRes) => {
          if (sessionRes.data?.id) {
            return supabase.from('fitness_test_results').select('test_id, result_value, rating, test:test_id(test_name)')
              .eq('session_id', sessionRes.data.id).order('test_id')
          }
          return { data: [] }
        })
    ])

    setInbody(inbodyRes.data ?? null)
    setFitness(fitnessSessionRes.data ?? null)
    setScRecords(scRes.data ?? [])
    setPhysio(physioRes.data ?? null)

    // Process fitness results
    const resultsData = await fitnessResultsRes
    if (resultsData.data) {
      const results = resultsData.data.map(r => ({
        test_id: r.test_id,
        result_value: r.result_value,
        rating: r.rating,
        test_name: (r.test as any)?.test_name || 'Test',
      })) as FitnessTestResult[]
      setFitnessResults(results)
    }

    setLoading(false)
  }

  const updateStatus = async (newStatus: Athlete['status']) => {
    if (!athlete) return
    setUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('athletes')
        .update({ status: newStatus })
        .eq('id', athlete.id)

      if (error) throw error
      setAthlete({ ...athlete, status: newStatus })
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return <div className="py-24 text-center text-[#888] text-sm">Memuatkan profil...</div>
  }

  if (!athlete) return null

  const bmi = athlete.height && athlete.weight
    ? (athlete.weight / ((athlete.height / 100) ** 2)).toFixed(1)
    : null

  const scLast5 = scRecords.slice(0, 5)
  const presentCount = scRecords.filter(r => r.attendance === 'present').length
  const attendanceRate = scRecords.length > 0 ? Math.round((presentCount / scRecords.length) * 100) : null

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Back */}
      <button onClick={() => navigate('/athletes')} className="text-sm text-[#888] hover:text-[#F56A00] transition flex items-center gap-1">
        ← Kembali ke Senarai Atlet
      </button>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-start gap-6">
        <Avatar name={athlete.name} url={athlete.photo_url} size={80} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-[#111]">{athlete.name}</h2>
              <p className="text-sm text-[#888] mt-0.5">{athlete.sport?.name}{athlete.category ? ` · ${athlete.category}` : ''}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-start">
              <select
                value={athlete.status}
                onChange={(e) => updateStatus(e.target.value as Athlete['status'])}
                disabled={updatingStatus}
                className={`text-[11px] font-semibold px-3 py-1 rounded-full border-0 cursor-pointer disabled:opacity-50 ${statusStyle[athlete.status]}`}
              >
                <option value="active">Aktif</option>
                <option value="rest">Rehat</option>
                <option value="injured">Cedera</option>
                <option value="not_active">Tidak Aktif</option>
              </select>
              {athlete.is_elite && (
                <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200">
                  ATLET ELIT
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'No. KP', value: athlete.ic_number ? formatIC(athlete.ic_number) : '—' },
              { label: 'Tarikh Lahir', value: athlete.date_of_birth ? fmtDate(athlete.date_of_birth) : '—' },
              { label: 'Umur', value: athlete.date_of_birth ? `${calcAge(athlete.date_of_birth)} tahun` : '—' },
              { label: 'Jantina', value: athlete.gender ?? '—' },
              { label: 'Berat', value: athlete.weight ? `${athlete.weight} kg` : '—' },
              { label: 'Tinggi', value: athlete.height ? `${athlete.height} cm` : '—' },
              { label: 'BMI', value: bmi ?? '—' },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb]">{f.label}</p>
                <p className="text-sm font-medium text-[#444] mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* InBody */}
        <SummaryCard
          title="Penilaian InBody"
          date={inbody?.recorded_date ? fmtDate(inbody.recorded_date) : null}
          empty={!inbody}
          linkTo={`/performance/inbody?athlete=${id}`}
        >
          {inbody && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {inbody.inbody_score != null && (
                <div className="col-span-2 flex items-center gap-3">
                  <span className={`text-4xl font-bold font-mono ${inbodyScoreColor(inbody.inbody_score)}`}>
                    {inbody.inbody_score}
                  </span>
                  <span className="text-[12px] text-[#888]">InBody Score</span>
                </div>
              )}
              {[
                { label: 'Berat', value: inbody.weight != null ? `${inbody.weight} kg` : '—' },
                { label: 'SMM', value: inbody.smm != null ? `${inbody.smm} kg` : '—' },
                { label: 'BMI', value: inbody.bmi != null ? inbody.bmi.toFixed(1) : '—' },
                { label: 'Lemak Badan', value: inbody.fat_pct != null ? `${inbody.fat_pct}%` : '—' },
              ].map(f => (
                <Stat key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          )}
        </SummaryCard>

        {/* Fitness Testing */}
        <SummaryCard
          title="Ujian Kecergasan"
          date={fitness ? `${fitness.session} ${fitness.year}` : null}
          empty={!fitness}
          linkTo={`/fitness/testing?athlete=${id}`}
        >
          {fitness && fitnessResults.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {fitnessResults.slice(0, 6).map(result => (
                <Stat key={result.test_id} label={result.test_name} value={`${result.result_value}`} />
              ))}
            </div>
          )}
        </SummaryCard>

        {/* S&C Attendance */}
        <SummaryCard
          title="Latihan Suaian Fizikal"
          date={scRecords[0]?.session_date ? fmtDate(scRecords[0].session_date) : null}
          empty={scRecords.length === 0}
          linkTo={`/fitness/strength?athlete=${id}&tab=kehadiran`}
        >
          {scRecords.length > 0 && (
            <div className="mt-3 space-y-3">
              {attendanceRate != null && (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold font-mono text-[#F56A00]">{attendanceRate}%</span>
                  <span className="text-[12px] text-[#888]">kadar kehadiran ({scRecords.length} sesi)</span>
                </div>
              )}
              {scLast5.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#bbb] uppercase tracking-widest mb-1.5">5 Sesi Terkini</p>
                  <div className="flex gap-1.5">
                    {scLast5.map((r, i) => (
                      <div key={i} title={`${fmtDate(r.session_date)} · ${r.attendance}`} className={`w-6 h-6 rounded-md ${attendanceStyle[r.attendance]}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SummaryCard>

        {/* Physio */}
        <SummaryCard
          title="Saringan Fisioterapi"
          date={physio?.slot_date ? fmtDate(physio.slot_date) : null}
          empty={!physio}
          linkTo={`/rehabilitation/physio?athlete=${id}`}
        >
          {physio && (
            <div className="mt-3 space-y-2">
              {physio.session_type && (
                <Stat label="Jenis Sesi" value={physio.session_type === 'injury' ? 'Kecederaan' : physio.session_type === 'manual' ? 'Manual' : 'Standard'} />
              )}
              {physio.injury_type && (
                <Stat label="Kecederaan" value={physio.injury_type} />
              )}
            </div>
          )}
        </SummaryCard>

      </div>

    </div>
  )
}

function SummaryCard({
  title, date, empty, linkTo, children,
}: {
  title: string
  date: string | null
  empty: boolean
  linkTo: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 border-t-4 border-t-[#F56A00] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#888]">{title}</p>
          {date && <p className="text-[11px] text-[#bbb] mt-0.5">{date}</p>}
        </div>
        <Link to={linkTo} className="text-xs text-[#F56A00] hover:underline font-semibold shrink-0">Lihat Butiran →</Link>
      </div>
      {empty
        ? <p className="text-[12px] text-[#ccc] mt-4">Tiada rekod lagi.</p>
        : children
      }
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#bbb] uppercase tracking-widest">{label}</p>
      <p className="text-sm font-medium text-[#444] mt-0.5">{value}</p>
    </div>
  )
}
