import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { logAction } from '../../../lib/audit'
import type { Athlete, FitnessTestSession, SportFitnessTest, FitnessTestNorm } from '../../../types'

interface TestResultInput {
  test_id: string
  result_value: number | ''
  notes?: string
  test_name?: string
}

interface SessionResult {
  id: string
  test_id: string
  test_name: string
  unit: string
  result_value: number
  rating: 'baik' | 'sederhana' | 'lemah' | 'tidak_dinilai'
  notes: string | null
}

interface SessionWithResults {
  session: FitnessTestSession
  results: SessionResult[]
}

export default function FitnessTestingPage() {
  const { profile } = useAuth()
  const canRecord = profile?.role === 'superadmin' || profile?.role === 'admin' || profile?.role === 'coach'

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [sportTests, setSportTests] = useState<SportFitnessTest[]>([])
  const [norms, setNorms] = useState<Map<string, FitnessTestNorm>>(new Map())
  const [sessions, setSessions] = useState<FitnessTestSession[]>([])

  const getAthleteGender = (icNumber: string) => {
    const genderDigit = parseInt(icNumber.charAt(11))
    return genderDigit % 2 === 1 ? 'M' : 'F'
  }

  const [session, setSession] = useState<'Fasa 1' | 'Fasa 2' | 'Fasa 3' | 'Fasa 4'>('Fasa 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [results, setResults] = useState<TestResultInput[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSport, setFilterSport] = useState('')
  const [filterName, setFilterName] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const [viewMode, setViewMode] = useState<'select_athlete' | 'view_dashboard' | 'record_tests' | 'view_results' | 'view_history'>('select_athlete')
  const [viewedSession, setViewedSession] = useState<SessionWithResults | null>(null)
  const [sessionsWithResults, setSessionsWithResults] = useState<SessionWithResults[]>([])
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  useEffect(() => {
    if (!canRecord) return
    fetchAthletes()
  }, [canRecord])

  async function fetchAthletes() {
    setLoading(true)
    const res = await supabase.from('athletes').select('*, ic_number').order('name')
    setAthletes(res.data ?? [])
    setLoading(false)
  }

  async function selectAthlete(athlete: Athlete) {
    setSelectedAthlete(athlete)
    setResults([])
    setError(null)

    // Extract gender from ic_number (12th digit: odd=M, even=F)
    const gender = getAthleteGender(athlete.ic_number)

    // Fetch sport tests for this athlete's sport
    const testsRes = await supabase
      .from('sport_fitness_tests')
      .select('*, test:test_id(test_name, unit, category)')
      .eq('sport', athlete.sport)

    const sportTestsData = (testsRes.data ?? []) as SportFitnessTest[]
    setSportTests(sportTestsData)

    // Initialize expanded categories
    const categories = [...new Set(sportTestsData.map(st => (st.test as any)?.category))].filter(Boolean)
    const expandedState: Record<string, boolean> = {}
    categories.forEach(cat => {
      expandedState[cat] = true
    })
    setExpandedCategories(expandedState)

    // Fetch norms separately
    if (sportTestsData.length > 0) {
      const testIds = sportTestsData.map(st => st.test_id)
      const normsRes = await supabase
        .from('fitness_test_norms')
        .select('*')
        .in('test_id', testIds)

      const normsMap = new Map<string, FitnessTestNorm>()
      const normsList = (normsRes.data ?? []) as FitnessTestNorm[]
      normsList.forEach(norm => {
        if (norm.gender === gender || norm.gender === 'both') {
          normsMap.set(norm.test_id, norm)
        }
      })
      setNorms(normsMap)
    }


    // Initialize results
    const initialResults = sportTestsData.map(st => ({
      test_id: st.test_id,
      result_value: '' as number | '',
      notes: '',
      test_name: st.test ? (st.test as any).test_name : 'Test',
    }))
    setResults(initialResults)

    // Fetch existing sessions
    const sessionsRes = await supabase
      .from('fitness_test_sessions')
      .select('*')
      .eq('athlete_id', athlete.id)
      .order('recorded_date', { ascending: false })
    setSessions(sessionsRes.data ?? [])

    // Fetch all sessions with their results
    await fetchSessionsWithResults(athlete.id)
    setViewMode('view_dashboard')
  }

  async function fetchSessionsWithResults(athleteId: string) {
    const sessionsRes = await supabase
      .from('fitness_test_sessions')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('recorded_date', { ascending: false })

    const sessionsList = sessionsRes.data ?? []
    const withResults: SessionWithResults[] = []

    for (const sess of sessionsList) {
      const resultsRes = await supabase
        .from('fitness_test_results')
        .select('id, test_id, result_value, rating, notes, test:test_id(test_name, unit)')
        .eq('session_id', sess.id)

      const results = (resultsRes.data ?? []).map(r => ({
        id: r.id,
        test_id: r.test_id,
        result_value: r.result_value,
        rating: r.rating,
        notes: r.notes,
        test_name: (r.test as any)?.test_name || 'Test',
        unit: (r.test as any)?.unit || '',
      })) as SessionResult[]

      withResults.push({ session: sess, results })
    }

    setSessionsWithResults(withResults)
  }

  function calculateRating(testId: string, value: number): 'baik' | 'sederhana' | 'lemah' | 'tidak_dinilai' {
    const norm = norms.get(testId)
    if (!norm || !value) return 'tidak_dinilai'

    const { rating_direction } = norm

    if (rating_direction === 'higher_is_better') {
      if (norm.good_min !== undefined && norm.good_min !== null && value >= norm.good_min) return 'baik'
      if (norm.average_min !== undefined && norm.average_min !== null && value >= norm.average_min) return 'sederhana'
      return 'lemah'
    } else {
      if (norm.good_max !== undefined && norm.good_max !== null && value <= norm.good_max) return 'baik'
      if (norm.average_max !== undefined && norm.average_max !== null && value <= norm.average_max) return 'sederhana'
      return 'lemah'
    }
  }

  async function handleSave(asDraft: boolean) {
    if (!selectedAthlete) return
    if (!asDraft && results.some(r => !r.result_value)) {
      setError('Sila isi semua nilai ujian sebelum menyimpan.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Create session
      const { data: sessionData, error: sessionError } = await supabase
        .from('fitness_test_sessions')
        .upsert(
          {
            athlete_id: selectedAthlete.id,
            session,
            year,
            recorded_date: new Date().toISOString().split('T')[0],
            recorded_by: profile!.id,
            is_draft: asDraft,
          },
          { onConflict: 'athlete_id,session,year' }
        )
        .select()
        .single()

      if (sessionError) throw sessionError

      // Upsert results
      const resultsPayload = results
        .filter(r => r.result_value !== '')
        .map(r => ({
          session_id: sessionData.id,
          test_id: r.test_id,
          result_value: r.result_value,
          rating: calculateRating(r.test_id, r.result_value as number),
          notes: r.notes || null,
        }))

      if (resultsPayload.length > 0) {
        const { error: resultsError } = await supabase.from('fitness_test_results').upsert(resultsPayload, {
          onConflict: 'session_id,test_id',
        })
        if (resultsError) throw resultsError
      }

      await logAction(profile!.id, asDraft ? 'draft_fitness_tests' : 'submit_fitness_tests', 'fitness_test_sessions', sessionData.id)

      // Fetch the results that were just saved
      const resultsRes = await supabase
        .from('fitness_test_results')
        .select('id, test_id, result_value, rating, notes, test:test_id(test_name, unit)')
        .eq('session_id', sessionData.id)

      const savedResults = (resultsRes.data ?? []).map(r => ({
        id: r.id,
        test_id: r.test_id,
        result_value: r.result_value,
        rating: r.rating,
        notes: r.notes,
        test_name: (r.test as any)?.test_name || 'Test',
        unit: (r.test as any)?.unit || '',
      })) as SessionResult[]

      // Show results view
      setViewedSession({ session: sessionData, results: savedResults })
      setViewMode('view_results')

      // Update sessions list
      setSessions([sessionData, ...sessions])
      setSessionsWithResults([{ session: sessionData, results: savedResults }, ...sessionsWithResults])
      setResults([])
      setError(null)
    } catch (err) {
      setError((err as any).message || 'Ralat menyimpan data')
    }

    setSaving(false)
  }

  function toggleCategory(category: string) {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  function formatThresholdDisplay(value: number | undefined, direction: string, type: 'baik' | 'sederhana' | 'lemah'): string {
    if (value === undefined || value === null) return ''

    if (direction === 'higher_is_better') {
      if (type === 'baik') return `> ${Math.round(value - 1)}`
      if (type === 'lemah') return `< ${Math.round(value)}`
    } else {
      if (type === 'baik') return `< ${Math.round((value + 0.01) * 100) / 100}`
      if (type === 'lemah') return `> ${Math.round((value - 0.01) * 100) / 100}`
    }
    return ''
  }

  const categoryLabels: Record<string, string> = {
    muscular_endurance: 'Muscular Endurance',
    power: 'Power',
    strength: 'Strength',
    flexibility: 'Flexibility',
    agility: 'Agility',
    speed: 'Speed',
    cardiovascular: 'Cardiovascular',
    coordination: 'Coordination',
    balance: 'Balance',
    martial_arts: 'Martial Arts (Power Kube)',
  }

  const normDisplayValues: Record<string, Record<string, { good: string; average: string; poor: string; unit: string }>> = {
    'Push Up': { M: { good: '>40', average: '21-39', poor: '<20', unit: 'reps' }, F: { good: '>36', average: '12-35', poor: '<11', unit: 'reps' } },
    'Squat': { M: { good: '>45', average: '29-44', poor: '<28', unit: 'reps' }, F: { good: '>39', average: '21-38', poor: '<20', unit: 'reps' } },
    'Sit Up': { M: { good: '>40', average: '21-39', poor: '<20', unit: 'reps' }, F: { good: '>40', average: '21-39', poor: '<20', unit: 'reps' } },
    'Plank': { both: { good: '>360', average: '120-360', poor: '<120', unit: 'seconds' } },
    'Pull Up': { M: { good: '>13', average: '7-12', poor: '<6', unit: 'reps' }, F: { good: '>9', average: '4-8', poor: '<3', unit: 'reps' } },
    'Standing Broad Jump': { M: { good: '>250', average: '210-249', poor: '<209', unit: 'cm' }, F: { good: '>200', average: '161-199', poor: '<160', unit: 'cm' } },
    'Counter Movement Jump': { M: { good: '>42', average: '38-41', poor: '<37', unit: 'cm' }, F: { good: '>41', average: '37-40', poor: '<36', unit: 'cm' } },
    'Seated Medicine Ball Throw': { M: { good: '>3.25', average: '1.76-3.24', poor: '<1.75', unit: 'm' }, F: { good: '>3.75', average: '1.86-3.74', poor: '<1.85', unit: 'm' } },
    'Back Strength': { M: { good: '>170', average: '135-169', poor: '<134', unit: 'kg' }, F: { good: '>150', average: '120-149', poor: '<119', unit: 'kg' } },
    'Handgrip Strength': { M: { good: '>55.5', average: '35.7-55.4', poor: '<35.6', unit: 'kg' }, F: { good: '>31', average: '19.2-30.9', poor: '<19.1', unit: 'kg' } },
    'Sit and Reach': { M: { good: '>39', average: '25-38', poor: '<24', unit: 'cm' }, F: { good: '>41', average: '28-40', poor: '<27', unit: 'cm' } },
    'T-Test': { M: { good: '<9.50', average: '9.51-10.52', poor: '>10.52', unit: 'seconds' }, F: { good: '<10.50', average: '10.51-11.50', poor: '>11.50', unit: 'seconds' } },
    'Hexagon Agility': { M: { good: '<11.2', average: '11.3-17.7', poor: '>17.8', unit: 'seconds' }, F: { good: '<12.2', average: '12.3-21.7', poor: '>21.8', unit: 'seconds' } },
    'Change of Direction Dribble': { M: { good: '<10.00', average: '10.10-11.00', poor: '>11.10', unit: 'seconds' }, F: { good: '<11.00', average: '11.10-12.00', poor: '>12.10', unit: 'seconds' } },
    'Illinois Test': { M: { good: '<15.2', average: '15.3-18.1', poor: '>18.2', unit: 'seconds' }, F: { good: '<17.0', average: '17.1-22.9', poor: '>23.0', unit: 'seconds' } },
    '20m Sprint': { M: { good: '<2.7', average: '2.7-3.1', poor: '>3.1', unit: 'seconds' }, F: { good: '<3.2', average: '3.1-3.5', poor: '>3.5', unit: 'seconds' } },
    '40m Sprint': { M: { good: '<4.0', average: '4.1-4.5', poor: '>4.6', unit: 'seconds' }, F: { good: '<4.5', average: '4.6-4.9', poor: '>5.0', unit: 'seconds' } },
    'Bleep Test': { M: { good: '>2620', average: '1022-2620', poor: '<1022', unit: 'm' }, F: { good: '>2260', average: '820-2260', poor: '<820', unit: 'm' } },
    'Intermittent Recovery Test Level 2': { M: { good: '>21.6', average: '20.1-21.6', poor: '<20.1', unit: 'level' }, F: { good: '>21.1', average: '19.2-20.1', poor: '<19.2', unit: 'level' } },
    '24km Run Test': { M: { good: '<9m45s', average: '9m46s-14m', poor: '>14m01s', unit: 'minutes' }, F: { good: '<12m30s', average: '12m31s-18m30s', poor: '>18m31s', unit: 'minutes' } },
    'Alternate Hand Wall Toss': { both: { good: '>35', average: '16-34', poor: '<15', unit: 'reps' } },
    'Stock Balance Test': { both: { good: '>50', average: '25-49', poor: '<24', unit: 'seconds' } },
    'Cross Punch Power': { M: { good: '>9500', average: '1500-9500', poor: '<1500', unit: 'average' }, F: { good: '>7500', average: '1200-7500', poor: '<1200', unit: 'average' } },
    'Cross Punch Speed': { M: { good: '<0.50', average: '0.51-0.74', poor: '>0.75', unit: 'seconds' }, F: { good: '<0.65', average: '0.66-0.84', poor: '>0.85', unit: 'seconds' } },
    'Roundhouse Kick Speed': { M: { good: '<0.55', average: '0.56-0.78', poor: '>0.79', unit: 'seconds' }, F: { good: '<0.68', average: '0.69-0.86', poor: '>0.87', unit: 'seconds' } },
  }

  if (!canRecord) {
    return <div className="py-16 text-center text-[#888]">Akses ditolak.</div>
  }

  if (loading) {
    return <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#111]">Pencatatan Ujian Kecergasan</h2>
      </div>

      {!selectedAthlete ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-[#111]">Pilih Atlet</p>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Sukan</label>
                <select
                  value={filterSport}
                  onChange={e => setFilterSport(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Semua Sukan</option>
                  {[...new Set(athletes.map(a => a.sport))].sort().map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Cari Nama</label>
                <input
                  type="text"
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
                  placeholder="Ketik nama atlet..."
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-[#111]">NAMA ATLET</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#111]">NO. IC</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#111]">SUKAN</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#111]">KATEGORI</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = athletes
                    .filter(a => !filterSport || a.sport === filterSport)
                    .filter(a => !filterName || a.name.toLowerCase().includes(filterName.toLowerCase()))
                  return filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#888] text-sm">
                        Tiada atlet sepadan penapis
                      </td>
                    </tr>
                  ) : (
                    filtered.map(a => (
                      <tr
                        key={a.id}
                        onClick={() => selectAthlete(a)}
                        className="border-b border-gray-100 hover:bg-blue-50 hover:border-l-4 hover:border-l-blue-500 transition cursor-pointer"
                      >
                        <td className="px-4 py-3 font-semibold text-[#111] hover:underline">{a.name}</td>
                        <td className="px-4 py-3 text-[#888]">{a.ic_number}</td>
                        <td className="px-4 py-3 text-[#888]">{a.sport}</td>
                        <td className="px-4 py-3 text-[#888]">{a.category || '—'}</td>
                      </tr>
                    ))
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#111]">{selectedAthlete.name}</p>
              <p className="text-xs text-[#888]">{selectedAthlete.sport}</p>
            </div>
            <button
              onClick={() => {
                setSelectedAthlete(null)
                setResults([])
                setViewMode('select_athlete')
              }}
              className="text-sm text-[#3A7EC8] hover:underline"
            >
              Tukar Atlet
            </button>
          </div>

          {/* View Mode Tabs */}
          {viewMode !== 'select_athlete' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex gap-2 border-b border-gray-100 -mx-4 -mt-4 px-4 pt-4 mb-4">
                <button
                  onClick={() => setViewMode('view_dashboard')}
                  className={`pb-3 px-2 text-sm font-semibold border-b-2 transition ${
                    viewMode === 'view_dashboard'
                      ? 'border-[#F56A00] text-[#111]'
                      : 'border-transparent text-[#888] hover:text-[#111]'
                  }`}
                >
                  Paparan Keseluruhan
                </button>
                <button
                  onClick={() => setViewMode('view_history')}
                  className={`pb-3 px-2 text-sm font-semibold border-b-2 transition ${
                    viewMode === 'view_history'
                      ? 'border-[#F56A00] text-[#111]'
                      : 'border-transparent text-[#888] hover:text-[#111]'
                  }`}
                >
                  Sejarah Ujian
                </button>
              </div>
            </div>
          )}

          {/* Dashboard View */}
          {viewMode === 'view_dashboard' && sessionsWithResults.length > 0 && (
            <div className="space-y-4">
              {(() => {
                // Get all unique tests across all sessions
                const allTests = new Map<string, { test_id: string; test_name: string; unit: string }>()
                sessionsWithResults.forEach(s => {
                  s.results.forEach(r => {
                    if (!allTests.has(r.test_id)) {
                      allTests.set(r.test_id, { test_id: r.test_id, test_name: r.test_name, unit: r.unit })
                    }
                  })
                })

                // If no test selected, select the first one with results
                const testsArray = Array.from(allTests.values())
                const defaultTestId = testsArray[0]?.test_id
                const currentTestId = selectedTestId || defaultTestId
                const currentTest = allTests.get(currentTestId)

                // Get all results for the selected test across sessions
                const testHistory = sessionsWithResults
                  .map(s => {
                    const result = s.results.find(r => r.test_id === currentTestId)
                    return result ? { session: s.session, result } : null
                  })
                  .filter((x): x is { session: FitnessTestSession; result: SessionResult } => x !== null)
                  .reverse() // Show oldest to newest

                // Calculate improvement
                const latestResult = testHistory[testHistory.length - 1]?.result
                const previousResult = testHistory[testHistory.length - 2]?.result
                let improvement = null
                if (latestResult && previousResult) {
                  improvement = latestResult.result_value - previousResult.result_value
                }

                // Get the norm for color coding in chart
                const testNorm = norms.get(currentTestId)
                const maxValue = testHistory.length > 0 ? Math.max(...testHistory.map(h => h.result.result_value)) * 1.1 : 100

                return (
                  <>
                    {/* Test Selector */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Pilih Ujian</label>
                      <select
                        value={currentTestId || ''}
                        onChange={e => setSelectedTestId(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                      >
                        {testsArray.map(test => (
                          <option key={test.test_id} value={test.test_id}>
                            {test.test_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {currentTest && testHistory.length > 0 && (
                      <>
                        {/* Detailed Test View with Tahap Pencapaian */}
                        <div className="grid grid-cols-3 gap-4">
                          {/* Chart Section */}
                          <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-[#111]">
                                  {currentTest.test_name} — {testHistory.length} Sesi
                                </p>
                                <a href="#" className="text-xs text-[#F56A00] hover:underline">
                                  Eksport →
                                </a>
                              </div>
                            </div>

                            <div className="p-4 space-y-4">
                            {/* Chart */}
                            <div>
                              <div className="flex items-end justify-between gap-2 mb-2" style={{ height: '200px' }}>
                                {testHistory.map((h, idx) => {
                                  const heightPx = (h.result.result_value / maxValue) * 180
                                  return (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                      <div className="w-full flex justify-center mb-2">
                                        <span className="text-xs font-semibold text-[#111]">{h.result.result_value}</span>
                                      </div>
                                      <div
                                        className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t"
                                        style={{ height: `${heightPx}px` }}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="flex justify-between text-[11px] text-[#888]">
                                {testHistory.map((h, idx) => (
                                  <span key={idx}>{h.session.session}</span>
                                ))}
                              </div>
                            </div>

                            {/* Latest Results */}
                            <div className="border-t border-gray-200 pt-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#888] mb-1">Sesi Terkini</p>
                                  <p className="text-2xl font-bold text-[#111]">
                                    {latestResult?.result_value} <span className="text-sm text-[#888]">{currentTest.unit}</span>
                                  </p>
                                </div>
                                {improvement !== null && (
                                  <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#888] mb-1">Perubahan</p>
                                    <div className="flex items-center gap-1">
                                      <span className={`text-lg font-bold ${improvement > 0 ? 'text-green-600' : improvement < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                        {improvement > 0 ? '↑' : improvement < 0 ? '↓' : '—'} {Math.abs(improvement).toFixed(2)}
                                      </span>
                                      {improvement !== 0 && (
                                        <span className="text-xs text-[#888]">
                                          ({((improvement / previousResult.result_value) * 100).toFixed(1)}%)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          </div>

                          {/* Tahap Pencapaian - Right Side */}
                          {testNorm && latestResult && (
                            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                              <p className="text-sm font-semibold text-[#111]">Tahap Pencapaian</p>
                            <div className="space-y-2">
                              {testNorm.rating_direction === 'higher_is_better' ? (
                                <>
                                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                    <span className="text-sm font-semibold text-green-600">✓ Baik</span>
                                    <span className="text-sm text-green-600">{formatThresholdDisplay(testNorm.good_min, testNorm.rating_direction, 'baik')} {currentTest?.unit}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <span className="text-sm font-semibold text-yellow-600">— Sederhana</span>
                                    <span className="text-sm text-yellow-600">{testNorm.average_min ?? 0} - {testNorm.average_max ?? 0} {currentTest?.unit}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                    <span className="text-sm font-semibold text-red-600">✕ Lemah</span>
                                    <span className="text-sm text-red-600">{formatThresholdDisplay(testNorm.poor_max, testNorm.rating_direction, 'lemah')} {currentTest?.unit}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                    <span className="text-sm font-semibold text-green-600">✓ Baik</span>
                                    <span className="text-sm text-green-600">{formatThresholdDisplay(testNorm.good_max, testNorm.rating_direction, 'baik')} {currentTest?.unit}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <span className="text-sm font-semibold text-yellow-600">— Sederhana</span>
                                    <span className="text-sm text-yellow-600">{testNorm.average_min ?? 0} - {testNorm.average_max ?? 0} {currentTest?.unit}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                    <span className="text-sm font-semibold text-red-600">✕ Lemah</span>
                                    <span className="text-sm text-red-600">{formatThresholdDisplay(testNorm.poor_min, testNorm.rating_direction, 'lemah')} {currentTest?.unit}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Current Level */}
                            <div className="border-t border-gray-200 pt-4">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-[#888] mb-3 text-center">Tahap Semasa</p>
                              <div className={`text-center py-3 px-4 rounded-full font-bold text-lg ${
                                latestResult.rating === 'baik'
                                  ? 'bg-green-100 text-green-700'
                                  : latestResult.rating === 'sederhana'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : latestResult.rating === 'lemah'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                              }`}>
                                {latestResult.rating === 'baik' ? '✓ BAIK' : latestResult.rating === 'sederhana' ? '— SEDERHANA' : '✕ LEMAH'}
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Comparison Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <p className="text-sm font-semibold text-[#111]">Perbandingan Semua Ujian</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left px-4 py-2 font-semibold text-[#111]">UJIAN</th>
                              <th className="text-right px-4 py-2 font-semibold text-[#888] text-xs">SESI LEPAS</th>
                              <th className="text-right px-4 py-2 font-semibold text-[#888] text-xs">SESI TERKINI</th>
                              <th className="text-right px-4 py-2 font-semibold text-[#888] text-xs">PERUBAHAN</th>
                              <th className="text-right px-4 py-2 font-semibold text-[#888] text-xs">UNIT</th>
                              <th className="text-right px-4 py-2 font-semibold text-[#888] text-xs">TAHAP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testsArray.slice(0, 10).map(test => {
                              const history = sessionsWithResults
                                .map(s => {
                                  const result = s.results.find(r => r.test_id === test.test_id)
                                  return result ? { session: s.session, result } : null
                                })
                                .filter((x): x is { session: FitnessTestSession; result: SessionResult } => x !== null)
                                .reverse()

                              const latest = history[history.length - 1]?.result
                              const previous = history[history.length - 2]?.result
                              const change = latest && previous ? latest.result_value - previous.result_value : null

                              return (
                                <tr key={test.test_id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                  <td className="px-4 py-3 font-semibold text-[#111]">{test.test_name}</td>
                                  <td className="px-4 py-3 text-right text-[#888]">{previous?.result_value || '-'}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-[#111]">{latest?.result_value || '-'}</td>
                                  <td className="px-4 py-3 text-right">
                                    {change !== null ? (
                                      <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}>
                                        {change > 0 ? '↑' : change < 0 ? '↓' : '—'} {Math.abs(change).toFixed(2)}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-[#888]">{test.unit}</td>
                                  <td className="px-4 py-3 text-right">
                                    {latest?.rating && (
                                      <span
                                        className={`inline-block text-xs font-bold px-2 py-1 rounded-full ${
                                          latest.rating === 'baik'
                                            ? 'bg-green-100 text-green-700'
                                            : latest.rating === 'sederhana'
                                              ? 'bg-yellow-100 text-yellow-700'
                                              : 'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        {latest.rating === 'baik' ? 'BAIK' : latest.rating === 'sederhana' ? 'SEDERHANA' : 'LEMAH'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Record New Test Button */}
                    <button
                      onClick={() => setViewMode('record_tests')}
                      className="w-full px-4 py-3 bg-[#F56A00] text-white font-semibold rounded-lg hover:bg-[#D45A00] transition"
                    >
                      Rekod Ujian Baru
                    </button>
                  </>
                )
              })()}
            </div>
          )}

          {/* No Results Message */}
          {viewMode === 'view_dashboard' && sessionsWithResults.length === 0 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-8 text-center">
                <p className="text-sm text-blue-700">Tiada sejarah ujian. Mulakan dengan merekod ujian baru.</p>
              </div>
              <button
                onClick={() => setViewMode('record_tests')}
                className="w-full px-4 py-3 bg-[#F56A00] text-white font-semibold rounded-lg hover:bg-[#D45A00] transition"
              >
                Rekod Ujian Baru
              </button>
            </div>
          )}

          {/* Record Tests View */}
          {viewMode === 'record_tests' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Sesi</label>
                    <select
                      value={session}
                      onChange={e => setSession(e.target.value as any)}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="Fasa 1">Fasa 1</option>
                      <option value="Fasa 2">Fasa 2</option>
                      <option value="Fasa 3">Fasa 3</option>
                      <option value="Fasa 4">Fasa 4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Tahun</label>
                    <select
                      value={year}
                      onChange={e => setYear(parseInt(e.target.value))}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <span className="text-[12px] text-[#888]">
                      {sportTests.length} ujian untuk {selectedAthlete.sport}
                    </span>
                  </div>
                </div>
              </div>

          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}

          <div className="space-y-2">
            {(() => {
              const grouped = sportTests.reduce((acc, st, idx) => {
                const category = (st.test as any)?.category || 'other'
                const group = acc.find(g => g.category === category)
                if (group) group.tests.push({ st, idx })
                else acc.push({ category, tests: [{ st, idx }] })
                return acc
              }, [] as Array<{ category: string; tests: Array<{ st: SportFitnessTest; idx: number }> }>)

              return grouped.map(group => {
                const isExpanded = expandedCategories[group.category] ?? true
                return (
                  <div key={group.category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(group.category)}
                      className="w-full px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition flex items-center justify-between"
                    >
                      <p className="text-sm font-bold text-[#111]">{categoryLabels[group.category] || group.category}</p>
                      <svg
                        className={`w-4 h-4 text-[#888] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {group.tests.map(({ st, idx }) => {
                          const result = results[idx]
                          const rating = result?.result_value ? calculateRating(st.test_id, result.result_value as number) : 'not_rated'
                          const norm = norms.get(st.test_id)

                          return (
                            <div key={st.test_id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-sm text-[#111]">{(st.test as any)?.test_name}</p>
                                  <p className="text-xs text-[#888]">Unit: {(st.test as any)?.unit}</p>
                                  {st.is_mandatory && <span className="text-[10px] text-[#F56A00] font-semibold mt-1 block">WAJIB</span>}
                                </div>
                                {rating !== 'tidak_dinilai' && (
                                  <span
                                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                                      rating === 'baik'
                                        ? 'bg-green-100 text-green-700'
                                        : rating === 'sederhana'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {rating === 'baik' ? 'BAIK' : rating === 'sederhana' ? 'SEDERHANA' : 'LEMAH'}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">
                                    Nilai {st.is_mandatory ? '*' : ''}
                                  </label>
                                  <input
                                    type="number"
                                    value={result?.result_value || ''}
                                    onChange={e =>
                                      setResults(r => [
                                        ...r.slice(0, idx),
                                        { ...(result || { test_id: st.test_id, result_value: '', notes: '', test_name: (st.test as any)?.test_name }), result_value: e.target.value ? parseFloat(e.target.value) : '' },
                                        ...r.slice(idx + 1),
                                      ])
                                    }
                                    placeholder="Masukkan nilai"
                                    className="w-full bg-white border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                                    step="0.01"
                                  />
                                </div>
                                {norm && (
                                  <div className="text-[11px] text-[#888] bg-white rounded-lg border border-[#E8E8E8] p-2">
                                    <p className="font-semibold mb-1">Reference:</p>
                                    {(() => {
                                      const testName = (st.test as any)?.test_name
                                      const displayMap = normDisplayValues[testName]
                                      if (displayMap) {
                                        const display = displayMap[norm.gender] || displayMap['both']
                                        if (display) {
                                          return (
                                            <div>
                                              <p>Good: {display.good} {display.unit}</p>
                                              <p>Average: {display.average} {display.unit}</p>
                                              <p>Poor: {display.poor} {display.unit}</p>
                                            </div>
                                          )
                                        }
                                      }
                                      return null
                                    })()}
                                  </div>
                                )}
                              </div>

                              <div className="mt-2">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Catatan</label>
                                <textarea
                                  value={result?.notes || ''}
                                  onChange={e => setResults(r => [...r.slice(0, idx), { ...(result || { test_id: st.test_id, result_value: '', notes: '', test_name: (st.test as any)?.test_name }), notes: e.target.value }, ...r.slice(idx + 1)])}
                                  placeholder="Catatan tambahan (pilihan)"
                                  className="w-full bg-white border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm resize-none"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>

              <div className="flex gap-3 justify-end bg-white rounded-lg p-4 border border-gray-200">
                <button
                  onClick={() => {
                    setResults([])
                    setViewMode('view_dashboard')
                  }}
                  className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-[#F56A00] border border-[#F56A00] rounded-lg hover:bg-orange-50 transition disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan sebagai Draf'}
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving || results.every(r => !r.result_value)}
                  className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
                >
                  {saving ? 'Menyimpan...' : 'Serah Ujian'}
                </button>
              </div>
            </>
          )}

          {/* View Results */}
          {viewMode === 'view_results' && viewedSession && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-green-700">✓ Ujian telah disimpan</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-lg font-bold text-[#111] mb-4">Hasil Ujian - {viewedSession.session.session} {viewedSession.session.year}</h3>
                <div className="space-y-3">
                  {viewedSession.results.map(result => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-semibold text-sm text-[#111]">{result.test_name}</p>
                        <p className="text-xs text-[#888]">{result.result_value} {result.unit}</p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          result.rating === 'baik'
                            ? 'bg-green-100 text-green-700'
                            : result.rating === 'sederhana'
                              ? 'bg-yellow-100 text-yellow-700'
                              : result.rating === 'lemah'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {result.rating === 'baik' ? 'BAIK' : result.rating === 'sederhana' ? 'SEDERHANA' : result.rating === 'lemah' ? 'LEMAH' : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setViewMode('view_dashboard')}
                  className="px-4 py-2 text-sm text-[#888] border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition"
                >
                  Kembali ke Paparan
                </button>
                <button
                  onClick={() => {
                    setViewMode('record_tests')
                    setResults([])
                    setSession('Fasa 1')
                  }}
                  className="px-4 py-2 text-sm bg-[#F56A00] text-white rounded-lg hover:bg-[#D45A00] transition"
                >
                  Rekod Ujian Lain
                </button>
              </div>
            </div>
          )}

          {/* View History */}
          {viewMode === 'view_history' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-semibold text-[#111]">Sejarah Ujian</p>
                </div>

                {sessionsWithResults.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#888] text-sm">
                    Tiada sejarah ujian
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {sessionsWithResults.map(sessionResult => (
                      <div key={sessionResult.session.id} className="p-4 hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-[#111]">{sessionResult.session.session} {sessionResult.session.year}</p>
                            <p className="text-xs text-[#888]">{new Date(sessionResult.session.recorded_date).toLocaleDateString('ms-MY')}</p>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {sessionResult.results.length} ujian
                          </span>
                        </div>
                        <div className="space-y-2">
                          {sessionResult.results.map(result => (
                            <div key={result.id} className="flex items-center justify-between text-xs">
                              <span className="text-[#111]">{result.test_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[#888]">{result.result_value} {result.unit}</span>
                                <span
                                  className={`font-semibold ${
                                    result.rating === 'baik'
                                      ? 'text-green-600'
                                      : result.rating === 'sederhana'
                                        ? 'text-yellow-600'
                                        : result.rating === 'lemah'
                                          ? 'text-red-600'
                                          : 'text-gray-600'
                                  }`}
                                >
                                  {result.rating === 'baik' ? 'BAIK' : result.rating === 'sederhana' ? 'SEDERHANA' : result.rating === 'lemah' ? 'LEMAH' : '—'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setViewMode('record_tests')}
                  className="px-4 py-2 text-sm bg-[#F56A00] text-white rounded-lg hover:bg-[#D45A00] transition"
                >
                  Rekod Ujian Baru
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
