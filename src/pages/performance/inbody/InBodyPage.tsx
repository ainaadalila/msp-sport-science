import { useEffect, useState, useRef, useMemo, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
import { logAction } from '../../../lib/audit'
import { BADGE_GREEN, BADGE_ORANGE, BADGE_RED, type NormResult, sukmaSMM, sukmaBMI, sukmaFat, sukmaScore, sukmaFatMass, computeSkor, computeUlasan } from '../../../lib/inbodyNorms'
import { useSports } from '../../../hooks/useSports'
import { useAthletes } from '../../../hooks/useAthletes'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Athlete {
  id: string
  name: string
  ic_number: string
  sport_id: string
  status: string
  is_elite: boolean
  sport?: { name: string }
}

interface InBodyRecord {
  id: string
  athlete_id: string
  recorded_date: string
  weight: number | null
  smm: number | null
  body_fat_mass: number | null
  bmi: number | null
  fat_pct: number | null
  bmr: number | null
  inbody_score: number | null
  skor: number | null
  ulasan: string | null
  diet_plan_url: string | null
  diet_plan_name: string | null
  catatan: string | null
  created_at: string
  athlete?: { name: string; sport?: { name: string } }
}

type FormState = Omit<InBodyRecord, 'id' | 'created_at' | 'athlete'>

const emptyForm: FormState = {
  athlete_id: '',
  recorded_date: new Date().toISOString().slice(0, 10),
  weight: null,
  smm: null,
  body_fat_mass: null,
  bmi: null,
  fat_pct: null,
  bmr: null,
  inbody_score: null,
  skor: null,
  ulasan: null,
  diet_plan_url: null,
  diet_plan_name: null,
  catatan: null,
}

function scoreBadge(score: number | null) {
  if (score == null) return { label: '—', style: 'bg-gray-100 text-[#888] border border-gray-200' }
  if (score >= 80) return { label: `${score}`, style: 'bg-green-50 text-[#3A9E6A] border border-green-200' }
  if (score >= 60) return { label: `${score}`, style: 'bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]' }
  return { label: `${score}`, style: 'bg-red-50 text-[#D44040] border border-red-200' }
}

function n(val: number | null, unit = '', decimals = 1) {
  return val != null ? `${Number(val).toFixed(decimals)}${unit}` : '—'
}


function InBodyScoreGauge({ score }: { score: number | null }) {
  const pct = score != null ? Math.min(Math.max(score, 0), 100) : null
  if (pct == null) return <p className="text-sm text-[#888]">—</p>
  const color = pct >= 80 ? '#3A9E6A' : pct >= 60 ? '#F56A00' : '#D44040'
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-3">Skor InBody</p>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-4xl font-bold font-mono" style={{ color }}>{pct}</span>
        <span className="text-[11px] text-[#888] mb-1">/ 100</span>
      </div>
      <div className="relative h-3 rounded-full overflow-visible"
           style={{ background: 'linear-gradient(to right, #D44040 0%, #F56A00 40%, #FFD600 70%, #3A9E6A 100%)' }}>
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#111] rounded-full shadow"
             style={{ left: `calc(${pct}% - 8px)` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-[#888]">
        <span>0 — Lemah</span><span>40 — Sederhana</span><span>70 — Baik</span>
      </div>
    </div>
  )
}


export default function InBodyPage() {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const { sports } = useSports()
  const [searchParams] = useSearchParams()
  const athleteIdParam = searchParams.get('athlete')

  const [records, setRecords] = useState<InBodyRecord[]>([])
  const { athletes } = useAthletes()
  const [loading, setLoading] = useState(true)

  // Athlete-first filters (matches AthletesPage style)
  const [search, setSearch] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [viewRecord, setViewRecord] = useState<InBodyRecord | null>(null)
  const [editing, setEditing] = useState<InBodyRecord | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<InBodyRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formSportFilter, setFormSportFilter] = useState<string>('')

  type ViewTab = 'jadual' | 'profil'
  const [activeTab, setActiveTab] = useState<ViewTab>('jadual')
  const [profilSport, setProfilSport] = useState<string>('')
  const [profilAthlete, setProfilAthlete] = useState<string>('')
  const [profilRecords, setProfilRecords] = useState<InBodyRecord[]>([])
  const [profilLoading, setProfilLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ATHLETES_PER_PAGE = 25

  const fileInputRef = useRef<HTMLInputElement>(null)
  const profilRef = useRef<HTMLDivElement>(null)
  const [uploadingDietPlan, setUploadingDietPlan] = useState(false)
  const [dietPlanError, setDietPlanError] = useState<string | null>(null)

  async function openDietPlan(url: string) {
    const match = url.match(/inbody_diet_plans\/(.+)$/)
    if (!match) { window.open(url, '_blank'); return }
    const { data, error } = await supabase.storage.from('inbody_diet_plans').createSignedUrl(match[1], 120)
    if (!error && data) window.open(data.signedUrl, '_blank')
    else window.open(url, '_blank')
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    fetchAthleteRecords(profilAthlete)
  }, [profilAthlete])

  useEffect(() => {
    if (athleteIdParam && athletes.length > 0) {
      const athlete = athletes.find(a => a.id === athleteIdParam)
      setActiveTab('profil')
      setProfilAthlete(athleteIdParam)
      if (athlete) setProfilSport(athlete.sport_id)
    }
  }, [athleteIdParam, athletes])

  // Reset pagination and collapse expanded row when filters change
  useEffect(() => {
    setCurrentPage(1)
    setExpandedAthleteId(null)
  }, [search, filterSport])

  async function fetchAll() {
    setLoading(true)
    const [recRes] = await Promise.all([
      supabase
        .from('inbody_records')
        .select('id, athlete_id, recorded_date, weight, smm, body_fat_mass, bmi, fat_pct, bmr, inbody_score, skor, diet_plan_url, diet_plan_name, catatan, athlete:athletes(name, sport_id, sport:sport_id(name))')
        .order('recorded_date', { ascending: false }).limit(5000),
    ]) as any
    setRecords(recRes.data ?? [])
    setLoading(false)
  }

  async function fetchAthleteRecords(athleteId: string) {
    if (!athleteId) { setProfilRecords([]); return }
    setProfilLoading(true)
    const { data } = await supabase
      .from('inbody_records')
      .select('id, athlete_id, recorded_date, weight, smm, body_fat_mass, bmi, fat_pct, bmr, inbody_score, skor, diet_plan_url, diet_plan_name, catatan, athlete:athletes(name, sport_id, sport:sport_id(name))')
      .eq('athlete_id', athleteId)
      .order('recorded_date', { ascending: true }) as any
    setProfilRecords(data ?? [])
    setProfilLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, recorded_date: new Date().toISOString().slice(0, 10) })
    setFormSportFilter('')
    setError(null)
    setModalOpen(true)
  }

  function openAddForAthlete(a: Athlete) {
    setEditing(null)
    setForm({ ...emptyForm, athlete_id: a.id, recorded_date: new Date().toISOString().slice(0, 10) })
    setFormSportFilter(a.sport?.name ?? '')
    setError(null)
    setModalOpen(true)
  }

  function openEdit(r: InBodyRecord) {
    setEditing(r)
    const { id, created_at, athlete, ...rest } = r
    setForm(rest)
    setFormSportFilter(r.athlete?.sport?.name ?? '')
    setError(null)
    setModalOpen(true)
  }

  function setField(key: keyof FormState, val: string | number | null) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!form.athlete_id || !form.recorded_date) {
      setError('Atlet dan tarikh rekod wajib dipilih.')
      return
    }
    setSaving(true)
    setError(null)

    const skor = computeSkor(form)
    const ulasan = computeUlasan(skor)
    const payload = { ...form, skor, ulasan, recorded_by: profile?.id }

    if (editing) {
      const { error } = await supabase.from('inbody_records').update(payload).eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'update_inbody', 'inbody_records', editing.id)
    } else {
      const { data, error } = await supabase.from('inbody_records').insert(payload).select('id').single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'create_inbody', 'inbody_records', data.id)
    }

    setSaving(false)
    setModalOpen(false)
    fetchAll()
    if (profilAthlete) fetchAthleteRecords(profilAthlete)
  }

  async function handleDelete(r: InBodyRecord) {
    try {
      setDeleting(true)
      await supabase.from('inbody_records').delete().eq('id', r.id)
      setConfirmDelete(null)
      setViewRecord(null)
      await fetchAll()
      if (profilAthlete) await fetchAthleteRecords(profilAthlete)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDietPlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !viewRecord) return

    setUploadingDietPlan(true)
    setDietPlanError(null)

    try {
      const sanitizedName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '')
      const fileName = `inbody_diet_${viewRecord.id}_${Date.now()}_${sanitizedName}`
      const { error: uploadError } = await supabase.storage
        .from('inbody_diet_plans')
        .upload(fileName, file)

      if (uploadError) {
        setDietPlanError(uploadError.message)
        setUploadingDietPlan(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('inbody_diet_plans')
        .getPublicUrl(fileName)

      await supabase.from('inbody_records')
        .update({ diet_plan_url: publicUrl, diet_plan_name: file.name })
        .eq('id', viewRecord.id)

      await logAction(profile!.id, 'upload_inbody_diet_plan', 'inbody_records', viewRecord.id)

      setViewRecord({ ...viewRecord, diet_plan_url: publicUrl, diet_plan_name: file.name })
      fetchAll()
      if (profilAthlete) fetchAthleteRecords(profilAthlete)
    } catch (err) {
      setDietPlanError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingDietPlan(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteDietPlan() {
    if (!viewRecord?.diet_plan_url) return

    setUploadingDietPlan(true)
    setDietPlanError(null)

    try {
      const fileName = viewRecord.diet_plan_url.split('/').pop() || ''
      if (fileName) {
        await supabase.storage.from('inbody_diet_plans').remove([fileName])
      }

      await supabase.from('inbody_records')
        .update({ diet_plan_url: null, diet_plan_name: null })
        .eq('id', viewRecord.id)

      await logAction(profile!.id, 'delete_inbody_diet_plan', 'inbody_records', viewRecord.id)

      setViewRecord({ ...viewRecord, diet_plan_url: null, diet_plan_name: null })
      fetchAll()
      if (profilAthlete) fetchAthleteRecords(profilAthlete)
    } catch (err) {
      setDietPlanError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setUploadingDietPlan(false)
    }
  }

  function handlePrint() {
    if (!latestRecord || !profilAthlete) return
    const athlete = athletes.find(a => a.id === profilAthlete)
    if (!athlete) return

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const PW = pdf.internal.pageSize.getWidth()
    const PH = pdf.internal.pageSize.getHeight()
    const M = 14
    const CW = PW - M * 2
    let y = M

    const checkPage = (needed: number) => {
      if (y + needed > PH - M) { pdf.addPage(); y = M }
    }

    function normPdfColors(style: string): { fill: [number,number,number]; text: [number,number,number] } {
      if (style.includes('green')) return { fill: [220, 252, 231], text: [22, 163, 74] }
      if (style.includes('F56A00') || style.includes('rgba(245')) return { fill: [255, 237, 213], text: [245, 106, 0] }
      if (style.includes('red')) return { fill: [254, 226, 226], text: [220, 38, 38] }
      return { fill: [229, 231, 235], text: [136, 136, 136] }
    }

    // HEADER
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(245, 106, 0)
    pdf.text('LAPORAN PROFIL INBODY', M, y)
    y += 7
    pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
    pdf.text(athlete.name, M, y)
    y += 7
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
    const hDate = new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
    pdf.text(`${athlete.sport?.name || ''}   ${hDate}`, M, y)
    y += 5
    pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y)
    y += 9

    // 4 METRIC CARDS
    const cardW = (CW - 9) / 4
    const cardH = 18
    const metricCards = [
      { label: 'Berat Badan',      val: n(latestRecord.weight, ' kg'), rgb: [17, 17, 17]   as [number,number,number] },
      { label: 'Jisim Otot (SMM)', val: n(latestRecord.smm, ' kg'),   rgb: [245, 106, 0]  as [number,number,number] },
      { label: 'BMI',              val: n(latestRecord.bmi),           rgb: [58, 126, 200] as [number,number,number] },
      { label: 'Lemak Badan',      val: n(latestRecord.fat_pct, '%'),  rgb: [212, 64, 64]  as [number,number,number] },
    ]
    metricCards.forEach(({ label, val, rgb }, i) => {
      const cx = M + i * (cardW + 3)
      pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.3); pdf.roundedRect(cx, y, cardW, cardH, 1.5, 1.5)
      pdf.setFillColor(245, 106, 0); pdf.rect(cx, y, cardW, 1.5, 'F')
      pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
      pdf.text(label.toUpperCase(), cx + 3, y + 7)
      pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(rgb[0], rgb[1], rgb[2])
      pdf.text(val, cx + 3, y + 15.5)
    })
    y += cardH + 8

    // BODY COMPOSITION CHART (left) + INBODY SCORE (right)
    const halfW = (CW - 5) / 2
    const PANEL_H = 78

    // Left: 5 mini line charts
    pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.3); pdf.roundedRect(M, y, halfW, PANEL_H, 2, 2)
    pdf.setFillColor(249, 250, 251); pdf.rect(M + 0.3, y + 0.3, halfW - 0.6, 9, 'F')
    pdf.setDrawColor(229, 231, 235); pdf.line(M, y + 9, M + halfW, y + 9)
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
    pdf.text('KOMPOSISI BADAN (TREND)', M + 3, y + 6.5)

    const miniMetrics: { key: keyof typeof chartData[0]; label: string; unit: string; rgb: [number,number,number] }[] = [
      { key: 'weight',  label: 'Berat',         unit: ' kg', rgb: [99, 102, 241]  },
      { key: 'smm',     label: 'Jisim Otot',    unit: ' kg', rgb: [245, 106, 0]   },
      { key: 'fatMass', label: 'Lemak Badan',   unit: ' kg', rgb: [212, 64, 64]   },
      { key: 'bmi',     label: 'BMI',           unit: '',    rgb: [58, 126, 200]  },
      { key: 'fatPct',  label: 'Lemak Badan %', unit: '%',   rgb: [58, 158, 106]  },
    ]
    const miniRowH = (PANEL_H - 11) / 5
    const labelColW = 28
    const chartColX = M + 3 + labelColW
    const chartColW = halfW - labelColW - 6
    miniMetrics.forEach(({ key, label, unit, rgb }, mi) => {
      const rowY = y + 10 + mi * miniRowH
      if (mi > 0) {
        pdf.setDrawColor(235, 235, 235); pdf.setLineWidth(0.2); pdf.line(M + 3, rowY, M + halfW - 3, rowY)
      }
      const vals = chartData.map(d => d[key] as number | null)
      const validVals = vals.filter((v): v is number => v != null)
      const latestVal = validVals.length > 0 ? validVals[validVals.length - 1] : null
      pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
      pdf.text(label.toUpperCase(), M + 3, rowY + 4.5)
      pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(rgb[0], rgb[1], rgb[2])
      pdf.text(latestVal != null ? `${Number(latestVal).toFixed(1)}${unit}` : '—', M + 3, rowY + miniRowH - 2.5)
      if (validVals.length > 1) {
        const minV = Math.min(...validVals)
        const maxV = Math.max(...validVals)
        const range = maxV - minV || 1
        const lineH = miniRowH - 5
        const lineY = rowY + 2.5
        const pts = chartData.map((d, i) => {
          const v = d[key] as number | null
          const px = chartColX + (i / (chartData.length - 1)) * chartColW
          const py = v != null ? lineY + lineH - ((v - minV) / range) * lineH : null
          return { px, py }
        })
        pdf.setDrawColor(rgb[0], rgb[1], rgb[2]); pdf.setLineWidth(0.7)
        let drawing = false
        pts.forEach((pt, i) => {
          if (pt.py == null) { drawing = false; return }
          if (!drawing || pts[i - 1]?.py == null) {
            pdf.moveTo(pt.px, pt.py); drawing = true
          } else {
            pdf.lineTo(pt.px, pt.py)
          }
        })
        pdf.stroke()
        pts.forEach(pt => {
          if (pt.py == null) return
          pdf.setFillColor(rgb[0], rgb[1], rgb[2]); pdf.circle(pt.px, pt.py, 0.8, 'F')
        })
      }
    })

    // Right: InBody score + SUKMA norms
    const rx = M + halfW + 5
    pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.3); pdf.roundedRect(rx, y, halfW, PANEL_H, 2, 2)
    let sy = y + 6
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
    pdf.text('SKOR INBODY', rx + 3, sy); sy += 7
    const score = latestRecord.inbody_score ?? null
    const sRGB: [number,number,number] = score == null ? [136,136,136] : score >= 80 ? [58,158,106] : score >= 60 ? [245,106,0] : [212,64,64]
    pdf.setFontSize(22); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(sRGB[0], sRGB[1], sRGB[2])
    pdf.text(score != null ? String(score) : '-', rx + 3, sy)
    const snw = pdf.getTextWidth(score != null ? String(score) : '-')
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
    pdf.text('/ 100', rx + 4 + snw, sy); sy += 5
    const sbX = rx + 3, sbW = halfW - 6, sbH = 3.5
    pdf.setFillColor(212, 64, 64);  pdf.rect(sbX,                sy, sbW * 0.4, sbH, 'F')
    pdf.setFillColor(245, 106, 0);  pdf.rect(sbX + sbW * 0.4,   sy, sbW * 0.3, sbH, 'F')
    pdf.setFillColor(58, 158, 106); pdf.rect(sbX + sbW * 0.7,   sy, sbW * 0.3, sbH, 'F')
    if (score != null) {
      const dotX = sbX + (score / 100) * sbW
      pdf.setFillColor(255, 255, 255); pdf.circle(dotX, sy + sbH / 2, 2, 'F')
      pdf.setDrawColor(17, 17, 17); pdf.setLineWidth(0.5); pdf.circle(dotX, sy + sbH / 2, 2, 'S')
    }
    sy += sbH + 2.5
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
    pdf.text('0 Lemah', sbX, sy)
    pdf.text('40 Sederhana', sbX + sbW * 0.4, sy, { align: 'center' })
    pdf.text('Baik 100', sbX + sbW, sy, { align: 'right' })
    sy += 7
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
    pdf.text('PIAWAIAN SUKMA', rx + 3, sy); sy += 5.5
    const sukmaRows: [string, NormResult, string][] = [
      ['SMM',               sukmaSMM(latestRecord.smm),              n(latestRecord.smm, ' kg')],
      ['Lemak Badan (kg)',  sukmaFatMass(latestRecord.body_fat_mass), n(latestRecord.body_fat_mass, ' kg')],
      ['BMI',               sukmaBMI(latestRecord.bmi),              n(latestRecord.bmi)],
      ['Lemak Badan %',     sukmaFat(latestRecord.fat_pct),          n(latestRecord.fat_pct, '%')],
      ['Skor InBody',       sukmaScore(latestRecord.inbody_score ?? null), n(latestRecord.inbody_score, '', 0)],
    ]
    const badgeW = 22
    sukmaRows.forEach(([metric, norm, val]) => {
      const { fill, text } = normPdfColors(norm.style)
      pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(68, 68, 68)
      pdf.text(metric, rx + 3, sy)
      pdf.setTextColor(136, 136, 136)
      pdf.text(val, rx + halfW - badgeW - 4, sy, { align: 'right' })
      const bx = rx + halfW - badgeW - 1
      pdf.setFillColor(fill[0], fill[1], fill[2]); pdf.roundedRect(bx, sy - 3.5, badgeW, 5, 1.2, 1.2, 'F')
      pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(text[0], text[1], text[2])
      pdf.text(norm.label, bx + badgeW / 2, sy - 0.3, { align: 'center' })
      sy += 6.5
    })

    y += PANEL_H + 8
    checkPage(28)

    // LATEST RECORD DETAILS
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
    pdf.text('REKOD TERKINI', M, y)
    const rDateStr = new Date(latestRecord.recorded_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 17, 17)
    pdf.text(`  -  ${rDateStr}`, M + pdf.getTextWidth('REKOD TERKINI'), y)
    y += 5
    const detailItems: [string, string][] = [
      ['Berat Badan', n(latestRecord.weight, ' kg')],
      ['Jisim Otot (SMM)', n(latestRecord.smm, ' kg')],
      ['Lemak Badan (kg)', n(latestRecord.body_fat_mass, ' kg')],
      ['BMI', n(latestRecord.bmi)],
      ['% Lemak', n(latestRecord.fat_pct, '%')],
      ['BMR', n(latestRecord.bmr, ' kcal', 0)],
      ['Skor InBody', n(latestRecord.inbody_score, '', 0)],
      ['Skor SUKMA', latestSkor != null ? `${latestSkor}/5 - ${latestUlasan}` : '-'],
    ]
    const dCols = 4, dW = (CW - (dCols - 1) * 3) / dCols, dH = 13
    detailItems.forEach(([label, val], i) => {
      const dx = M + (i % dCols) * (dW + 3), dy = y + Math.floor(i / dCols) * (dH + 2)
      pdf.setFillColor(245, 245, 247); pdf.roundedRect(dx, dy, dW, dH, 1.5, 1.5, 'F')
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
      pdf.text(label, dx + 3, dy + 5.5)
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
      pdf.text(val, dx + 3, dy + 11)
    })
    y += Math.ceil(detailItems.length / dCols) * (dH + 2) + 8
    checkPage(25)

    // HISTORY TABLE
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
    pdf.text('SEJARAH REKOD', M, y); y += 5
    const hCols = [
      { label: 'Tarikh',      w: CW * 0.18 },
      { label: 'Berat (kg)',  w: CW * 0.13 },
      { label: 'BMI',         w: CW * 0.11 },
      { label: 'Lemak %',     w: CW * 0.12 },
      { label: 'SMM (kg)',    w: CW * 0.13 },
      { label: 'Skor InBody', w: CW * 0.16 },
      { label: 'Skor SUKMA',  w: CW * 0.17 },
    ]
    const hX: number[] = [M]
    for (let i = 0; i < hCols.length - 1; i++) hX.push(hX[i] + hCols[i].w)
    pdf.setFillColor(249, 250, 251); pdf.rect(M, y, CW, 6, 'F')
    pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.3); pdf.line(M, y + 6, M + CW, y + 6)
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(85, 85, 85)
    hCols.forEach((col, i) => pdf.text(col.label, i === 0 ? hX[i] + 2 : hX[i] + col.w - 2, y + 4.5, { align: i === 0 ? 'left' : 'right' }))
    y += 6
    const HROW = 9
    ;[...profilRecords].reverse().forEach(r => {
      checkPage(HROW + 2)
      const rS = computeSkor(r), rU = computeUlasan(rS)
      pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(68, 68, 68)
      pdf.text(fmtDate(r.recorded_date), hX[0] + 2, y + 6)
      pdf.text(n(r.weight), hX[1] + hCols[1].w - 2, y + 6, { align: 'right' })
      pdf.text(n(r.bmi), hX[2] + hCols[2].w - 2, y + 6, { align: 'right' })
      pdf.text(n(r.fat_pct, '%'), hX[3] + hCols[3].w - 2, y + 6, { align: 'right' })
      pdf.text(n(r.smm, ' kg'), hX[4] + hCols[4].w - 2, y + 6, { align: 'right' })
      if (r.inbody_score != null) {
        const sb = scoreBadge(r.inbody_score)
        const sr: [number,number,number] = sb.style.includes('green') ? [58,158,106] : sb.style.includes('F56A00') ? [245,106,0] : [212,64,64]
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(sr[0], sr[1], sr[2])
        pdf.text(String(r.inbody_score), hX[5] + hCols[5].w - 2, y + 6, { align: 'right' })
      } else {
        pdf.setTextColor(136, 136, 136); pdf.text('-', hX[5] + hCols[5].w - 2, y + 6, { align: 'right' })
      }
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(68, 68, 68)
      pdf.text(`${rS}/5 - ${rU}`, hX[6] + hCols[6].w - 2, y + 6, { align: 'right' })
      pdf.setDrawColor(243, 244, 246); pdf.setLineWidth(0.2); pdf.line(M, y + HROW, M + CW, y + HROW)
      y += HROW
    })

    pdf.save(`Profil_InBody_${athlete.name}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // Compute latest record and count per athlete from fetched records
  const latestByAthlete = useMemo(() => {
    const map = new Map<string, InBodyRecord>()
    for (const r of records) {
      const existing = map.get(r.athlete_id)
      if (!existing || r.recorded_date > existing.recorded_date) map.set(r.athlete_id, r)
    }
    return map
  }, [records])

  const countByAthlete = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) map.set(r.athlete_id, (map.get(r.athlete_id) ?? 0) + 1)
    return map
  }, [records])

  // Filter athletes using AthletesPage-style filters
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      const q = search.toLowerCase()
      const sportName = a.sport?.name?.toLowerCase() || ''
      const matchSearch = !q || a.name.toLowerCase().includes(q) || (a.ic_number || '').toLowerCase().includes(q) || sportName.includes(q)
      const matchSport = !filterSport || a.sport_id === filterSport
      return matchSearch && matchSport
    })
  }, [athletes, search, filterSport])

  const totalPages = Math.ceil(filteredAthletes.length / ATHLETES_PER_PAGE)
  const paginatedAthletes = filteredAthletes.slice(
    (currentPage - 1) * ATHLETES_PER_PAGE,
    currentPage * ATHLETES_PER_PAGE
  )

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const latestRecord = profilRecords.length > 0 ? profilRecords[profilRecords.length - 1] : null
  const latestSkor = latestRecord ? computeSkor(latestRecord) : null
  const latestUlasan = latestSkor != null ? computeUlasan(latestSkor) : null

  const chartData = profilRecords.slice(-10).map(r => ({
    date: new Date(r.recorded_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }),
    weight:  r.weight ?? null,
    smm:     r.smm ?? null,
    fatMass: r.body_fat_mass ?? null,
    bmi:     r.bmi ?? null,
    fatPct:  r.fat_pct ?? null,
  }))

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{records.length} rekod penilaian</p>
        <div className="flex items-center gap-2">
          {activeTab === 'profil' && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#F56A00] text-white text-sm font-semibold rounded-lg hover:bg-[#D45A00] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M9 12h6m-6 4h6M9 8h.01M15 8h.01M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z"/>
              </svg>
              Muat Turun
            </button>
          )}
          {activeTab === 'jadual' && can('inbody', 'create') && (
            <button onClick={openAdd} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Rekod InBody
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['jadual', 'profil'] as ViewTab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === t ? 'bg-white text-[#111] shadow-sm' : 'text-[#888] hover:text-[#444]'
            }`}>
            {t === 'jadual' ? 'Senarai Atlet' : 'Profil InBody'}
          </button>
        ))}
      </div>

      {activeTab === 'jadual' ? (
        <>
          {/* Filters — AthletesPage style */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Cari nama, IC, sukan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${filterCls} min-w-[200px]`}
            />
            <select value={filterSport} onChange={e => setFilterSport(e.target.value)} className={filterCls}>
              <option value="">Semua Sukan</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {(search || filterSport) && (
              <button
                onClick={() => { setSearch(''); setFilterSport('') }}
                className="px-3 py-2 text-xs text-[#888] hover:text-[#F56A00] border border-gray-200 rounded-lg transition"
              >
                Kosongkan Penapis
              </button>
            )}
          </div>

          {/* Athlete-first table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
            ) : (
              <>
                <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-sm text-[#888]">
                  <span>{filteredAthletes.length} atlet</span>
                </div>
                {filteredAthletes.length === 0 ? (
                  <div className="py-16 text-center text-[#888] text-sm">Tiada atlet sepadan penapis.</div>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['Atlet', 'Sukan', 'Rekod Terkini', 'Skor InBody', 'Jumlah Rekod', ''].map(h => (
                            <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAthletes.map(a => {
                          const latest = latestByAthlete.get(a.id) ?? null
                          const count = countByAthlete.get(a.id) ?? 0
                          const isExpanded = expandedAthleteId === a.id
                          const athleteRecords = records
                            .filter(r => r.athlete_id === a.id)
                            .sort((x, y) => y.recorded_date.localeCompare(x.recorded_date))
                          const badge = scoreBadge(latest?.inbody_score ?? null)

                          return (
                            <Fragment key={a.id}>
                              <tr
                                onClick={() => setExpandedAthleteId(isExpanded ? null : a.id)}
                                className={`border-b border-gray-50 cursor-pointer ${isExpanded ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                              >
                                <td className="px-4 py-3 font-medium text-[#111]">{a.name}</td>
                                <td className="px-4 py-3 text-[#888]">{a.sport?.name ?? '—'}</td>
                                <td className="px-4 py-3 font-mono text-[12px] text-[#444]">
                                  {latest ? fmtDate(latest.recorded_date) : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  {latest ? (
                                    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.style}`}>{badge.label}</span>
                                  ) : (
                                    <span className="text-[#888] text-xs">Tiada rekod</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[#888] text-xs">
                                  {count > 0 ? `${count} rekod` : '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-[#888] text-xs select-none">
                                  {isExpanded ? '▲' : '▼'}
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr key={`${a.id}-detail`}>
                                  <td colSpan={6} className="px-4 pb-4 pt-0 bg-orange-50/40">
                                    <div className="border border-orange-100 rounded-xl overflow-hidden">
                                      <div className="flex items-center justify-between px-4 py-2 bg-orange-50 border-b border-orange-100">
                                        <span className="text-xs font-semibold text-[#F56A00]">
                                          Rekod InBody — {a.name}
                                        </span>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={e => { e.stopPropagation(); setActiveTab('profil'); setProfilAthlete(a.id); setProfilSport(a.sport_id) }}
                                            className="text-xs font-semibold text-[#3A7EC8] border border-[#3A7EC8] hover:bg-blue-50 px-3 py-1 rounded-lg transition"
                                          >
                                            Lihat Profil
                                          </button>
                                          {can('inbody', 'create') && (
                                            <button
                                              onClick={e => { e.stopPropagation(); openAddForAthlete(a) }}
                                              className="text-xs font-semibold text-white bg-[#F56A00] hover:bg-[#D45A00] px-3 py-1 rounded-lg transition"
                                            >
                                              + Tambah Rekod
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {athleteRecords.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-[#888] text-xs">
                                          Tiada rekod InBody untuk atlet ini.
                                        </div>
                                      ) : (
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-orange-100">
                                              {['Tarikh', 'Berat (kg)', 'BMI', 'Lemak (%)', 'SMM (kg)', 'Skor InBody', 'Pelan Diet', 'Catatan', ''].map(h => (
                                                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-3 py-2">{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {athleteRecords.map(r => {
                                              const rb = scoreBadge(r.inbody_score)
                                              return (
                                                <tr key={r.id} className="border-b border-orange-50 last:border-0 hover:bg-orange-50">
                                                  <td className="px-3 py-2 font-mono text-[#444]">{fmtDate(r.recorded_date)}</td>
                                                  <td className="px-3 py-2 text-[#444]">{n(r.weight, ' kg')}</td>
                                                  <td className="px-3 py-2 text-[#444]">{n(r.bmi)}</td>
                                                  <td className="px-3 py-2 text-[#444]">{n(r.fat_pct, '%')}</td>
                                                  <td className="px-3 py-2 text-[#444]">{n(r.smm, ' kg')}</td>
                                                  <td className="px-3 py-2">
                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${rb.style}`}>{rb.label}</span>
                                                  </td>
                                                  <td className="px-3 py-2 text-center">
                                                    {r.diet_plan_url ? <span className="text-green-600 font-bold">✓</span> : <span className="text-[#888]">—</span>}
                                                  </td>
                                                  <td className="px-3 py-2 text-[#444] max-w-[160px]">
                                                    <span className="uppercase text-xs">{r.catatan || '—'}</span>
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    <div className="flex gap-3 justify-end">
                                                      {can('inbody', 'update') && (
                                                        <button
                                                          onClick={e => { e.stopPropagation(); openEdit(r) }}
                                                          className="text-[#F56A00] hover:underline font-medium"
                                                        >
                                                          Edit
                                                        </button>
                                                      )}
                                                      {can('inbody', 'delete') && (
                                                        <button
                                                          onClick={e => { e.stopPropagation(); setConfirmDelete(r) }}
                                                          className="text-[#D44040] hover:underline font-medium"
                                                        >
                                                          Padam
                                                        </button>
                                                      )}
                                                    </div>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[11px] text-[#888]">Halaman {currentPage} daripada {totalPages} ({filteredAthletes.length} atlet)</p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[11px] rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">← Sebelumnya</button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((page, idx, arr) => (
                            <span key={page} className="flex items-center">
                              {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-[#888] text-[11px]">…</span>}
                              <button onClick={() => setCurrentPage(page)} className={`w-7 h-7 text-[11px] rounded-lg ${currentPage === page ? 'bg-[#F56A00] text-white font-semibold' : 'text-[#444] border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
                            </span>
                          ))}
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[11px] rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Seterusnya →</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div ref={profilRef} className="space-y-5">
          {/* Sport and Athlete selectors */}
          <div className="flex gap-2">
            <select value={profilSport} onChange={e => { setProfilSport(e.target.value); setProfilAthlete('') }} className={filterCls} style={{ flex: 1 }}>
              <option value="">— Semua Sukan —</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={profilAthlete} onChange={e => setProfilAthlete(e.target.value)} className={filterCls} style={{ flex: 2 }}>
              <option value="">— Pilih Atlet —</option>
              {athletes.filter(a => !profilSport || a.sport_id === profilSport).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {profilLoading ? (
            <div className="text-sm text-[#888]">Memuatkan...</div>
          ) : !latestRecord ? (
            <div className="text-sm text-[#888]">Pilih atlet untuk melihat profil.</div>
          ) : (
            <>
              {/* 4 metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Berat Badan',      val: n(latestRecord.weight, ' kg'), color: 'text-[#111]' },
                  { label: 'Jisim Otot (SMM)', val: n(latestRecord.smm, ' kg'),   color: 'text-[#F56A00]' },
                  { label: 'BMI',              val: n(latestRecord.bmi),           color: 'text-[#3A7EC8]' },
                  { label: 'Lemak Badan',      val: n(latestRecord.fat_pct, '%'),  color: 'text-[#D44040]' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1">{label}</p>
                    <p className={`text-3xl font-bold font-mono ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Chart | Gauge+Norms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-4">Komposisi Badan (Trend)</p>
                  <div className="divide-y divide-gray-100">
                    {([
                      { key: 'weight',  label: 'Berat',         unit: ' kg', color: '#6366f1', val: latestRecord.weight },
                      { key: 'smm',     label: 'Jisim Otot',    unit: ' kg', color: '#F56A00', val: latestRecord.smm },
                      { key: 'fatMass', label: 'Lemak Badan',   unit: ' kg', color: '#D44040', val: latestRecord.body_fat_mass },
                      { key: 'bmi',     label: 'BMI',           unit: '',    color: '#3A7EC8', val: latestRecord.bmi },
                      { key: 'fatPct',  label: 'Lemak Badan %', unit: '%',   color: '#3A9E6A', val: latestRecord.fat_pct },
                    ] as { key: string; label: string; unit: string; color: string; val: number | null }[]).map(({ key, label, unit, color, val }) => (
                      <div key={key} className="flex items-center gap-3 py-2">
                        <div className="w-28 shrink-0">
                          <p className="text-[10px] font-semibold text-[#888] uppercase tracking-widest leading-tight">{label}</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color }}>{val != null ? `${Number(val).toFixed(1)}${unit}` : '—'}</p>
                        </div>
                        <div className="flex-1 h-14">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                              <XAxis dataKey="date" hide />
                              <YAxis domain={['auto', 'auto']} hide />
                              <Tooltip
                                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #eee', padding: '4px 8px' }}
                                formatter={(v: number) => [`${Number(v).toFixed(1)}${unit}`, label]}
                                labelStyle={{ fontSize: 10, color: '#888' }}
                              />
                              <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 2, fill: color }} activeDot={{ r: 4 }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                  <InBodyScoreGauge score={latestRecord.inbody_score ?? null} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-3">Piawaian SUKMA</p>
                    <div className="space-y-2">
                      {([
                        ['SMM',                sukmaSMM(latestRecord.smm),              n(latestRecord.smm, ' kg')],
                        ['Lemak Badan (kg)',   sukmaFatMass(latestRecord.body_fat_mass), n(latestRecord.body_fat_mass, ' kg')],
                        ['BMI',                sukmaBMI(latestRecord.bmi),              n(latestRecord.bmi)],
                        ['Lemak Badan %',      sukmaFat(latestRecord.fat_pct),          n(latestRecord.fat_pct, '%')],
                        ['Skor InBody',        sukmaScore(latestRecord.inbody_score ?? null), n(latestRecord.inbody_score, '', 0)],
                      ] as [string, NormResult, string][]).map(([metric, norm, val]) => (
                        <div key={metric} className="flex items-center justify-between">
                          <span className="text-sm text-[#444]">{formatLabel(metric)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-[#888]">{val}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${norm.style}`}>{norm.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest record detail */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-4">
                  Rekod Terkini — {new Date(latestRecord.recorded_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    ['Berat Badan',       n(latestRecord.weight, ' kg')],
                    ['Jisim Otot (SMM)',  n(latestRecord.smm, ' kg')],
                    ['Lemak Badan (kg)',  n(latestRecord.body_fat_mass, ' kg')],
                    ['BMI',               n(latestRecord.bmi)],
                    ['% Lemak',           n(latestRecord.fat_pct, '%')],
                    ['BMR',               n(latestRecord.bmr, ' kcal', 0)],
                    ['Skor InBody',       n(latestRecord.inbody_score, '', 0)],
                    ['Skor SUKMA',        latestSkor != null ? `${latestSkor}/5 — ${latestUlasan}` : '—'],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label} className="bg-[#F5F5F7] rounded-lg px-4 py-3">
                      <p className="text-[10px] text-[#888] mb-0.5 whitespace-nowrap">{formatLabel(label)}</p>
                      <p className="text-sm font-semibold text-[#111]">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diet Plan Section */}
              {latestRecord && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-4">Pelan Diet</p>
                  {dietPlanError && (
                    <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">{dietPlanError}</div>
                  )}
                  {latestRecord.diet_plan_url ? (
                    <div className="space-y-3">
                      <div className="bg-[#F5F5F7] rounded-lg px-4 py-3">
                        <p className="text-[12px] text-[#888] mb-1">Fail Dimuat Naik</p>
                        <p className="text-sm font-medium text-[#111] truncate">{latestRecord.diet_plan_name || 'Diet Plan File'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDietPlan(latestRecord.diet_plan_url!)}
                          className="flex-1 px-3 py-2 text-xs font-semibold text-[#3A7EC8] border border-[#3A7EC8] rounded-lg hover:bg-blue-50 transition text-center"
                        >
                          Lihat / Muat Turun
                        </button>
                        <button
                          onClick={() => { setViewRecord(latestRecord); fileInputRef.current?.click() }}
                          disabled={uploadingDietPlan}
                          className="flex-1 px-3 py-2 text-xs font-semibold text-[#F56A00] border border-[#F56A00] rounded-lg hover:bg-orange-50 disabled:opacity-60 transition"
                        >
                          {uploadingDietPlan ? 'Memuat...' : 'Ganti'}
                        </button>
                        <button
                          onClick={() => { setViewRecord(latestRecord); handleDeleteDietPlan() }}
                          disabled={uploadingDietPlan}
                          className="flex-1 px-3 py-2 text-xs font-semibold text-[#D44040] border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60 transition"
                        >
                          Buang
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setViewRecord(latestRecord); fileInputRef.current?.click() }}
                      disabled={uploadingDietPlan}
                      className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 rounded-lg transition"
                    >
                      {uploadingDietPlan ? 'Memuat Naik...' : '+ Muat Naik Pelan Diet'}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                    onChange={handleDietPlanUpload}
                    className="hidden"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg mx-4 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-[#111]">{editing ? 'Edit Rekod InBody' : 'Rekod InBody Baharu'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Sukan" required>
                    <select value={formSportFilter} onChange={e => { setFormSportFilter(e.target.value); setField('athlete_id', '') }} className={inputCls}>
                      <option value="">— Pilih sukan —</option>
                      {sports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Atlet" required>
                    <select value={form.athlete_id} onChange={e => setField('athlete_id', e.target.value)} className={inputCls}>
                      <option value="">— Pilih atlet —</option>
                      {athletes.filter(a => !formSportFilter || a.sport?.name === formSportFilter).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Tarikh" required>
                    <input type="date" value={form.recorded_date} onChange={e => setField('recorded_date', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <NumField label="Berat (kg)" val={form.weight} onChange={v => setField('weight', v)} />
                <NumField label="SMM — Jisim Otot Rangka (kg)" val={form.smm} onChange={v => setField('smm', v)} />
                <NumField label="Lemak Badan (kg)" val={form.body_fat_mass} onChange={v => setField('body_fat_mass', v)} />
                <NumField label="BMI" val={form.bmi} onChange={v => setField('bmi', v)} />
                <NumField label="Peratusan Lemak (%)" val={form.fat_pct} onChange={v => setField('fat_pct', v)} />
                <NumField label="BMR (kcal)" val={form.bmr} onChange={v => setField('bmr', v)} />
                <NumField label="Skor InBody" val={form.inbody_score} onChange={v => setField('inbody_score', v)} />
                {(form.smm != null || form.body_fat_mass != null || form.bmi != null || form.fat_pct != null || form.inbody_score != null) && (
                  <div className="col-span-2 flex items-center gap-3 px-4 py-3 bg-[#F5F5F7] rounded-lg">
                    <p className="text-[10px] text-[#888] font-semibold uppercase tracking-widest">Skor SUKMA (dikira):</p>
                    <span className="text-sm font-bold text-[#111]">{computeSkor(form)}/5</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      computeUlasan(computeSkor(form)) === 'BAIK' ? BADGE_GREEN :
                      computeUlasan(computeSkor(form)) === 'SEDERHANA' ? BADGE_ORANGE : BADGE_RED
                    }`}>{computeUlasan(computeSkor(form))}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <Field label="Catatan">
                    <textarea
                      value={form.catatan ?? ''}
                      onChange={e => setField('catatan', e.target.value.toUpperCase() || null)}
                      rows={3}
                      placeholder="CATATAN..."
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam rekod ini?</p>
            <p className="text-[13px] text-[#888] mb-6">{confirmDelete.athlete?.name} — {fmtDate(confirmDelete.recorded_date)}</p>
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

function NumField({ label, val, onChange }: { label: string; val: number | null; onChange: (v: number | null) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        step="0.1"
        value={val ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : +e.target.value)}
        className={inputCls}
        placeholder="—"
      />
    </Field>
  )
}

const formatLabel = (text: string) => {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim()
}
