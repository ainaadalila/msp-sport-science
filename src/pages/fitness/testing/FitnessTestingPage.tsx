import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
import { useSports } from '../../../hooks/useSports'
import { useAthletes } from '../../../hooks/useAthletes'
import { logAction } from '../../../lib/audit'
import jsPDF from 'jspdf'
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

const formatTestName = (name: string) => {
  return name
    .replace(/([a-z])and([A-Z])/g, '$1 and $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .trim()
}

export default function FitnessTestingPage() {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const { sports } = useSports()
  const canRecord = can('fitness', 'create')
  const [searchParams] = useSearchParams()
  const athleteIdParam = searchParams.get('athlete')
  const chartRef = useRef<HTMLDivElement>(null)

  const { athletes, loading } = useAthletes()
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [sportTests, setSportTests] = useState<SportFitnessTest[]>([])
  const [norms, setNorms] = useState<Map<string, FitnessTestNorm>>(new Map())
  const [sessions, setSessions] = useState<FitnessTestSession[]>([])

  const getAthleteGender = (icNumber: string) => {
    const genderDigit = parseInt(icNumber.charAt(10))
    return genderDigit % 2 === 1 ? 'M' : 'F'
  }

  const [session, setSession] = useState<'Fasa 1' | 'Fasa 2' | 'Fasa 3' | 'Fasa 4'>('Fasa 1')
  const [year, setYear] = useState(new Date().getFullYear())
  const [results, setResults] = useState<TestResultInput[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterSport, setFilterSport] = useState('')
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const [viewMode, setViewMode] = useState<'select_athlete' | 'view_dashboard' | 'record_tests' | 'view_results' | 'view_history'>('select_athlete')
  const [viewedSession, setViewedSession] = useState<SessionWithResults | null>(null)
  const [sessionsWithResults, setSessionsWithResults] = useState<SessionWithResults[]>([])
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [selectedAthletesGender, setSelectedAthletesGender] = useState<'M' | 'F' | null>(null)

  const allTestsForPrint = useMemo(() => {
    const map = new Map<string, { test_id: string; test_name: string; unit: string }>()
    sessionsWithResults.forEach(s => {
      s.results.forEach(r => {
        if (!map.has(r.test_id)) map.set(r.test_id, { test_id: r.test_id, test_name: r.test_name, unit: r.unit })
      })
    })
    return Array.from(map.values())
  }, [sessionsWithResults])

  function handlePrint() {
    if (!selectedAthlete || allTestsForPrint.length === 0) return

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const PW = pdf.internal.pageSize.getWidth()
    const PH = pdf.internal.pageSize.getHeight()
    const M = 14
    const CW = PW - M * 2
    let y = M

    const checkPage = (needed: number) => {
      if (y + needed > PH - M) { pdf.addPage(); y = M }
    }

    // ── HEADER ──────────────────────────────────────────────
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(245, 106, 0)
    pdf.text('LAPORAN UJIAN KECERGASAN FIZIKAL', M, y)
    y += 7

    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(17, 17, 17)
    pdf.text(selectedAthlete.name, M, y)
    y += 7

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(136, 136, 136)
    const dateStr = new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
    pdf.text(`${selectedAthlete.sport?.name || ''}   ${dateStr}`, M, y)
    y += 5

    pdf.setDrawColor(220, 220, 220)
    pdf.setLineWidth(0.4)
    pdf.line(M, y, PW - M, y)
    y += 9

    // ── COMPARISON TABLE ────────────────────────────────────
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(136, 136, 136)
    pdf.text('PERBANDINGAN SEMUA UJIAN', M, y)
    y += 5

    const cols = [
      { label: 'UJIAN', w: CW * 0.30 },
      { label: 'SESI LEPAS', w: CW * 0.13 },
      { label: 'SESI TERKINI', w: CW * 0.16 },
      { label: 'PERUBAHAN', w: CW * 0.15 },
      { label: 'UNIT', w: CW * 0.09 },
      { label: 'TAHAP', w: CW * 0.17 },
    ]
    const colX: number[] = [M]
    for (let i = 0; i < cols.length - 1; i++) colX.push(colX[i] + cols[i].w)

    // Header row
    pdf.setFillColor(249, 250, 251)
    pdf.rect(M, y, CW, 7, 'F')
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.line(M, y + 7, M + CW, y + 7)
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(85, 85, 85)
    cols.forEach((col, i) => {
      const tx = i === 0 ? colX[i] + 2 : colX[i] + col.w - 2
      pdf.text(col.label, tx, y + 5, { align: i === 0 ? 'left' : 'right' })
    })
    y += 7

    const ROW_H = 11
    allTestsForPrint.forEach(test => {
      const hist = sessionsWithResults
        .map(s => { const r = s.results.find(x => x.test_id === test.test_id); return r ? { session: s.session, result: r } : null })
        .filter((x): x is { session: FitnessTestSession; result: SessionResult } => x !== null)
        .reverse()
      const latest = hist[hist.length - 1]?.result
      const prev = hist[hist.length - 2]?.result
      const change = latest && prev ? latest.result_value - prev.result_value : null

      checkPage(ROW_H + 2)

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 17, 17)
      pdf.text(formatTestName(test.test_name), colX[0] + 2, y + 7.5)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(136, 136, 136)
      pdf.text(prev ? String(prev.result_value) : '-', colX[1] + cols[1].w - 2, y + 7.5, { align: 'right' })

      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 17, 17)
      pdf.text(latest ? String(latest.result_value) : '-', colX[2] + cols[2].w - 2, y + 7.5, { align: 'right' })

      if (change !== null && change !== 0) {
        const isPos = change > 0
        pdf.setTextColor(isPos ? 22 : 220, isPos ? 163 : 38, isPos ? 74 : 38)
        pdf.text(`${isPos ? '+ ' : '- '}${Math.abs(change).toFixed(2)}`, colX[3] + cols[3].w - 2, y + 7.5, { align: 'right' })
      } else {
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(136, 136, 136)
        pdf.text(change === 0 ? '0.00' : '-', colX[3] + cols[3].w - 2, y + 7.5, { align: 'right' })
      }

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(136, 136, 136)
      pdf.text(test.unit, colX[4] + cols[4].w - 2, y + 7.5, { align: 'right' })

      const rating = latest?.rating
      if (rating && rating !== 'tidak_dinilai') {
        const label = rating === 'baik' ? 'BAIK' : rating === 'sederhana' ? 'SEDERHANA' : 'LEMAH'
        const bw = 24
        const bx = colX[5] + cols[5].w - bw
        const by = y + 3
        if (rating === 'baik') pdf.setFillColor(220, 252, 231)
        else if (rating === 'sederhana') pdf.setFillColor(254, 249, 195)
        else pdf.setFillColor(254, 226, 226)
        pdf.roundedRect(bx, by, bw, 7, 1.5, 1.5, 'F')
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'bold')
        if (rating === 'baik') pdf.setTextColor(22, 163, 74)
        else if (rating === 'sederhana') pdf.setTextColor(202, 138, 4)
        else pdf.setTextColor(220, 38, 38)
        pdf.text(label, bx + bw / 2, by + 5, { align: 'center' })
      }

      pdf.setDrawColor(243, 244, 246)
      pdf.setLineWidth(0.2)
      pdf.line(M, y + ROW_H, M + CW, y + ROW_H)
      y += ROW_H
    })

    y += 10
    checkPage(25)

    // ── BAR CHARTS ──────────────────────────────────────────
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(136, 136, 136)
    pdf.text('GRAF PERKEMBANGAN UJIAN', M, y)
    y += 6

    const CHART_W = (CW - 6) / 2
    const CHART_H = 56
    const BAR_AREA_H = 36
    const BAR_TOP_OFFSET = 13

    for (let i = 0; i < allTestsForPrint.length; i++) {
      const test = allTestsForPrint[i]
      const hist = sessionsWithResults
        .map(s => { const r = s.results.find(x => x.test_id === test.test_id); return r ? { session: s.session, result: r } : null })
        .filter((x): x is { session: FitnessTestSession; result: SessionResult } => x !== null)
        .reverse()
      if (hist.length === 0) continue

      const isLeft = i % 2 === 0
      if (isLeft && i > 0) {
        y += CHART_H + 5
        checkPage(CHART_H + 10)
      }
      if (i === 0) checkPage(CHART_H + 10)

      const cx = M + (isLeft ? 0 : CHART_W + 6)
      const cy = y

      // Border
      pdf.setDrawColor(229, 231, 235)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(cx, cy, CHART_W, CHART_H, 2, 2)

      // Header background
      pdf.setFillColor(249, 250, 251)
      pdf.rect(cx + 0.3, cy + 0.3, CHART_W - 0.6, 9, 'F')
      pdf.setDrawColor(229, 231, 235)
      pdf.setLineWidth(0.3)
      pdf.line(cx, cy + 9, cx + CHART_W, cy + 9)

      // Title
      const testLabel = formatTestName(test.test_name)
      const sesLabel = ` (${hist.length} sesi)`
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(17, 17, 17)
      pdf.text(testLabel, cx + 3, cy + 6.5)
      const nw = pdf.getTextWidth(testLabel)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(136, 136, 136)
      pdf.text(sesLabel, cx + 3 + nw, cy + 6.5)

      // Bars
      const maxVal = Math.max(...hist.map(h => h.result.result_value))
      const barAreaX = cx + 5
      const barAreaW = CHART_W - 10
      const slotW = barAreaW / hist.length
      const barW = Math.min(slotW - 3, 14)
      const baseY = cy + BAR_TOP_OFFSET + BAR_AREA_H

      hist.forEach((h, idx) => {
        const bh = maxVal > 0 ? (h.result.result_value / maxVal) * BAR_AREA_H : 2
        const bx = barAreaX + idx * slotW + (slotW - barW) / 2
        const by = baseY - bh
        const isLatest = idx === hist.length - 1

        pdf.setFillColor(isLatest ? 249 : 253, isLatest ? 115 : 186, isLatest ? 22 : 116)
        pdf.roundedRect(bx, by, barW, bh, 1, 0, 'F')

        pdf.setFontSize(6.5)
        pdf.setFont('helvetica', isLatest ? 'bold' : 'normal')
        pdf.setTextColor(isLatest ? 17 : 136, isLatest ? 17 : 136, isLatest ? 17 : 136)
        pdf.text(String(h.result.result_value), bx + barW / 2, by - 1.5, { align: 'center' })

        pdf.setFontSize(6.5)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(136, 136, 136)
        pdf.text(h.session.session, bx + barW / 2, baseY + 5.5, { align: 'center' })
      })
    }

    pdf.save(`Ujian_Kecergasan_${selectedAthlete.name}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }


  useEffect(() => {
    if (athleteIdParam && athletes.length > 0) {
      const athlete = athletes.find(a => a.id === athleteIdParam)
      if (athlete) {
        selectAthlete(athlete)
      }
    }
  }, [athleteIdParam, athletes])


  async function selectAthlete(athlete: Athlete) {
    setSelectedAthlete(athlete)
    setResults([])
    setError(null)

    const gender = (athlete.gender as 'M' | 'F') ?? getAthleteGender(athlete.ic_number)
    setSelectedAthletesGender(gender)

    // Fetch sport tests for this athlete's sport
    const testsRes = await supabase
      .from('sport_fitness_tests')
      .select('id, sport, test_id, is_mandatory, created_at, test:test_id(id, test_name, unit, category, created_at)')
      .eq('sport', athlete.sport?.name)

    const sportTestsData = (testsRes.data ?? []) as unknown as SportFitnessTest[]
    setSportTests(sportTestsData)

    // Initialize expanded categories
    const categories = [...new Set(sportTestsData.map(st => (st.test as any)?.category))].filter(Boolean)
    const expandedState: Record<string, boolean> = {}
    categories.forEach(cat => {
      expandedState[cat] = true
    })
    setExpandedCategories(expandedState)

    // Initialize results
    const initialResults = sportTestsData.map(st => ({
      test_id: st.test_id,
      result_value: '' as number | '',
      notes: '',
      test_name: st.test ? (st.test as any).test_name : 'Test',
    }))
    setResults(initialResults)

    // Fetch norms and sessions in parallel
    if (sportTestsData.length > 0) {
      const testIds = sportTestsData.map(st => st.test_id)
      const [normsRes, sessionsRes] = await Promise.all([
        supabase
          .from('fitness_test_norms')
          .select('id, test_id, gender, good_min, good_max, average_min, average_max, poor_min, poor_max, rating_direction, created_at')
          .in('test_id', testIds),
        supabase
          .from('fitness_test_sessions')
          .select('id, athlete_id, session, year, recorded_date, recorded_by, created_at')
          .eq('athlete_id', athlete.id)
          .order('recorded_date', { ascending: false })
      ])

      const normsMap = new Map<string, FitnessTestNorm>()
      const normsList = (normsRes.data ?? []) as FitnessTestNorm[]
      normsList.forEach(norm => {
        if (norm.gender === gender || norm.gender === 'both') {
          normsMap.set(norm.test_id, norm)
        }
      })
      setNorms(normsMap)
      setSessions(sessionsRes.data ?? [])
    }

    // Fetch all sessions with their results
    await fetchSessionsWithResults(athlete.id)
    setViewMode('view_dashboard')
  }

  async function fetchSessionsWithResults(athleteId: string) {
    const sessionsRes = await supabase
      .from('fitness_test_sessions')
      .select('id, athlete_id, session, year, recorded_date, recorded_by, created_at')
      .eq('athlete_id', athleteId)
      .order('recorded_date', { ascending: false })

    const sessionsList = sessionsRes.data ?? []

    // Fetch all results in parallel instead of sequentially
    const resultsPromises = sessionsList.map(sess =>
      supabase
        .from('fitness_test_results')
        .select('id, test_id, result_value, rating, notes, test:test_id(test_name, unit)')
        .eq('session_id', sess.id)
    )

    const allResultsRes = await Promise.all(resultsPromises)

    const withResults: SessionWithResults[] = sessionsList.map((sess, idx) => {
      const resultsRes = allResultsRes[idx]
      const results = (resultsRes.data ?? []).map(r => ({
        id: r.id,
        test_id: r.test_id,
        result_value: r.result_value,
        rating: r.rating,
        notes: r.notes,
        test_name: (r.test as any)?.test_name || 'Test',
        unit: (r.test as any)?.unit || '',
      })) as SessionResult[]

      return { session: sess, results }
    })

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

  async function handleSave() {
    if (!selectedAthlete) return
    if (results.some(r => !r.result_value)) {
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

      await logAction(profile!.id, 'submit_fitness_tests', 'fitness_test_sessions', sessionData.id)

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
    'Bleep Test': { M: { good: '>2620', average: '1022-2600', poor: '<1020', unit: 'm' }, F: { good: '>2260', average: '820-2240', poor: '<800', unit: 'm' } },
    'Intermittent Recovery Test Level 2': { M: { good: '>21.6', average: '20.1-21.6', poor: '<20.1', unit: 'level' }, F: { good: '>21.1', average: '19.2-20.1', poor: '<19.2', unit: 'level' } },
    '24km Run Test': { M: { good: '<9m45s', average: '9m46s-14m', poor: '>14m01s', unit: 'minutes' }, F: { good: '<12m30s', average: '12m31s-18m30s', poor: '>18m31s', unit: 'minutes' } },
    'Alternate Hand Wall Toss': { both: { good: '>35', average: '16-34', poor: '<15', unit: 'reps' } },
    'Stock Balance Test': { both: { good: '>50', average: '25-49', poor: '<24', unit: 'seconds' } },
    'Cross Punch Power': { M: { good: '>9500', average: '1500-9500', poor: '<1500', unit: 'average' }, F: { good: '>7500', average: '1200-7500', poor: '<1200', unit: 'average' } },
    'Cross Punch Speed': { M: { good: '<0.50', average: '0.51-0.74', poor: '>0.75', unit: 'seconds' }, F: { good: '<0.65', average: '0.66-0.84', poor: '>0.85', unit: 'seconds' } },
    'Roundhouse Kick Speed': { M: { good: '<0.55', average: '0.56-0.78', poor: '>0.79', unit: 'seconds' }, F: { good: '<0.68', average: '0.69-0.86', poor: '>0.87', unit: 'seconds' } },
  }

  if (!canRecord) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#111]">Pencatatan Ujian Kecergasan</h2>
        {selectedAthlete && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#F56A00] text-white text-sm font-semibold rounded-lg hover:bg-[#D45A00] transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M9 12h6m-6 4h6M9 8h.01M15 8h.01M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z"/>
            </svg>
            Cetak
          </button>
        )}
      </div>

      {!selectedAthlete ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-[#111]">Pilih Atlet</p>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, No. IC atau sukan..."
                className="flex-1 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm outline-none transition focus:border-[#F56A00] focus:bg-white"
              />
              <select
                value={filterSport}
                onChange={e => setFilterSport(e.target.value)}
                className="bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm outline-none transition focus:border-[#F56A00] focus:bg-white min-w-[180px]"
              >
                <option value="">Semua Sukan</option>
                {sports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
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
                  const q = search.toLowerCase()
                  const filtered = athletes
                    .filter(a => !filterSport || a.sport?.name === filterSport)
                    .filter(a => !search || a.name.toLowerCase().includes(q) || a.ic_number?.toLowerCase().includes(q) || a.sport?.name?.toLowerCase().includes(q))
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
                        <td className="px-4 py-3 text-[#888]">{a.sport?.name}</td>
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
              <p className="text-xs text-[#888]">{selectedAthlete.sport?.name}</p>
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
            <div className="space-y-4" ref={chartRef}>
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
                    {/* Comparison Table - First */}
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
                                  <td className="px-4 py-3 font-semibold text-[#111]">{formatTestName(test.test_name)}</td>
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

                    {/* Test Selector */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4" data-html2canvas-ignore="true">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Pilih Ujian</label>
                      <select
                        value={currentTestId || ''}
                        onChange={e => setSelectedTestId(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                      >
                        {testsArray.map(test => (
                          <option key={test.test_id} value={test.test_id}>
                            {formatTestName(test.test_name)}
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
                              <p className="text-sm font-semibold text-[#111]">
                                {formatTestName(currentTest.test_name)} — {testHistory.length} Sesi
                              </p>
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
                                        className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t fitness-chart-bar"
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

                    {/* Record New Test Button */}
                    <button
                      onClick={() => setViewMode('record_tests')}
                      data-html2canvas-ignore="true"
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
                      {sportTests.length} ujian untuk {selectedAthlete.sport?.name}
                    </span>
                  </div>
                </div>
                {sessionsWithResults.some(s => s.session.session === session && s.session.year === year) && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-700">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    Ujian {session} {year} telah direkodkan. Sila pilih sesi atau tahun yang berbeza.
                  </div>
                )}
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
                                {norm && selectedAthletesGender && (
                                  <div className="text-[11px] text-[#888] bg-white rounded-lg border border-[#E8E8E8] p-2">
                                    <p className="font-semibold mb-1">Reference:</p>
                                    {(() => {
                                      const testName = (st.test as any)?.test_name
                                      const displayMap = normDisplayValues[testName]
                                      if (displayMap) {
                                        const display = displayMap[selectedAthletesGender] || displayMap['both']
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
                  onClick={() => handleSave()}
                  disabled={saving || results.every(r => !r.result_value) || sessionsWithResults.some(s => s.session.session === session && s.session.year === year)}
                  className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
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
                {can('fitness', 'update') && (
                  <button
                    onClick={() => {
                      setViewMode('record_tests')
                      if (viewedSession?.results) {
                        setResults(viewedSession.results.map(r => ({
                          test_id: r.test_id,
                          result_value: r.result_value,
                          notes: r.notes || undefined,
                          test_name: r.test_name,
                        })))
                      }
                      setSession(viewedSession!.session.session)
                      setYear(viewedSession!.session.year)
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Edit
                  </button>
                )}
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
                          <div className="flex-1 cursor-pointer" onClick={() => {
                            setViewedSession(sessionResult)
                            setViewMode('view_results')
                          }}>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#111]">{sessionResult.session.session} {sessionResult.session.year}</p>
                            </div>
                            <p className="text-xs text-[#888]">{new Date(sessionResult.session.recorded_date).toLocaleDateString('ms-MY')}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {sessionResult.results.length} ujian
                            </span>
                            {can('fitness', 'update') && (
                              <button
                                onClick={() => {
                                  setViewMode('record_tests')
                                  setResults(sessionResult.results.map(r => ({
                                    test_id: r.test_id,
                                    result_value: r.result_value,
                                    notes: r.notes || undefined,
                                    test_name: r.test_name,
                                  })))
                                  setSession(sessionResult.session.session)
                                  setYear(sessionResult.session.year)
                                }}
                                className="px-3 py-1 text-xs font-semibold text-[#F56A00] border border-[#F56A00] rounded hover:bg-[#F56A00] hover:text-white transition"
                              >
                                Edit
                              </button>
                            )}
                          </div>
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

      {/* (print view removed — PDF is now generated programmatically via jsPDF) */}
      <div style={{ display: 'none' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px', paddingBottom: '14px', borderBottom: '2px solid #f0f0f0' }}>
          <p style={{ fontSize: '11px', color: '#F56A00', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Laporan Ujian Kecergasan Fizikal</p>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111', margin: '0 0 4px 0' }}>{selectedAthlete?.name}</h1>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{selectedAthlete?.sport?.name} &nbsp;·&nbsp; {new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Comparison Table */}
        {allTestsForPrint.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Perbandingan Semua Ujian</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {['Ujian', 'Sesi Lepas', 'Sesi Terkini', 'Perubahan', 'Unit', 'Tahap'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Ujian' ? 'left' : 'right', fontSize: '11px', fontWeight: 700, color: '#555', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTestsForPrint.map(test => {
                  const hist = sessionsWithResults
                    .map(s => { const r = s.results.find(x => x.test_id === test.test_id); return r ? { session: s.session, result: r } : null })
                    .filter((x): x is { session: FitnessTestSession; result: SessionResult } => x !== null)
                    .reverse()
                  const latest = hist[hist.length - 1]?.result
                  const prev = hist[hist.length - 2]?.result
                  const change = latest && prev ? latest.result_value - prev.result_value : null
                  const rating = latest?.rating
                  return (
                    <tr key={test.test_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111' }}>{formatTestName(test.test_name)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#888' }}>{prev ? prev.result_value : '—'}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#111' }}>{latest ? latest.result_value : '—'}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: change === null ? '#888' : change > 0 ? '#16a34a' : change < 0 ? '#dc2626' : '#888' }}>
                        {change === null ? '—' : `${change > 0 ? '▲' : change < 0 ? '▼' : '—'} ${Math.abs(change).toFixed(2)}`}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#888' }}>{test.unit}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                        {rating && rating !== 'tidak_dinilai' ? (
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                            background: rating === 'baik' ? '#dcfce7' : rating === 'sederhana' ? '#fef9c3' : '#fee2e2',
                            color: rating === 'baik' ? '#16a34a' : rating === 'sederhana' ? '#ca8a04' : '#dc2626',
                          }}>
                            {rating === 'baik' ? 'BAIK' : rating === 'sederhana' ? 'SEDERHANA' : 'LEMAH'}
                          </span>
                        ) : <span style={{ color: '#ccc' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Per-test bar charts — 2 columns */}
        {allTestsForPrint.length > 0 && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Graf Perkembangan Ujian</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
              {allTestsForPrint.map((test, i) => {
                const hist = sessionsWithResults
                  .map(s => { const r = s.results.find(x => x.test_id === test.test_id); return r ? { session: s.session, result: r } : null })
                  .filter((x): x is { session: FitnessTestSession; result: SessionResult } => x !== null)
                  .reverse()
                if (hist.length === 0) return null
                const maxVal = Math.max(...hist.map(h => h.result.result_value)) * 1.1
                const CHART_H = 110
                const isLeft = i % 2 === 0
                return (
                  <div key={test.test_id} style={{ width: '50%', boxSizing: 'border-box', paddingRight: isLeft ? '8px' : '0', paddingLeft: isLeft ? '0' : '8px', marginBottom: '16px' }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '7px 12px' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#111' }}>
                          {formatTestName(test.test_name)}
                          <span style={{ fontWeight: 400, color: '#888', marginLeft: '6px' }}>({hist.length} sesi)</span>
                        </p>
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', height: `${CHART_H}px`, marginBottom: '6px' }}>
                          {hist.map((h, idx) => {
                            const barH = maxVal > 0 ? (h.result.result_value / maxVal) * CHART_H : 0
                            const isLatest = idx === hist.length - 1
                            return (
                              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: idx < hist.length - 1 ? '4px' : '0' }}>
                                <span style={{ fontSize: '10px', fontWeight: isLatest ? 700 : 400, color: isLatest ? '#111' : '#888', marginBottom: '3px' }}>{h.result.result_value}</span>
                                <div style={{ width: '100%', height: `${barH}px`, background: isLatest ? 'linear-gradient(to top, #f97316, #fdba74)' : 'linear-gradient(to top, #fb923c99, #fed7aa99)', borderRadius: '3px 3px 0 0' }} />
                              </div>
                            )
                          })}
                        </div>
                        <div style={{ display: 'flex', borderTop: '1px solid #f0f0f0', paddingTop: '4px' }}>
                          {hist.map((h, idx) => (
                            <span key={idx} style={{ flex: 1, fontSize: '10px', color: '#888', textAlign: 'center', marginRight: idx < hist.length - 1 ? '4px' : '0' }}>{h.session.session}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
