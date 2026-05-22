import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { PhysioRating } from '../../types'
import Papa from 'papaparse'

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

const SCALE_LABEL = {
  'Sangat Tidak Bersetuju': 1,
  'Tidak Bersetuju': 2,
  'Neutral': 3,
  'Bersetuju': 4,
  'Sangat Bersetuju': 5,
}

export default function PsychologyRatingPage() {
  const [ratings, setRatings] = useState<PhysioRating[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterPhase, setFilterPhase] = useState<'all' | 'persediaan' | 'pertandingan' | 'pemulihan'>('all')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchRatings()
  }, [])

  const fetchRatings = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error: err } = await supabase
        .from('physio_ratings')
        .select('*, athlete:athletes(id, name, sport)')
        .order('assessment_date', { ascending: false })

      if (err) throw err
      setRatings(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ratings')
    } finally {
      setLoading(false)
    }
  }

  const calculateScores = (responses: Record<string, number>) => {
    const cognitive = QUESTION_MAPPING.cognitive_anxiety.reduce((sum, q) => sum + (responses[`q${q}`] || 0), 0)
    const somatic = QUESTION_MAPPING.somatic_anxiety.reduce((sum, q) => sum + (responses[`q${q}`] || 0), 0)

    let self_conf = 0
    for (const q of QUESTION_MAPPING.self_confidence) {
      if (q === 3) {
        self_conf += 6 - (responses[`q${q}`] || 0)
      } else {
        self_conf += responses[`q${q}`] || 0
      }
    }

    return { cognitive, somatic, self_conf }
  }

  const parseCSV = (file: File) => {
    return new Promise<ParsedAssessment[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const parsed: ParsedAssessment[] = []

            for (const row of results.data as CSVRow[]) {
              const athleteName = row['Nama Atlet'] || ''
              const phase = row['Fasa'] ? row['Fasa'].toLowerCase().replace(/\s+/g, '') : ''

              if (!athleteName || !phase) continue

              const validPhase = ['persediaan', 'pertandingan', 'pemulihan'].includes(phase)
                ? (phase as 'persediaan' | 'pertandingan' | 'pemulihan')
                : null

              if (!validPhase) {
                console.warn(`Skipping row with invalid phase: ${phase}`)
                continue
              }

              try {
                const { data: athleteData } = await supabase
                  .from('athletes')
                  .select('id')
                  .ilike('name', athleteName)
                  .single()

                if (!athleteData) {
                  console.warn(`Athlete not found: ${athleteName}`)
                  continue
                }

                const responses: Record<string, number> = {}
                for (let i = 1; i <= 17; i++) {
                  const colName = `[Soalan ${i}]`
                  const answer = row[colName] || ''
                  responses[`q${i}`] = SCALE_LABEL[answer as keyof typeof SCALE_LABEL] || 0
                }

                const { cognitive, somatic, self_conf } = calculateScores(responses)

                parsed.push({
                  athlete_id: athleteData.id,
                  athlete_name: athleteName,
                  phase: validPhase,
                  responses,
                  cognitive_anxiety_score: cognitive,
                  somatic_anxiety_score: somatic,
                  self_confidence_score: self_conf,
                })
              } catch (err) {
                console.error(`Error processing athlete ${athleteName}:`, err)
              }
            }

            resolve(parsed)
          } catch (err) {
            reject(err)
          }
        },
        error: (error) => reject(error),
      })
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setUploadError('')

      const assessments = await parseCSV(file)

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

      const { error: insertErr } = await supabase.from('physio_ratings').insert(insertData)

      if (insertErr) throw insertErr

      await fetchRatings()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload CSV')
    } finally {
      setUploading(false)
    }
  }

  const filteredRatings = ratings.filter(
    (r) => filterPhase === 'all' || r.phase === filterPhase
  )

  const getScoreInsight = (type: 'cognitive' | 'somatic' | 'confidence', score: number | null) => {
    if (score === null) return { label: '-', color: '' }

    const ranges = {
      cognitive: [
        { min: 0, max: 9, label: 'Sangat Rendah', color: 'text-red-600' },
        { min: 10, max: 14, label: 'Rendah', color: 'text-orange-600' },
        { min: 15, max: 19, label: 'Sederhana', color: 'text-yellow-600' },
        { min: 20, max: 24, label: 'Tinggi', color: 'text-blue-600' },
        { min: 25, max: 25, label: 'Sangat Tinggi', color: 'text-red-600' },
      ],
      somatic: [
        { min: 0, max: 12, label: 'Sangat Rendah', color: 'text-red-600' },
        { min: 13, max: 18, label: 'Rendah', color: 'text-orange-600' },
        { min: 19, max: 24, label: 'Sederhana', color: 'text-yellow-600' },
        { min: 25, max: 30, label: 'Tinggi', color: 'text-blue-600' },
        { min: 31, max: 35, label: 'Sangat Tinggi', color: 'text-red-600' },
      ],
      confidence: [
        { min: 0, max: 9, label: 'Sangat Rendah', color: 'text-red-600' },
        { min: 10, max: 14, label: 'Rendah', color: 'text-orange-600' },
        { min: 15, max: 19, label: 'Sederhana', color: 'text-yellow-600' },
        { min: 20, max: 24, label: 'Tinggi', color: 'text-green-600' },
        { min: 25, max: 25, label: 'Sangat Tinggi', color: 'text-green-600' },
      ],
    }

    const range = ranges[type].find((r) => score >= r.min && score <= r.max)
    return range ? { label: range.label, color: range.color } : { label: '-', color: '' }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{filteredRatings.length} rekod</p>
        <button onClick={fetchRatings} disabled={loading} className="bg-gray-200 hover:bg-gray-300 text-[#111] text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">
          {loading ? 'Memuatkan...' : '+ Impor CSV'}
        </button>
      </div>

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
          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
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
          {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}

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
                    {['Atlet', 'Sukan', 'Fasa', 'Kebimbangan Kognitif', 'Kebimbangan Somatis', 'Kepercayaan Diri', 'Tarikh'].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRatings.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#111]">{r.athlete?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-[#888]">{r.athlete?.sport ?? '—'}</td>
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
    </div>
  )
}
