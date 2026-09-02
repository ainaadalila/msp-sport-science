import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
import type { FitnessTestDefinition, SportFitnessTest } from '../../../types'

interface CategoryGroup {
  category: string
  tests: FitnessTestDefinition[]
}

export default function FitnessTestConfigPage() {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const isAdmin = can('fitness_config', 'create')

  const [sports, setSports] = useState<string[]>([])
  const [selectedSport, setSelectedSport] = useState('')
  const [definitions, setDefinitions] = useState<FitnessTestDefinition[]>([])
  const [sportTests, setSportTests] = useState<SportFitnessTest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isAdmin) return
    fetchData()
  }, [isAdmin])

  async function fetchData() {
    setLoading(true)
    try {
      const [defsRes, sportsRes] = await Promise.all([
        supabase.from('fitness_test_definitions').select('id, test_name, category, unit, description, created_at').order('category').order('test_name'),
        supabase.from('sports').select('name').order('name'),
      ])

      console.log('Definitions fetched:', defsRes.data?.length)
      const defs = defsRes.data ?? []
      setDefinitions(defs)

      // Initialize all categories as collapsed
      const categories = [...new Set(defs.map(d => d.category))]
      const expandedState: Record<string, boolean> = {}
      categories.forEach(cat => {
        expandedState[cat] = false
      })
      setExpandedCategories(expandedState)

      const sportNames = (sportsRes.data ?? []).map(s => s.name).filter(Boolean)
      setSports(sportNames)

      if (sportNames && sportNames.length > 0) {
        setSelectedSport(sportNames[0])
        await fetchSportTests(sportNames[0])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    }
    setLoading(false)
  }

  async function fetchSportTests(sport: string) {
    const res = await supabase
      .from('sport_fitness_tests')
      .select('id, sport, test_id, is_mandatory, test:fitness_test_definitions(id, test_name, category, unit, description)')
      .eq('sport', sport)
    setSportTests((res.data ?? []) as unknown as SportFitnessTest[])
  }

  async function toggleTest(testId: string, isAdded: boolean) {
    if (isAdded && !can('fitness_config', 'delete')) return
    if (!isAdded && !can('fitness_config', 'create')) return

    setSaving(true)
    setError(null)
    if (isAdded) {
      const { error } = await supabase.from('sport_fitness_tests').delete().eq('sport', selectedSport).eq('test_id', testId)
      if (error) setError(`Gagal membuang ujian: ${error.message}`)
      else fetchSportTests(selectedSport)
    } else {
      const { error } = await supabase.from('sport_fitness_tests').insert({
        sport: selectedSport,
        test_id: testId,
        is_mandatory: false,
        created_by: profile?.id,
      })
      if (error) setError(`Gagal menambah ujian: ${error.message}`)
      else fetchSportTests(selectedSport)
    }
    setSaving(false)
  }

  function toggleCategory(category: string) {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
  }

  const selectedTests = new Set(sportTests.map(st => st.test_id))
  const grouped = definitions.reduce((acc, def) => {
    const group = acc.find(g => g.category === def.category)
    if (group) group.tests.push(def)
    else acc.push({ category: def.category, tests: [def] })
    return acc
  }, [] as CategoryGroup[])

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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Pilih Sukan</label>
        <select
          value={selectedSport}
          onChange={e => {
            setSelectedSport(e.target.value)
            fetchSportTests(e.target.value)
          }}
          className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
        >
          {sports.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="text-[12px] text-[#888] mt-2">
          {sportTests.length} ujian dipilih untuk {selectedSport}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Categories and Tests */}
        <div className="col-span-2 space-y-2">
          {grouped.map(group => {
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
                  <div className="p-4 space-y-2">
                    {group.tests.length === 0 ? (
                      <p className="text-sm text-[#888] py-4">Tiada ujian dalam kategori ini</p>
                    ) : (
                      group.tests.map(test => {
                        const isAdded = selectedTests.has(test.id)
                        return (
                          <div key={test.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isAdded}
                                onChange={() => toggleTest(test.id, isAdded)}
                                disabled={saving}
                                className="w-4 h-4 rounded cursor-pointer"
                              />
                              <span className="text-sm text-[#111]">{test.test_name}</span>
                              <span className="text-[11px] text-[#888]">({test.unit})</span>
                            </label>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Selected Tests List */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit sticky top-6">
          <p className="text-sm font-bold text-[#111] mb-3">UJIAN DIPILIH ({sportTests.length})</p>
          {sportTests.length === 0 ? (
            <p className="text-[12px] text-[#888] italic">Tiada ujian dipilih</p>
          ) : (
            <div className="space-y-2">
              {definitions
                .filter(def => selectedTests.has(def.id))
                .sort((a, b) => a.test_name.localeCompare(b.test_name))
                .map(test => (
                  <div key={test.id} className="text-[12px] text-[#111] p-2 bg-gray-50 rounded border border-gray-200">
                    <p className="font-semibold">{test.test_name}</p>
                    <p className="text-[11px] text-[#888]">{test.unit}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
