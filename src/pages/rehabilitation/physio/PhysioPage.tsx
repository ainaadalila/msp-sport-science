import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
import { logAction } from '../../../lib/audit'

interface Athlete {
  id: string
  name: string
  sport_id: string
  sport?: { name: string }
}

interface PhysioSlot {
  id: string
  slot_date: string
  athlete_id: string | null
  diagnosis: string | null
  date_of_injury: string | null
  referred_by: string | null
  chief_complaint: string | null
  injury_type: string | null
  assessment_notes: string | null
  rehab_plan: string | null
  progress_notes: string | null
  physiotherapist_id: string | null
  pain_scale: number | null
  target_muscle: string | null
  treatment_type: string | null
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
  case_id: string | null
  created_at: string
  athlete?: { name: string; sport?: { name: string } } | null
}

interface PhysioCase {
  id: string
  athlete_id: string | null
  open_date: string
  injury_type: string | null
  status: 'active' | 'closed'
  referred_to_doctor: boolean
  referred_date: string | null
  athlete?: { name: string; sport?: { name: string } } | null
}

type BookingFormState = {
  slot_date: string
  athlete_id: string
  case_id: string
}

type AssessmentFormState = {
  diagnosis: string
  date_of_injury: string
  referred_by: string
  chief_complaint: string
  injury_type: string
  assessment_notes: string
  rehab_plan: string
  progress_notes: string
  pain_scale: string
  target_muscle: string
  treatment_type: string
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
}



const attendanceLabel: Record<string, string> = { scheduled: 'Dijadual', arrived: 'Hadir', completed: 'Selesai', no_show: 'Tidak Hadir' }
const attendanceStyle: Record<string, string> = {
  scheduled: 'bg-gray-100 text-[#888]',
  arrived: 'bg-blue-50 text-[#3A7EC8]',
  completed: 'bg-green-50 text-green-700',
  no_show: 'bg-red-50 text-[#D44040]',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}


const emptyBookingForm: BookingFormState = {
  slot_date: new Date().toISOString().slice(0, 10),
  athlete_id: '',
  case_id: '',
}

const emptyAssessmentForm: AssessmentFormState = {
  diagnosis: '',
  date_of_injury: '',
  referred_by: '',
  chief_complaint: '',
  injury_type: '',
  assessment_notes: '',
  rehab_plan: '',
  progress_notes: '',
  pain_scale: '',
  target_muscle: '',
  treatment_type: '',
  attendance_status: 'scheduled',
}

