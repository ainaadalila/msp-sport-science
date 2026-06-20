import { useState, useRef, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '../../lib/supabase'
import { usePermissions } from '../../hooks/usePermissions'
import { useSports } from '../../hooks/useSports'
import type { PhysioRating } from '../../types'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface CSVRow {
  [key: string]: string
}

interface ParsedAssessment {
  athlete_id: string
  athlete_name: string
  phase: 'persediaan' | 'pertandingan' | 'pemulihan'
  responses: Record<string, number>
  cognitive_anxiety_score: number
  somatic_anxiety_score: number
  self_confidence_score: number
}

interface AthleteBasic {
  id: string
  name: string
  ic_number: string
  sport_id: string
  status: string
  sport?: { name: string }
}

const QUESTION_MAPPING = {
  cognitive_anxiety: [1, 6, 8, 11, 15],
  somatic_anxiety: [2, 5, 7, 10, 12, 14, 17],
  self_confidence: [3, 4, 9, 13, 16],
}

const PHASE_LABEL: Record<string, string> = {
  persediaan: 'Persediaan',
  pertandingan: 'Pertandingan',
  pemulihan: 'Pemulihan',
}

const PHASE_COLOR: Record<string, string> = {
  persediaan: 'bg-blue-100 text-blue-700',
  pertandingan: 'bg-orange-100 text-orange-700',
  pemulihan: 'bg-green-100 text-green-700',
}


export default function PsychologyRatingPage() {
  const { can } = usePermissions()
  const { sports } = useSports()

  const ATHLETES_PER_PAGE = 25
  const [ratings, setRatings] = useState<PhysioRating[]>([])
  const [athletes, setAthletes] = useState<AthleteBasic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [filterPhase, setFilterPhase] = useState<'all' | 'persediaan' | 'pertandingan' | 'pemulihan'>('all')
  const [filterSport, setFilterSport] = useState('')
  const [search, setSearch] = useState('')
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadWarning, setUploadWarning] = useState('')

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const [selectedAthleteName, setSelectedAthleteName] = useState('')
  const [selectedAthleteSport, setSelectedAthleteSport] = useState('')
  const [editingCatatan, setEditingCatatan] = useState<{ id: string; text: string } | null>(null)
  const [savingCatatan, setSavingCatatan] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  async function handlePrint() {
    if (!chartRef.current) return
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true
      })
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * contentWidth) / canvas.width

      let yPos = margin

      pdf.setFontSize(16)
      pdf.text('Penilaian Psikologi', margin, yPos)
      yPos += 8

      pdf.setFontSize(11)
      pdf.setTextColor(100)
      pdf.text(`Laporan ${new Date().toLocaleDateString('ms-MY')}`, margin, yPos)
      yPos += 15
      pdf.setTextColor(0)

      if (yPos + imgHeight > pageHeight - margin) {
        pdf.addPage()
        yPos = margin
      }

      pdf.addImage(imgData, 'PNG', margin, yPos, contentWidth, imgHeight)
      pdf.save(`Penilaian_Psikologi_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (error) {
      console.error('Export PDF failed:', error)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Reset expanded row and page when filters change
  useEffect(() => {
    setExpandedAthleteId(null)
    setCurrentPage(1)
  }, [search, filterSport, filterPhase])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError('')
      const [ratingsRes, athletesRes] = await Promise.all([
        supabase
          .from('psychology_ratings')
          .select('id, athlete_id, phase, assessment_date, cognitive_anxiety_score, somatic_anxiety_score, self_confidence_score, catatan, athlete:athletes(id, name, sport_id, sport:sport_id(name))')
          .order('assessment_date', { ascending: false }).limit(5000),
        supabase
          .from('athletes')
          .select('id, name, ic_number, sport_id, status, sport:sport_id(name)')
          .order('name').limit(5000),
      ])
      if (ratingsRes.error) throw ratingsRes.error
      setRatings((ratingsRes.data as any) || [])
      setAthletes((athletesRes.data as any) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const openComparison = (athleteId: string) => {
    const athleteRatings = ratings.filter(r => r.athlete_id === athleteId)
    if (athleteRatings.length === 0) return

    const athlete = athleteRatings[0].athlete
    setSelectedAthleteName(athlete?.name ?? 'Unknown')
    setSelectedAthleteSport(athlete?.sport?.name ?? 'Unknown')

    const phaseData: Record<string, any> = {
      Persediaan: null,
      Pertandingan: null,
      Pemulihan: null,
    }

    athleteRatings.forEach(r => {
      const phaseKey = PHASE_LABEL[r.phase]
      if (!phaseData[phaseKey] || new Date(r.assessment_date) > new Date(phaseData[phaseKey].date)) {
        phaseData[phaseKey] = {
          phase: phaseKey,
          cognitive_anxiety: r.cognitive_anxiety_score,
          somatic_anxiety: r.somatic_anxiety_score,
          confidence: r.self_confidence_score,
          date: r.assessment_date,
        }
      }
    })

    setComparisonData(Object.values(phaseData).filter(Boolean))
    setSelectedAthleteId(athleteId)
  }

  const saveCatatan = async () => {
    if (!editingCatatan) return
    try {
      setSavingCatatan(true)
      const { error } = await supabase
        .from('psychology_ratings')
        .update({ catatan: editingCatatan.text || null })
        .eq('id', editingCatatan.id)

      if (error) throw error
      setEditingCatatan(null)
      fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save catatan')
    } finally {
      setSavingCatatan(false)
    }
  }

  const calculateScores = (responses: Record<string, number>) => {
    const cognitive = QUESTION_MAPPING.cognitive_anxiety.reduce((sum, q) => sum + (responses[`q${q}`] || 0), 0)
    const somatic = QUESTION_MAPPING.somatic_anxiety.reduce((sum, q) => sum + (responses[`q${q}`] || 0), 0)

    let self_conf = 0
    for (const q of QUESTION_MAPPING.self_confidence) {
      if (q === 3) {
        self_conf += 5 - (responses[`q${q}`] || 0)
      } else {
        self_conf += responses[`q${q}`] || 0
      }
    }

    return { cognitive, somatic, self_conf }
  }

  const parseFile = (file: File, onMissing: (athletes: string[]) => void) => {
    return new Promise<ParsedAssessment[]>((resolve, reject) => {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

      if (isExcel) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const data = e.target?.result
            const workbook = XLSX.read(data, { type: 'array' })
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(worksheet) as CSVRow[]
            await processRows(rows, resolve, reject, onMissing)
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(file)
      } else {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            await processRows(results.data as CSVRow[], resolve, reject, onMissing)
          },
          error: (error) => reject(error),
        })
      }
    })
  }

  const processRows = async (
    rows: CSVRow[],
    resolve: (value: ParsedAssessment[]) => void,
    reject: (reason?: unknown) => void,
    onMissing: (athletes: string[]) => void
  ) => {
    try {
      const parsed: ParsedAssessment[] = []
      const duplicates: string[] = []
      const missing: string[] = []

      for (const row of rows) {
        const athleteName = row['NAMA ATLET'] || row['Nama Atlet'] || ''
        const faseRaw = row['FASA'] || row['Fasa'] || ''
        const phase = faseRaw
          .toLowerCase()
          .replace(/fasa\s+/i, '')
          .replace(/\s+/g, '') as 'persediaan' | 'pertandingan' | 'pemulihan'

        if (!athleteName || !['persediaan', 'pertandingan', 'pemulihan'].includes(phase)) {
          continue
        }

        try {
          let icNumber = String(row['NO. KAD PENGENALAN'] || '').trim()

          if (!icNumber) {
            console.warn(`Missing IC number for athlete: ${athleteName}`)
            continue
          }

          if (!icNumber.startsWith('0') && icNumber.length === 11) {
            icNumber = '0' + icNumber
          }

          const icWithDashes = icNumber.length === 12 && !icNumber.includes('-')
            ? `${icNumber.substring(0, 6)}-${icNumber.substring(6, 8)}-${icNumber.substring(8)}`
            : icNumber

          let { data: athleteData } = await supabase
            .from('athletes')
            .select('id')
            .eq('ic_number', icWithDashes)
            .single()

          if (!athleteData) {
            missing.push(`${athleteName} (IC: ${icNumber})`)
            continue
          }

          const { data: existingRecord } = await supabase
            .from('psychology_ratings')
            .select('id')
            .eq('athlete_id', athleteData.id)
            .eq('phase', phase)
            .single()

          if (existingRecord) {
            duplicates.push(`${athleteName} - ${PHASE_LABEL[phase]}`)
            continue
          }

          const responses: Record<string, number> = {}

          const questionMappings = [
            '1. Saya rasa bimbang tentang pertandingan',
            '2. Saya rasa gementar',
            '3. Saya rasa tenang (R)',
            '4. Saya mempunyai keyakinan terhadap diri sendiri',
            '5. Saya rasa gelisah',
            '6. Saya bimbang jika tidak dapat lakukan yang terbaik',
            '7. Badan saya terasa tegang',
            '8. Saya rasa ragu-ragu tentang kemampuan saya',
            '9. Saya rasa yakin pada diri sendiri',
            '10. Perut saya terasa tidak selese',
            '11. Saya rasa takut jika saya akan tewas',
            '12. Jantung saya berdegup kencang',
            '13. Saya rasa mampu menangani tekanan pertandingan ini',
            '14. Tangan saya berpeluh',
            '15. Saya bimbang saya akan mengecewakan orang lain',
            '16. Saya rasa bersemangat untuk bertanding',
            '17. Saya rasa otot-otot saya menggeletar',
          ]

          for (let i = 1; i <= 17; i++) {
            const colName = questionMappings[i - 1]
            const answer = row[colName] || ''
            responses[`q${i}`] = parseInt(String(answer), 10) || 0
          }

          const { cognitive, somatic, self_conf } = calculateScores(responses)

          parsed.push({
            athlete_id: athleteData.id,
            athlete_name: athleteName,
            phase,
            responses,
            cognitive_anxiety_score: cognitive,
            somatic_anxiety_score: somatic,
            self_confidence_score: self_conf,
          })
        } catch (err) {
          console.error(`Error processing athlete ${athleteName}:`, err)
        }
      }

      if (missing.length > 0) onMissing(missing)
      if (duplicates.length > 0) console.warn(`Skipped ${duplicates.length} duplicate entries: ${duplicates.join(', ')}`)

      resolve(parsed)
    } catch (err) {
      reject(err)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setUploadError('')
      setUploadWarning('')

      const assessments = await parseFile(file, (missingAthletes) => {
        setUploadWarning(`⚠ ${missingAthletes.length} atlet tidak dijumpai dalam sistem:\n${missingAthletes.join('\n')}`)
      })

      if (assessments.length === 0) {
        setUploadError('No valid data found in CSV')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      const insertData = assessments.map((a) => ({
        athlete_id: a.athlete_id,
        phase: a.phase,
        cognitive_anxiety_score: a.cognitive_anxiety_score,
        somatic_anxiety_score: a.somatic_anxiety_score,
        self_confidence_score: a.self_confidence_score,
        raw_responses: a.responses,
        assessment_date: new Date().toISOString().split('T')[0],
        recorded_by: user?.id,
      }))

      if (insertData.length === 0) {
        setUploadError('Tiada data baru untuk disimpan (semua adalah duplikat)')
        setUploadSuccess('')
        return
      }

      const { error: insertErr } = await supabase.from('psychology_ratings').insert(insertData)
      if (insertErr) throw insertErr

      await fetchAll()
      if (fileInputRef.current) fileInputRef.current.value = ''
      setUploadError('')
      setUploadSuccess(`✓ ${insertData.length} rekod telah disimpan`)
      setTimeout(() => setUploadSuccess(''), 5000)
    } catch (err) {
      setUploadSuccess('')
      setUploadWarning('')
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const getScoreInsight = (type: 'cognitive' | 'somatic' | 'confidence', score: number | null) => {
    if (score === null) return { label: '-', color: '' }

    const ranges = {
      cognitive: [
        { min: 0, max: 7, label: 'Sangat Rendah', color: 'text-red-600' },
        { min: 8, max: 11, label: 'Rendah', color: 'text-orange-600' },
        { min: 12, max: 15, label: 'Sederhana', color: 'text-yellow-600' },
        { min: 16, max: 19, label: 'Tinggi', color: 'text-blue-600' },
        { min: 20, max: 20, label: 'Sangat Tinggi', color: 'text-red-600' },
      ],
      somatic: [
        { min: 0, max: 10, label: 'Sangat Rendah', color: 'text-red-600' },
        { min: 11, max: 15, label: 'Rendah', color: 'text-orange-600' },
        { min: 16, max: 20, label: 'Sederhana', color: 'text-yellow-600' },
        { min: 21, max: 25, label: 'Tinggi', color: 'text-blue-600' },
        { min: 26, max: 28, label: 'Sangat Tinggi', color: 'text-red-600' },
      ],
      confidence: [
        { min: 0, max: 7, label: 'Sangat Rendah', color: 'text-red-600' },
        { min: 8, max: 11, label: 'Rendah', color: 'text-orange-600' },
        { min: 12, max: 15, label: 'Sederhana', color: 'text-yellow-600' },
        { min: 16, max: 19, label: 'Tinggi', color: 'text-green-600' },
        { min: 20, max: 20, label: 'Sangat Tinggi', color: 'text-green-600' },
      ],
    }

    const range = ranges[type].find((r) => score >= r.min && score <= r.max)
    return range ? { label: range.label, color: range.color } : { label: '-', color: '' }
  }

  // Group ratings by athlete
  const ratingsByAthlete = useMemo(() => {
    const map = new Map<string, PhysioRating[]>()
    for (const r of ratings) {
      if (!map.has(r.athlete_id)) map.set(r.athlete_id, [])
      map.get(r.athlete_id)!.push(r)
    }
    return map
  }, [ratings])

  // Filter athletes using AthletesPage-style filters + phase filter
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      const q = search.toLowerCase()
      const sportName = a.sport?.name?.toLowerCase() || ''
      const matchSearch = !q || a.name.toLowerCase().includes(q) || (a.ic_number || '').toLowerCase().includes(q) || sportName.includes(q)
      const matchSport = !filterSport || a.sport_id === filterSport
      // When a specific phase is selected, only show athletes who have that phase assessed
      const matchPhase = filterPhase === 'all' || (ratingsByAthlete.get(a.id) ?? []).some(r => r.phase === filterPhase)
      return matchSearch && matchSport && matchPhase
    })
  }, [athletes, search, filterSport, filterPhase, ratingsByAthlete])

  const totalPages = Math.ceil(filteredAthletes.length / ATHLETES_PER_PAGE)
  const pagedAthletes = filteredAthletes.slice((currentPage - 1) * ATHLETES_PER_PAGE, currentPage * ATHLETES_PER_PAGE)

  // Stats based on filtered athletes' ratings + phase filter
  const relevantRatings = useMemo(() => {
    const filteredIds = new Set(filteredAthletes.map(a => a.id))
    return ratings.filter(r =>
      filteredIds.has(r.athlete_id) &&
      (filterPhase === 'all' || r.phase === filterPhase)
    )
  }, [ratings, filteredAthletes, filterPhase])

  return (
    <div className="space-y-4" ref={chartRef}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{athletes.length} atlet • {ratings.length} rekod penilaian</p>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[#F56A00] text-white text-sm font-semibold rounded-lg hover:bg-[#D45A00] transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M9 12h6m-6 4h6M9 8h.01M15 8h.01M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z"/>
          </svg>
          Cetak
        </button>
      </div>

      {/* Stats Section */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Jumlah Penilaian</p>
            <p className="text-3xl font-bold text-[#111]">{relevantRatings.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Purata Kebimbangan Kognitif</p>
            <p className="text-3xl font-bold text-[#111]">
              {relevantRatings.length > 0
                ? (relevantRatings.reduce((sum, r) => sum + (r.cognitive_anxiety_score ?? 0), 0) / relevantRatings.length).toFixed(1)
                : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Purata Kepercayaan Diri</p>
            <p className="text-3xl font-bold text-[#111]">
              {relevantRatings.length > 0
                ? (relevantRatings.reduce((sum, r) => sum + (r.self_confidence_score ?? 0), 0) / relevantRatings.length).toFixed(1)
                : '—'}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
      ) : (
        <div className="space-y-3">

          {/* Upload Section */}
          {can('psychology', 'create') && (
            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
              >
                {uploading ? 'Memproses...' : 'Pilih File'}
              </button>
            </div>
          )}
          {uploadError && <p className="text-red-600 text-sm whitespace-pre-wrap">{uploadError}</p>}
          {uploadWarning && <p className="text-amber-600 text-sm whitespace-pre-wrap">{uploadWarning}</p>}
          {uploadSuccess && <p className="text-green-600 text-sm">{uploadSuccess}</p>}

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

          {/* Phase Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'persediaan', 'pertandingan', 'pemulihan'] as const).map((phase) => (
              <button
                key={phase}
                onClick={() => setFilterPhase(phase)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                  filterPhase === phase
                    ? 'bg-[#F56A00] text-white'
                    : 'bg-gray-100 text-[#666] hover:bg-gray-200'
                }`}
              >
                {phase === 'all' ? 'Semua Fasa' : PHASE_LABEL[phase]}
              </button>
            ))}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Athlete-first table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-sm text-[#888]">
              <span>{filteredAthletes.length} atlet</span>
            </div>
            {filteredAthletes.length === 0 ? (
              <div className="py-16 text-center text-[#888] text-sm">Tiada atlet sepadan penapis.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Atlet', 'Sukan', 'Fasa Dinilai', 'Tarikh Terkini', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedAthletes.map(a => {
                    const athleteRatings = ratingsByAthlete.get(a.id) ?? []
                    const visibleRatings = filterPhase === 'all'
                      ? athleteRatings
                      : athleteRatings.filter(r => r.phase === filterPhase)
                    const assessedPhases = new Set(athleteRatings.map(r => r.phase))
                    const latestDate = athleteRatings.length > 0
                      ? athleteRatings.sort((x, y) => y.assessment_date.localeCompare(x.assessment_date))[0].assessment_date
                      : null
                    const isExpanded = expandedAthleteId === a.id

                    return (
                      <Fragment key={a.id}>
                        <tr
                          onClick={() => setExpandedAthleteId(isExpanded ? null : a.id)}
                          className={`border-b border-gray-50 cursor-pointer ${isExpanded ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3 font-medium text-[#111]">{a.name}</td>
                          <td className="px-4 py-3 text-[#888]">{a.sport?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            {assessedPhases.size === 0 ? (
                              <span className="text-[#888] text-xs">Tiada penilaian</span>
                            ) : (
                              <div className="flex gap-1 flex-wrap">
                                {(['persediaan', 'pertandingan', 'pemulihan'] as const).map(ph => (
                                  assessedPhases.has(ph) && (
                                    <span key={ph} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PHASE_COLOR[ph]}`}>
                                      {PHASE_LABEL[ph]}
                                    </span>
                                  )
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[12px] text-[#444]">
                            {latestDate ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-[#888] text-xs select-none">
                            {isExpanded ? '▲' : '▼'}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${a.id}-detail`}>
                            <td colSpan={5} className="px-4 pb-4 pt-0 bg-orange-50/40">
                              <div className="border border-orange-100 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2 bg-orange-50 border-b border-orange-100">
                                  <span className="text-xs font-semibold text-[#F56A00]">
                                    Penilaian Psikologi — {a.name}
                                  </span>
                                  {athleteRatings.length > 0 && (
                                    <button
                                      onClick={e => { e.stopPropagation(); openComparison(a.id) }}
                                      className="text-xs font-semibold text-[#3A7EC8] border border-[#3A7EC8] hover:bg-blue-50 px-3 py-1 rounded-lg transition"
                                    >
                                      Lihat Graf
                                    </button>
                                  )}
                                </div>
                                {visibleRatings.length === 0 ? (
                                  <div className="px-4 py-6 text-center text-[#888] text-xs">
                                    {athleteRatings.length === 0
                                      ? 'Tiada penilaian psikologi untuk atlet ini.'
                                      : `Tiada penilaian untuk fasa ${PHASE_LABEL[filterPhase]}.`}
                                  </div>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-orange-100">
                                        {['Fasa', 'Tarikh', 'Keb. Kognitif', 'Keb. Somatik', 'Keyakinan Diri', 'Catatan'].map(h => (
                                          <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-3 py-2">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {visibleRatings.map(r => (
                                        <tr key={r.id} className="border-b border-orange-50 last:border-0 hover:bg-orange-50">
                                          <td className="px-3 py-2">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PHASE_COLOR[r.phase]}`}>
                                              {PHASE_LABEL[r.phase]}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 font-mono text-[#444]">{r.assessment_date}</td>
                                          <td className="px-3 py-2">
                                            <div className="font-semibold text-[#111]">{r.cognitive_anxiety_score}</div>
                                            <div className={`text-[10px] ${getScoreInsight('cognitive', r.cognitive_anxiety_score).color}`}>
                                              {getScoreInsight('cognitive', r.cognitive_anxiety_score).label}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="font-semibold text-[#111]">{r.somatic_anxiety_score}</div>
                                            <div className={`text-[10px] ${getScoreInsight('somatic', r.somatic_anxiety_score).color}`}>
                                              {getScoreInsight('somatic', r.somatic_anxiety_score).label}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="font-semibold text-[#111]">{r.self_confidence_score}</div>
                                            <div className={`text-[10px] ${getScoreInsight('confidence', r.self_confidence_score).color}`}>
                                              {getScoreInsight('confidence', r.self_confidence_score).label}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[#666] max-w-xs truncate text-[10px]">{r.catatan || '—'}</span>
                                              {can('psychology', 'update') && (
                                                <button
                                                  onClick={() => setEditingCatatan({ id: r.id, text: r.catatan || '' })}
                                                  className="text-[#F56A00] hover:underline text-[10px] font-semibold whitespace-nowrap"
                                                >
                                                  Edit
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
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
            )}
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
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {selectedAthleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-[#111]">{selectedAthleteName}</h2>
                <p className="text-sm text-[#888] mt-1">{selectedAthleteSport}</p>
              </div>
              <button onClick={() => setSelectedAthleteId(null)} className="text-[#888] hover:text-[#111] text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-6">
              {comparisonData.length === 0 ? (
                <div className="text-center text-[#888] py-8">Tiada data untuk dibandingkan</div>
              ) : (
                <>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-[#111] mb-4">Perbandingan Skor Merentasi Fasa</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="phase" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="cognitive_anxiety" fill="#FF6B6B" name="Kebimbangan Kognitif" />
                        <Bar dataKey="somatic_anxiety" fill="#FFA94D" name="Kebimbangan Somatik" />
                        <Bar dataKey="confidence" fill="#51CF66" name="Kepercayaan Diri" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#111] mb-3">Jadual Perbandingan</h3>
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-[#888]">Fasa</th>
                          <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase text-[#888]">Kebimbangan Kognitif</th>
                          <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase text-[#888]">Kebimbangan Somatik</th>
                          <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase text-[#888]">Kepercayaan Diri</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((data, idx) => (
                          <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-[#111]">{data.phase}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold text-[#111]">{data.cognitive_anxiety}</span>
                              <span className="text-[11px] text-[#888] ml-1">{data.cognitive_anxiety > 15 ? '(Tinggi)' : data.cognitive_anxiety > 10 ? '(Sederhana)' : '(Rendah)'}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold text-[#111]">{data.somatic_anxiety}</span>
                              <span className="text-[11px] text-[#888] ml-1">{data.somatic_anxiety > 17 ? '(Tinggi)' : data.somatic_anxiety > 10 ? '(Sederhana)' : '(Rendah)'}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold text-[#111]">{data.confidence}</span>
                              <span className="text-[11px] text-[#888] ml-1">{data.confidence >= 15 ? '(Tinggi)' : data.confidence >= 10 ? '(Sederhana)' : '(Rendah)'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Panduan Pembacaan</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Kebimbangan Kognitif:</strong> Kerisauan fikiran tentang prestasi (skor tinggi = lebih risau)</li>
                      <li>• <strong>Kebimbangan Somatik:</strong> Kegelisahan fizikal seperti jantung berdegup (skor tinggi = lebih gelisah)</li>
                      <li>• <strong>Kepercayaan Diri:</strong> Keyakinan diri dan kemampuan (skor tinggi = lebih yakin)</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Catatan Edit Modal */}
      {editingCatatan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#111]">Edit Catatan</h2>
              <button onClick={() => setEditingCatatan(null)} className="text-[#888] hover:text-[#111] text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={editingCatatan.text}
                onChange={(e) => setEditingCatatan({ ...editingCatatan, text: e.target.value })}
                placeholder="Masukkan catatan..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#F56A00] resize-none"
                rows={5}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingCatatan(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  onClick={saveCatatan}
                  disabled={savingCatatan}
                  className="px-4 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {savingCatatan ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const filterCls = 'bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444] outline-none focus:border-[#F56A00]'
