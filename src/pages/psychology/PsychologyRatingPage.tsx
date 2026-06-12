import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { usePermissions } from '../../hooks/usePermissions'
import type { PhysioRating } from '../../types'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

export default function PsychologyRatingPage() {
  const { can } = usePermissions()

  const [ratings, setRatings] = useState<PhysioRating[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterPhase, setFilterPhase] = useState<'all' | 'persediaan' | 'pertandingan' | 'pemulihan'>('all')
  const [filterAthlete, setFilterAthlete] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadWarning, setUploadWarning] = useState('')
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const [selectedAthleteName, setSelectedAthleteName] = useState('')
  const [selectedAthleteSport, setSelectedAthleteSport] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchRatings()
  }, [])

  const fetchRatings = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error: err } = await supabase
        .from('psychology_ratings')
        .select('id, athlete_id, phase, assessment_date, cognitive_anxiety_score, somatic_anxiety_score, self_confidence_score, athlete:athletes(id, name, sport_id, sport:sport_id(name))')
        .order('assessment_date', { ascending: false })

      if (err) throw err
      setRatings((data as any) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ratings')
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

    // Group ratings by phase
    const phaseData: Record<string, any> = {
      Persediaan: null,
      Pertandingan: null,
      Pemulihan: null,
    }

    athleteRatings.forEach(r => {
      const phaseLabel = PHASE_LABEL[r.phase]
      if (!phaseData[phaseLabel] || new Date(r.assessment_date) > new Date(phaseData[phaseLabel].date)) {
        phaseData[phaseLabel] = {
          phase: phaseLabel,
          cognitive_anxiety: r.cognitive_anxiety_score,
          somatic_anxiety: r.somatic_anxiety_score,
          confidence: r.self_confidence_score,
          date: r.assessment_date,
        }
      }
    })

    const chartData = Object.values(phaseData).filter(Boolean)
    setComparisonData(chartData)
    setSelectedAthleteId(athleteId)
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

      if (missing.length > 0) {
        onMissing(missing)
      }

      if (duplicates.length > 0) {
        console.warn(`Skipped ${duplicates.length} duplicate entries: ${duplicates.join(', ')}`)
      }

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

      await fetchRatings()
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

  const filteredRatings = ratings.filter((r) => {
    const matchPhase = filterPhase === 'all' || r.phase === filterPhase
    const matchAthlete = !filterAthlete || r.athlete_id === filterAthlete
    const matchSport = !filterSport || r.athlete?.sport?.name === filterSport
    const matchSearch = !search || (r.athlete?.name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchPhase && matchAthlete && matchSport && matchSearch
  })

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

  return (
    <div className="space-y-4">

      {/* Header */}
      <p className="text-[12px] text-[#888]">{filteredRatings.length} rekod</p>

      {/* Stats Section */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Jumlah Penilaian</p>
            <p className="text-3xl font-bold text-[#111]">{filteredRatings.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Purata Kebimbangan Kognitif</p>
            <p className="text-3xl font-bold text-[#111]">
              {filteredRatings.length > 0
                ? (filteredRatings.reduce((sum, r) => sum + (r.cognitive_anxiety_score ?? 0), 0) / filteredRatings.length).toFixed(1)
                : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Purata Kepercayaan Diri</p>
            <p className="text-3xl font-bold text-[#111]">
              {filteredRatings.length > 0
                ? (filteredRatings.reduce((sum, r) => sum + (r.self_confidence_score ?? 0), 0) / filteredRatings.length).toFixed(1)
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

          {/* Filters */}
          <div className="space-y-3">
            {/* Search, Sport & Athlete Filters */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cari nama atlet..."
                value={search}
                onChange={(e) => setSearch(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#F56A00]"
              />
              <select
                value={filterSport}
                onChange={(e) => setFilterSport(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#F56A00]"
              >
                <option value="">Semua Sukan</option>
                {[...new Set(ratings.map(r => r.athlete?.sport?.name))].filter(Boolean).map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>

              <select
                value={filterAthlete}
                onChange={(e) => setFilterAthlete(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#F56A00]"
              >
                <option value="">Semua Atlet</option>
                {[...new Set(ratings.map(r => r.athlete_id))].map((athleteId) => {
                  const athlete = ratings.find(r => r.athlete_id === athleteId)?.athlete
                  return (
                    <option key={athleteId} value={athleteId}>
                      {athlete?.name}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Phase Filter */}
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
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredRatings.length === 0 ? (
              <div className="py-16 text-center text-[#888] text-sm">
                {ratings.length === 0 ? 'Tiada rekod penilaian lagi.' : 'Tiada rekod sepadan penapis.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Atlet', 'Sukan', 'Fasa', 'Kebimbangan Kognitif', 'Kebimbangan Somatik', 'Kepercayaan Diri', 'Tarikh'].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRatings.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-left">
                        <button
                          onClick={() => openComparison(r.athlete_id)}
                          className="text-[#F56A00] hover:underline cursor-pointer text-left"
                        >
                          {r.athlete?.name ?? '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#888]">{r.athlete?.sport?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {PHASE_LABEL[r.phase]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-semibold text-[#111]">{r.cognitive_anxiety_score}</div>
                        <div className={`text-[11px] font-medium ${getScoreInsight('cognitive', r.cognitive_anxiety_score).color}`}>
                          {getScoreInsight('cognitive', r.cognitive_anxiety_score).label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-semibold text-[#111]">{r.somatic_anxiety_score}</div>
                        <div className={`text-[11px] font-medium ${getScoreInsight('somatic', r.somatic_anxiety_score).color}`}>
                          {getScoreInsight('somatic', r.somatic_anxiety_score).label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-semibold text-[#111]">{r.self_confidence_score}</div>
                        <div className={`text-[11px] font-medium ${getScoreInsight('confidence', r.self_confidence_score).color}`}>
                          {getScoreInsight('confidence', r.self_confidence_score).label}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[#444] whitespace-nowrap">{r.assessment_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {selectedAthleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-[#111]">{selectedAthleteName}</h2>
                <p className="text-sm text-[#888] mt-1">{selectedAthleteSport}</p>
              </div>
              <button
                onClick={() => setSelectedAthleteId(null)}
                className="text-[#888] hover:text-[#111] text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {comparisonData.length === 0 ? (
                <div className="text-center text-[#888] py-8">
                  Tiada data untuk dibandingkan
                </div>
              ) : (
                <>
                  {/* Chart */}
                  {comparisonData.length > 0 && (() => {
                    const chartData = [
                      {
                        metric: 'Kebimbangan Kognitif',
                        Persediaan: comparisonData.find(d => d.phase === 'Persediaan')?.cognitive_anxiety ?? 0,
                        Pertandingan: comparisonData.find(d => d.phase === 'Pertandingan')?.cognitive_anxiety ?? 0,
                        Pemulihan: comparisonData.find(d => d.phase === 'Pemulihan')?.cognitive_anxiety ?? 0,
                      },
                      {
                        metric: 'Kebimbangan Somatik',
                        Persediaan: comparisonData.find(d => d.phase === 'Persediaan')?.somatic_anxiety ?? 0,
                        Pertandingan: comparisonData.find(d => d.phase === 'Pertandingan')?.somatic_anxiety ?? 0,
                        Pemulihan: comparisonData.find(d => d.phase === 'Pemulihan')?.somatic_anxiety ?? 0,
                      },
                      {
                        metric: 'Kepercayaan Diri',
                        Persediaan: comparisonData.find(d => d.phase === 'Persediaan')?.confidence ?? 0,
                        Pertandingan: comparisonData.find(d => d.phase === 'Pertandingan')?.confidence ?? 0,
                        Pemulihan: comparisonData.find(d => d.phase === 'Pemulihan')?.confidence ?? 0,
                      },
                    ]
                    return (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-semibold text-[#111] mb-4">Perbandingan Skor Merentasi Fasa</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="metric" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Persediaan" stackId="a" fill="#FF6B6B" name="Persediaan" />
                            <Bar dataKey="Pertandingan" stackId="a" fill="#FFA94D" name="Pertandingan" />
                            <Bar dataKey="Pemulihan" stackId="a" fill="#51CF66" name="Pemulihan" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  })()}

                  {/* Comparison Table */}
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
                              <span className="inline-block font-semibold text-[#111]">{data.cognitive_anxiety}</span>
                              <span className="text-[11px] text-[#888] ml-1">{data.cognitive_anxiety > 15 ? '(Tinggi)' : data.cognitive_anxiety > 10 ? '(Sederhana)' : '(Rendah)'}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block font-semibold text-[#111]">{data.somatic_anxiety}</span>
                              <span className="text-[11px] text-[#888] ml-1">{data.somatic_anxiety > 17 ? '(Tinggi)' : data.somatic_anxiety > 10 ? '(Sederhana)' : '(Rendah)'}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block font-semibold text-[#111]">{data.confidence}</span>
                              <span className="text-[11px] text-[#888] ml-1">{data.confidence >= 15 ? '(Tinggi)' : data.confidence >= 10 ? '(Sederhana)' : '(Rendah)'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Key Insights */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 Panduan Pembacaan</h3>
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
    </div>
  )
}