export default function PhysioPage() {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()
  const athleteIdParam = searchParams.get('athlete')

  const [slots, setSlots] = useState<PhysioSlot[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [cases, setCases] = useState<PhysioCase[]>([])
  const [loading, setLoading] = useState(true)

  const [filterAthlete, setFilterAthlete] = useState('')

  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [detailSlot, setDetailSlot] = useState<PhysioSlot | null>(null)
  const [detailView, setDetailView] = useState<'booking' | 'full'>('booking')

  const [bookingEditing, setBookingEditing] = useState<PhysioSlot | null>(null)
  const [bookingForm, setBookingForm] = useState<BookingFormState>(emptyBookingForm)
  const [formSport, setFormSport] = useState('')
  const [bookingSaving, setBookingSaving] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const [assessmentEditing, setAssessmentEditing] = useState<PhysioSlot | null>(null)
  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormState>(emptyAssessmentForm)
  const [assessmentSaving, setAssessmentSaving] = useState(false)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<PhysioSlot | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (athleteIdParam) {
      setFilterAthlete(athleteIdParam)
    }
  }, [athleteIdParam])

  async function fetchAll() {
    setLoading(true)
    const [slotRes, athRes, caseRes] = await Promise.all([
      supabase.from('physio_slots')
        .select('id, athlete_id, case_id, slot_date, pain_scale, chief_complaint, injury_type, date_of_injury, diagnosis, treatment_type, referred_by, target_muscle, rehab_plan, progress_notes, assessment_notes, attendance_status, athlete:athletes(name, sport_id, sport:sport_id(name))')
        .order('slot_date', { ascending: false }),
      supabase.from('athletes').select('id, name, sport_id, sport:sport_id(name)').order('name'),
      supabase.from('physio_cases')
        .select('id, athlete_id, injury_type, open_date, athlete:athletes(name, sport_id, sport:sport_id(name))')
        .eq('status', 'active')
        .order('open_date', { ascending: false }),
    ])
    setSlots(slotRes.data ?? [])
    setAthletes(athRes.data ?? [])
    setCases(caseRes.data ?? [])
    setLoading(false)
  }

  function openBookingAdd() {
    setBookingEditing(null)
    setBookingForm(emptyBookingForm)
    setFormSport('')
    setBookingError(null)
    setBookingModalOpen(true)
  }

  function openBookingEdit(s: PhysioSlot) {
    setBookingEditing(s)
    setBookingForm({
      slot_date: s.slot_date,
      athlete_id: s.athlete_id ?? '',
      case_id: s.case_id ?? '',
    })
    setFormSport(s.athlete?.sport?.name ?? '')
    setBookingError(null)
    setBookingModalOpen(true)
  }

  function openAssessmentEdit(s: PhysioSlot) {
    setAssessmentEditing(s)
    setAssessmentForm({
      diagnosis: s.diagnosis ?? '',
      date_of_injury: s.date_of_injury ?? '',
      referred_by: s.referred_by ?? '',
      chief_complaint: s.chief_complaint ?? '',
      injury_type: s.injury_type ?? '',
      assessment_notes: s.assessment_notes ?? '',
      rehab_plan: s.rehab_plan ?? '',
      progress_notes: s.progress_notes ?? '',
      pain_scale: s.pain_scale !== null ? String(s.pain_scale) : '',
      target_muscle: s.target_muscle ?? '',
      treatment_type: s.treatment_type ?? '',
      attendance_status: s.attendance_status ?? 'scheduled',
    })
    setAssessmentError(null)
    setAssessmentModalOpen(true)
  }

  function setBookingField<K extends keyof BookingFormState>(key: K, val: BookingFormState[K]) {
    setBookingForm(f => ({ ...f, [key]: val }))
  }

  function setAssessmentField<K extends keyof AssessmentFormState>(key: K, val: AssessmentFormState[K]) {
    setAssessmentForm(f => ({ ...f, [key]: val }))
  }

  async function handleBookingSave() {
    if (!bookingForm.slot_date) {
      setBookingError('Tarikh sesi wajib diisi.')
      return
    }
    setBookingSaving(true)
    setBookingError(null)

    const payload = {
      slot_date: bookingForm.slot_date,
      athlete_id: bookingForm.athlete_id || null,
      case_id: bookingForm.case_id || null,
      physiotherapist_id: profile?.id,
    }

    if (bookingEditing) {
      const { error } = await supabase.from('physio_slots').update(payload).eq('id', bookingEditing.id)
      if (error) { setBookingError(error.message); setBookingSaving(false); return }
      await logAction(profile!.id, 'update_physio_slot', 'physio_slots', bookingEditing.id)
    } else {
      const { data, error } = await supabase.from('physio_slots').insert(payload).select('id').single()
      if (error) { setBookingError(error.message); setBookingSaving(false); return }
      await logAction(profile!.id, 'create_physio_slot', 'physio_slots', data.id)
    }

    setBookingSaving(false)
    setBookingModalOpen(false)
    fetchAll()
  }

  async function handleAssessmentSave() {
    setAssessmentSaving(true)
    setAssessmentError(null)

    const payload = {
      diagnosis: assessmentForm.diagnosis || null,
      date_of_injury: assessmentForm.date_of_injury || null,
      referred_by: assessmentForm.referred_by || null,
      chief_complaint: assessmentForm.chief_complaint || null,
      injury_type: assessmentForm.injury_type || null,
      assessment_notes: assessmentForm.assessment_notes || null,
      rehab_plan: assessmentForm.rehab_plan || null,
      progress_notes: assessmentForm.progress_notes || null,
      pain_scale: assessmentForm.pain_scale !== '' ? parseInt(assessmentForm.pain_scale, 10) : null,
      target_muscle: assessmentForm.target_muscle || null,
      treatment_type: assessmentForm.treatment_type || null,
      attendance_status: assessmentForm.attendance_status || 'scheduled',
    }

    const { error } = await supabase.from('physio_slots').update(payload).eq('id', assessmentEditing!.id)
    if (error) { setAssessmentError(error.message); setAssessmentSaving(false); return }
    await logAction(profile!.id, 'update_physio_slot', 'physio_slots', assessmentEditing!.id)

    setAssessmentSaving(false)
    setAssessmentModalOpen(false)
    if (detailSlot?.id === assessmentEditing?.id) {
      const updated = await supabase.from('physio_slots').select('id, athlete_id, case_id, slot_date, pain_scale, chief_complaint, injury_type, date_of_injury, diagnosis, treatment_type, referred_by, target_muscle, rehab_plan, progress_notes, assessment_notes, attendance_status, athlete:athletes(name, sport_id, sport:sport_id(name))').eq('id', assessmentEditing!.id).single()
      if (updated.data) setDetailSlot(updated.data)
    }
    fetchAll()
  }

  async function handleDelete(s: PhysioSlot) {
    try {
      setDeleting(true)
      await supabase.from('physio_slots').delete().eq('id', s.id)
      await logAction(profile!.id, 'delete_physio_slot', 'physio_slots', s.id)
      setConfirmDelete(null)
      setDetailSlot(null)
      await fetchAll()
    } finally {
      setDeleting(false)
    }
  }

  async function handleMarkArrived(s: PhysioSlot) {
    if (s.attendance_status !== 'scheduled') return
    await supabase.from('physio_slots').update({ attendance_status: 'arrived' }).eq('id', s.id)
    await logAction(profile!.id, 'mark_arrived_physio_slot', 'physio_slots', s.id)
    const updated = await supabase.from('physio_slots').select('id, athlete_id, case_id, slot_date, pain_scale, chief_complaint, injury_type, date_of_injury, diagnosis, treatment_type, referred_by, target_muscle, rehab_plan, progress_notes, assessment_notes, attendance_status, athlete:athletes(name, sport_id, sport:sport_id(name))').eq('id', s.id).single()
    if (updated.data) setDetailSlot(updated.data)
    fetchAll()
  }

  // Records view
  const filteredSlots = slots.filter(s => {
    const matchAthlete = !filterAthlete || s.athlete_id === filterAthlete
    return matchAthlete
  }).sort((a, b) => new Date(b.slot_date).getTime() - new Date(a.slot_date).getTime())

  const allSports = [...new Set(athletes.map(a => a.sport?.name))].filter(Boolean).sort()
  const modalAthletes = formSport ? athletes.filter(a => a.sport?.name === formSport) : athletes

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{slots.length} rekod sesi</p>
        {can('physio', 'create') && (
          <button onClick={() => openBookingAdd()} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            + Rekod Sesi Baharu
          </button>
        )}
      </div>

      {/* Stats Section */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Kes Aktif</p>
            <p className="text-3xl font-bold text-[#111]">{cases.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Jumlah Sesi</p>
            <p className="text-3xl font-bold text-[#111]">{slots.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Purata Kesakitan</p>
            <p className="text-3xl font-bold text-[#111]">
              {slots.filter(s => s.pain_scale !== null).length > 0
                ? (slots.filter(s => s.pain_scale !== null).reduce((sum, s) => sum + (s.pain_scale ?? 0), 0) / slots.filter(s => s.pain_scale !== null).length).toFixed(1)
                : '—'}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={filterAthlete} onChange={e => setFilterAthlete(e.target.value)} className={filterCls}>
              <option value="">Semua Atlet</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {filterAthlete && (
              <button onClick={() => setFilterAthlete('')} className="px-3 py-2 text-xs text-[#888] hover:text-[#F56A00] border border-gray-200 rounded-lg transition">
                Kosongkan Penapis
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredSlots.length === 0 ? (
              <div className="py-16 text-center text-[#888] text-sm">
                {slots.length === 0 ? 'Tiada rekod slot lagi.' : 'Tiada rekod sepadan penapis.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Tarikh', 'Atlet', 'Kecederaan', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-[12px] text-[#444] whitespace-nowrap">{fmtDate(s.slot_date)}</td>
                      <td className="px-4 py-3 font-medium text-[#111]">{s.athlete?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-[#888]">{s.injury_type ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${attendanceStyle[s.attendance_status ?? 'scheduled']}`}>
                          {attendanceLabel[s.attendance_status ?? 'scheduled']}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end text-xs">
                          <button onClick={() => { setDetailSlot(s); setDetailView('booking') }} className="text-[#3A7EC8] hover:underline font-medium">Lihat</button>
                          <button onClick={() => { setDetailSlot(s); setDetailView('full') }} className="text-[#F56A00] hover:underline font-medium">Catatan</button>
                          {can('physio', 'update') && <button onClick={() => openBookingEdit(s)} className="text-[#555] hover:underline font-medium">Edit</button>}
                          {can('physio', 'delete') && <button onClick={() => setConfirmDelete(s)} className="text-[#D44040] hover:underline font-medium">Padam</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">{bookingEditing ? 'Edit Sesi Fisioterapi' : 'Rekod Sesi Fisioterapi Baharu'}</h3>
              <button onClick={() => setBookingModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {bookingError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{bookingError}</div>}

              <div className="space-y-3">
                <Field label="Tarikh Sesi" required>
                  <input type="date" value={bookingForm.slot_date} onChange={e => setBookingField('slot_date', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sukan">
                    <select value={formSport} onChange={e => { setFormSport(e.target.value); setBookingField('athlete_id', '') }} className={inputCls}>
                      <option value="">— Semua Sukan —</option>
                      {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Atlet" required>
                    <select value={bookingForm.athlete_id} onChange={e => { setBookingField('athlete_id', e.target.value); setBookingField('case_id', '') }} className={inputCls}>
                      <option value="">— Pilih atlet —</option>
                      {modalAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Kes (Opsional)">
                  <select value={bookingForm.case_id} onChange={e => setBookingField('case_id', e.target.value)} className={inputCls} disabled={!bookingForm.athlete_id}>
                    <option value="">— Tanpa kes —</option>
                    {cases
                      .filter(c => c.athlete_id === bookingForm.athlete_id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.injury_type ?? 'Tiada diagnosis'} — {new Date(c.open_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </option>
                      ))
                    }
                  </select>
                </Field>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setBookingModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleBookingSave} disabled={bookingSaving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {bookingSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Modal */}
      {assessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">Catatan Sesi</h3>
              <button onClick={() => setAssessmentModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {assessmentError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{assessmentError}</div>}

              <div className="space-y-3">
                <Field label="Diagnosis">
                  <input value={assessmentForm.diagnosis} onChange={e => setAssessmentField('diagnosis', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. STRAIN HAMSTRING" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tarikh Kecederaan">
                    <input type="date" value={assessmentForm.date_of_injury} onChange={e => setAssessmentField('date_of_injury', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Dirujuk Oleh">
                    <input value={assessmentForm.referred_by} onChange={e => setAssessmentField('referred_by', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. DOKTOR" />
                  </Field>
                </div>
                <Field label="Keluhan Utama (COC)">
                  <textarea value={assessmentForm.chief_complaint} onChange={e => setAssessmentField('chief_complaint', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="HURAIAN KELUHAN UTAMA..." />
                </Field>
                <Field label="Jenis Kecederaan">
                  <input value={assessmentForm.injury_type} onChange={e => setAssessmentField('injury_type', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. LIGAMEN LUTUT" />
                </Field>
                <Field label="Nota Penilaian">
                  <textarea value={assessmentForm.assessment_notes} onChange={e => setAssessmentField('assessment_notes', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="DAPATAN SARINGAN..." />
                </Field>
                <Field label="Pelan Rehabilitasi">
                  <textarea value={assessmentForm.rehab_plan} onChange={e => setAssessmentField('rehab_plan', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="PELAN RAWATAN & LATIHAN..." />
                </Field>
                <Field label="Nota Kemajuan">
                  <textarea value={assessmentForm.progress_notes} onChange={e => setAssessmentField('progress_notes', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="PERKEMBANGAN SEMASA..." />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Skala Kesakitan (0–10)">
                    <input type="number" min={0} max={10} value={assessmentForm.pain_scale} onChange={e => setAssessmentField('pain_scale', e.target.value)} className={inputCls} placeholder="0–10" />
                  </Field>
                  <Field label="Status Kehadiran">
                    <select value={assessmentForm.attendance_status} onChange={e => setAssessmentField('attendance_status', e.target.value as AssessmentFormState['attendance_status'])} className={inputCls}>
                      <option value="scheduled">Dijadual</option>
                      <option value="arrived">Hadir</option>
                      <option value="completed">Selesai</option>
                      <option value="no_show">Tidak Hadir</option>
                    </select>
                  </Field>
                </div>
                <Field label="Otot Sasaran">
                  <input value={assessmentForm.target_muscle} onChange={e => setAssessmentField('target_muscle', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. HAMSTRING, QUADRICEPS" />
                </Field>
                <Field label="Jenis Rawatan">
                  <input value={assessmentForm.treatment_type} onChange={e => setAssessmentField('treatment_type', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. ULTRASOUND, TENS, MANUAL THERAPY" />
                </Field>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setAssessmentModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleAssessmentSave} disabled={assessmentSaving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {assessmentSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {detailSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-[#111]">{detailSlot.athlete?.name ?? 'Tiada Atlet'}</h3>
                <p className="text-[12px] text-[#888]">{fmtDate(detailSlot.slot_date)} · {detailSlot.athlete?.sport?.name ?? ''}</p>
              </div>
              <button onClick={() => setDetailSlot(null)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              {detailView === 'booking' ? (
                // Modal 1: Booking View
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Maklumat Sesi</p>
                  <div className="space-y-2">
                    {[
                      ['Diagnosis', detailSlot.diagnosis],
                      ['Tarikh Kecederaan', detailSlot.date_of_injury ? fmtDate(detailSlot.date_of_injury) : null],
                      ['Dirujuk Oleh', detailSlot.referred_by],
                      ['Kes', detailSlot.case_id ? cases.find(c => c.id === detailSlot.case_id)?.athlete?.name : null],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between">
                        <p className="text-[10px] text-[#888]">{label}</p>
                        <p className="text-sm font-medium text-[#111]">{val ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Modal 2: Full Session View
                <>
                  {/* Session Summary */}
                  <div className="bg-[#F5F5F7] rounded-lg px-4 py-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-[#888]">MAKLUMAT SESI</p>
                    <div className="text-sm text-[#444] space-y-0.5">
                      <p><span className="text-[#888]">Diagnosis:</span> {detailSlot.diagnosis || '—'}</p>
                      <p><span className="text-[#888]">Tarikh Kecederaan:</span> {detailSlot.date_of_injury ? fmtDate(detailSlot.date_of_injury) : '—'}</p>
                      <p><span className="text-[#888]">Dirujuk Oleh:</span> {detailSlot.referred_by || '—'}</p>
                    </div>
                  </div>

                  {/* Assessment Details */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Catatan Sesi</p>
                    {[
                      ['Keluhan Utama (COC)', detailSlot.chief_complaint],
                      ['Jenis Kecederaan', detailSlot.injury_type],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <p className="text-[10px] text-[#888] mb-1">{label}</p>
                        <p className="text-sm text-[#444] bg-gray-50 rounded px-3 py-2">{val || '—'}</p>
                      </div>
                    ))}
                    {[
                      ['Nota Penilaian', detailSlot.assessment_notes],
                      ['Pelan Rehabilitasi', detailSlot.rehab_plan],
                      ['Nota Kemajuan', detailSlot.progress_notes],
                    ].map(([label, val]) => (
                      val && (
                        <div key={label as string}>
                          <p className="text-[10px] text-[#888] mb-1 font-semibold">{label}</p>
                          <p className="text-sm text-[#444] bg-gray-50 rounded px-3 py-2 whitespace-pre-wrap">{val}</p>
                        </div>
                      )
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      {detailSlot.pain_scale !== null && (
                        <div className="bg-[#F5F5F7] rounded px-3 py-2">
                          <p className="text-[10px] text-[#888] mb-0.5">Skala Kesakitan</p>
                          <p className="text-sm font-bold text-[#111]">{detailSlot.pain_scale} / 10</p>
                        </div>
                      )}
                      <div className="bg-[#F5F5F7] rounded px-3 py-2">
                        <p className="text-[10px] text-[#888] mb-0.5">Status Kehadiran</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block ${attendanceStyle[detailSlot.attendance_status ?? 'scheduled']}`}>
                          {attendanceLabel[detailSlot.attendance_status ?? 'scheduled']}
                        </span>
                      </div>
                    </div>
                    {detailSlot.target_muscle && (
                      <div>
                        <p className="text-[10px] text-[#888] mb-1">Otot Sasaran</p>
                        <p className="text-sm text-[#444] bg-gray-50 rounded px-3 py-2">{detailSlot.target_muscle}</p>
                      </div>
                    )}
                    {detailSlot.treatment_type && (
                      <div>
                        <p className="text-[10px] text-[#888] mb-1">Jenis Rawatan</p>
                        <p className="text-sm text-[#444] bg-gray-50 rounded px-3 py-2">{detailSlot.treatment_type}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 flex-wrap">
              {detailView === 'booking' ? (
                <>
                  {can('physio', 'delete') && (
                    <button onClick={() => { setConfirmDelete(detailSlot); setDetailSlot(null) }} className="px-4 py-2 text-sm text-[#D44040] border border-red-200 rounded-lg hover:bg-red-50 transition">Padam</button>
                  )}
                  {can('physio', 'update') && detailSlot.attendance_status === 'scheduled' && (
                    <button onClick={() => handleMarkArrived(detailSlot)} className="px-4 py-2 text-sm font-semibold text-white bg-[#3A7EC8] hover:bg-blue-700 rounded-lg transition">
                      Tandai Hadir
                    </button>
                  )}
                  <button onClick={() => setDetailView('full')} className="px-4 py-2 text-sm font-semibold bg-[#F5F5F7] text-[#111] hover:bg-gray-100 rounded-lg transition">
                    Catatan Sesi
                  </button>
                  {can('physio', 'update') && (
                    <button onClick={() => { openBookingEdit(detailSlot); setDetailSlot(null) }} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition">Edit</button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => setDetailView('booking')} className="px-4 py-2 text-sm font-semibold bg-[#F5F5F7] text-[#111] hover:bg-gray-100 rounded-lg transition">
                    Kembali
                  </button>
                  {can('physio', 'update') && (
                    <button onClick={() => { openAssessmentEdit(detailSlot); setDetailSlot(null) }} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition">Edit Catatan</button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam sesi ini?</p>
            <p className="text-[13px] text-[#888] mb-6">{fmtDate(confirmDelete.slot_date)} · {confirmDelete.athlete?.name ?? 'Tiada atlet'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 disabled:opacity-60 rounded-lg transition">{deleting ? 'Padam...' : 'Padam'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const filterCls = 'bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444] outline-none focus:border-[#F56A00]'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">
        {label}{required && <span className="text-[#D44040] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
