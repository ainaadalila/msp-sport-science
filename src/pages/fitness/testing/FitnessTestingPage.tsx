import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
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
  const { can } = usePermissions()

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [sportTests, setSportTests] = useState<SportFitnessTest[]>([])
  const [norms, setNorms] = useState<Map<string, FitnessTestNorm>>(new Map())
  const [sessions, setSessions] = useState<FitnessTestSession[]>([])

  const [session, setSession] = useState<'Fasa 1' | 'Fasa 2' | 'Fasa 3' | 'Fasa 4'>('Fasa 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [results, setResults] = useState<TestResultInput[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSport, setFilterSport] = useState('')
  const [filterName, setFilterName] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  // Tab state
  type ViewTab = 'jadual' | 'profil'
  const [activeTab, setActiveTab] = useState<ViewTab>('jadual')
  const [profilViewMode, setProfilViewMode] = useState<'view_dashboard' | 'record_tests' | 'view_results' | 'view_history'>('view_dashboard')
  const [viewedSession, setViewedSession] = useState<SessionWithResults | null>(null)
  const [sessionsWithResults, setSessionsWithResults] = useState<SessionWithResults[]>([])

  useEffect(() => {
    fetchAthletes()
  }, [])

  async function fetchAthletes() {
    setLoading(true)
    const res = await supabase.from('athletes').select('*, ic_number').order('name')
    setAthletes(res.data ?? [])
    setLoading(false)
  }

  const getAthleteGender = (icNumber: string) => {
    const genderDigit = parseInt(icNumber.charAt(11))
    return genderDigit % 2 === 1 ? 'M' : 'F'
  }

  async function selectAthlete(athlete: Athlete) {
    setSelectedAthlete(athlete)
    setResults([])
    setError(null)
    setActiveTab('profil')
    setProfilViewMode('view_dashboard')

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
      if (norm.good_min !== undefined && norm.good_min !== null && value > norm.good_min) return 'baik'
      if (norm.average_min !== undefined && norm.average_min !== null && value >= norm.average_min) return 'sederhana'
      return 'lemah'
    } else {
      if (norm.good_max !== undefined && norm.good_max !== null && value < norm.good_max) return 'baik'
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
      setProfilViewMode('view_results')

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

  if (loading) {
    return <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#111]">Pencatatan Ujian Kecergasan</h2>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-2 border-b border-gray-100 -mx-4 -mt-4 px-4 pt-4 mb-4">
          {[
            { id: 'jadual', label: 'Jadual' },
            { id: 'profil', label: 'Profil' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ViewTab)}
              className={`pb-3 px-2 text-sm font-semibold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-[#F56A00] text-[#111]'
                  : 'border-transparent text-[#888] hover:text-[#111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jadual Tab - All Athletes */}
      {activeTab === 'jadual' && (
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

          <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
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
                        className="border-b border-gray-100 hover:bg-[rgba(245,106,0,0.06)] hover:border-l-4 hover:border-l-[#F56A00] transition cursor-pointer"
                      >
                        <td className="px-4 py-3 font-semibold text-[#111] hover:text-[#F56A00]">{a.name}</td>
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
      )}

      {/* Profil Tab - Selected Athlete Details */}
      {activeTab === 'profil' && selectedAthlete && (
        <div className="space-y-4">
          <div className="bg-[rgba(245,106,0,0.08)] border border-[rgba(245,106,0,0.2)] rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#111]">{selectedAthlete.name}</p>
              <p className="text-xs text-[#888]">{selectedAthlete.sport}</p>
            </div>
            <button
              onClick={() => setActiveTab('jadual')}
              className="text-sm text-[#F56A00] hover:underline font-medium"
            >
              Tukar Atlet
            </button>
          </div>

          {/* Profil View Mode Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex gap-2 border-b border-gray-100 -mx-4 -mt-4 px-4 pt-4 mb-4">
              <button
                onClick={() => setProfilViewMode('view_dashboard')}
                className={`pb-3 px-2 text-sm font-semibold border-b-2 transition ${
                  profilViewMode === 'view_dashboard'
                    ? 'border-[#F56A00] text-[#111]'
                    : 'border-transparent text-[#888] hover:text-[#111]'
                }`}
              >
                Paparan Keseluruhan
              </button>
              <button
                onClick={() => setProfilViewMode('view_history')}
                className={`pb-3 px-2 text-sm font-semibold border-b-2 transition ${
                  profilViewMode === 'view_history'
                    ? 'border-[#F56A00] text-[#111]'
                    : 'border-transparent text-[#888] hover:text-[#111]'
                }`}
              >
                Sejarah Ujian
              </button>
            </div>
          </div>

          {/* Dashboard View */}
          {profilViewMode === 'view_dashboard' && sessionsWithResults.length > 0 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {(() => {
                    const latestSession = sessionsWithResults[0]
                    if (!latestSession) return null

                    return latestSession.results.map(result => {
                      const ratingBadge: Record<string, string> = {
                        baik: 'bg-green-50 text-[#3A9E6A] border border-green-200',
                        sederhana: 'bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]',
                        lemah: 'bg-red-50 text-[#D44040] border border-red-200',
                        tidak_dinilai: 'bg-gray-100 text-[#888] border border-gray-200',
                      }

                      return (
                        <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                          <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest mb-2">{result.test_name}</p>
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-bold text-[#111]">{result.result_value}</span>
                            <span className="text-[12px] text-[#888]">{result.unit}</span>
                          </div>
                          <span className={`inline-block text-[11px] font-semibold px-2 py-1 rounded-full ${ratingBadge[result.rating] || ratingBadge.tidak_dinilai}`}>
                            {result.rating === 'baik' ? 'BAIK' : result.rating === 'sederhana' ? 'SEDERHANA' : result.rating === 'lemah' ? 'LEMAH' : 'TIDAK DINILAI'}
                          </span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Empty Dashboard */}
          {profilViewMode === 'view_dashboard' && sessionsWithResults.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 py-12 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[rgba(245,106,0,0.1)] flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F56A00" strokeWidth="1.6">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#111] mb-1">Tiada rekod ujian lagi</p>
                <p className="text-[12px] text-[#888] mb-4">Mulai dengan merekod ujian pertama atlet ini.</p>
                {can('fitness', 'create') && (
                  <button
                    onClick={() => setProfilViewMode('record_tests')}
                    className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                  >
                    + Rakam Ujian
                  </button>
                )}
              </div>
            </div>
          )}

          {/* History View */}
          {profilViewMode === 'view_history' && sessionsWithResults.length > 0 && (
            <div className="space-y-4">
              {sessionsWithResults.map(swrec => (
                <div key={swrec.session.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition cursor-pointer"
                  onClick={() => { setViewedSession(swrec); setProfilViewMode('view_results') }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-[#111]">{swrec.session.session}</p>
                        <p className="text-[12px] text-[#888]">{new Date(swrec.session.recorded_date).toLocaleDateString('ms-MY')}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        swrec.session.is_draft
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : 'bg-green-50 text-[#3A9E6A] border border-green-200'
                      }`}>
                        {swrec.session.is_draft ? 'DRAF' : 'SELESAI'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {swrec.results.slice(0, 3).map(r => (
                        <span key={r.id} className="text-[10px] px-2 py-1 bg-gray-100 text-[#666] rounded">
                          {r.test_name}
                        </span>
                      ))}
                      {swrec.results.length > 3 && (
                        <span className="text-[10px] px-2 py-1 bg-gray-100 text-[#666] rounded">
                          +{swrec.results.length - 3} lagi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Record Tests View */}
          {profilViewMode === 'record_tests' && can('fitness', 'create') && (
            <div className="space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Fasa</label>
                    <select
                      value={session}
                      onChange={e => setSession(e.target.value as 'Fasa 1' | 'Fasa 2' | 'Fasa 3' | 'Fasa 4')}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="Fasa 1">Fasa 1</option>
                      <option value="Fasa 2">Fasa 2</option>
                      <option value="Fasa 3">Fasa 3</option>
                      <option value="Fasa 4">Fasa 4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Tahun</label>
                    <select
                      value={year}
                      onChange={e => setYear(parseInt(e.target.value))}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                    >
                      {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tests by Category */}
                {sportTests.length > 0 ? (
                  <div className="space-y-3">
                    {(() => {
                      const grouped: Record<string, SportFitnessTest[]> = {}
                      sportTests.forEach(st => {
                        const cat = (st.test as any)?.category || 'Lain-lain'
                        if (!grouped[cat]) grouped[cat] = []
                        grouped[cat].push(st)
                      })
                      return Object.entries(grouped).map(([cat, tests]) => (
                        <div key={cat}>
                          <button
                            onClick={() => toggleCategory(cat)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <span className="font-semibold text-[12px] uppercase tracking-widest text-[#888]">
                              {categoryLabels[cat] || cat}
                            </span>
                            <span className="text-[#888]">{expandedCategories[cat] ? '−' : '+'}</span>
                          </button>
                          {expandedCategories[cat] && (
                            <div className="mt-2 space-y-2 ml-2">
                              {tests.map(st => {
                                const result = results.find(r => r.test_id === st.test_id)
                                return (
                                  <div key={st.test_id} className="flex gap-3 items-end">
                                    <div className="flex-1">
                                      <p className="text-[12px] font-semibold text-[#111] mb-1">
                                        {st.test ? (st.test as any).test_name : 'Test'}
                                      </p>
                                      <input
                                        type="number"
                                        placeholder="Nilai"
                                        step="0.01"
                                        value={result?.result_value || ''}
                                        onChange={e => {
                                          const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                                          setResults(prev => {
                                            const idx = prev.findIndex(r => r.test_id === st.test_id)
                                            const updated = [...prev]
                                            if (idx >= 0) {
                                              updated[idx] = { ...updated[idx], result_value: val }
                                            }
                                            return updated
                                          })
                                        }}
                                        className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                                      />
                                    </div>
                                    <span className="text-[11px] text-[#888] whitespace-nowrap">
                                      {st.test ? (st.test as any).unit : ''}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    })()}
                  </div>
                ) : (
                  <p className="text-center text-[#888] text-sm py-4">Tiada ujian untuk sukan ini</p>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setProfilViewMode('view_dashboard')}
                    className="flex-1 px-4 py-2 text-sm text-[#888] hover:text-[#111] border border-gray-200 rounded-lg transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-[#111] text-sm font-semibold rounded-lg transition"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Draf'}
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex-1 px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan & Serahkan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Results */}
          {profilViewMode === 'view_results' && viewedSession && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="font-semibold text-[#111]">{viewedSession.session.session} - {viewedSession.session.year}</p>
                    <p className="text-[12px] text-[#888]">{new Date(viewedSession.session.recorded_date).toLocaleDateString('ms-MY')}</p>
                  </div>
                  <button
                    onClick={() => setProfilViewMode('view_history')}
                    className="text-sm text-[#F56A00] hover:underline font-medium"
                  >
                    Kembali
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {viewedSession.results.map(result => {
                    const ratingBadge: Record<string, string> = {
                      baik: 'bg-green-50 text-[#3A9E6A] border border-green-200',
                      sederhana: 'bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]',
                      lemah: 'bg-red-50 text-[#D44040] border border-red-200',
                      tidak_dinilai: 'bg-gray-100 text-[#888] border border-gray-200',
                    }

                    return (
                      <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                        <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest mb-2">{result.test_name}</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-2xl font-bold text-[#111]">{result.result_value}</span>
                          <span className="text-[12px] text-[#888]">{result.unit}</span>
                        </div>
                        <span className={`inline-block text-[11px] font-semibold px-2 py-1 rounded-full ${ratingBadge[result.rating] || ratingBadge.tidak_dinilai}`}>
                          {result.rating === 'baik' ? 'BAIK' : result.rating === 'sederhana' ? 'SEDERHANA' : result.rating === 'lemah' ? 'LEMAH' : 'TIDAK DINILAI'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Record Tests Button */}
          {profilViewMode === 'view_dashboard' && sessionsWithResults.length > 0 && can('fitness', 'create') && (
            <div className="flex gap-3">
              <button
                onClick={() => setProfilViewMode('record_tests')}
                className="flex-1 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-3 rounded-lg transition"
              >
                + Rakam Ujian
              </button>
            </div>
          )}
        </div>
      )}

      {/* Profil Empty State */}
      {activeTab === 'profil' && !selectedAthlete && (
        <div className="bg-white rounded-xl border border-gray-200 py-12 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(245,106,0,0.1)] flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F56A00" strokeWidth="1.6">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Pilih atlet dari jadual</p>
            <p className="text-[12px] text-[#888]">Klik pada nama atlet untuk melihat profil dan sejarah ujian mereka</p>
          </div>
        </div>
      )}
    </div>
  )
}
