import { useState } from 'react'
import type { AttendanceSummary } from '../../lib/attendanceSummary'

export function AttendanceSummaryTable({ summary }: { summary: AttendanceSummary }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (summary.total === 0) {
    return <div className="py-12 text-center text-sm text-[#888]">Tiada rekod kehadiran untuk penapis yang dipilih.</div>
  }

  const toggle = (sport: string) => setCollapsed(prev => {
    const next = new Set(prev)
    if (next.has(sport)) next.delete(sport); else next.add(sport)
    return next
  })
  const allCollapsed = collapsed.size === summary.sports.length

  // Zeros left blank, like an Excel pivot, so the real counts stand out
  const cell = (n: number | undefined) => (n ? n : '')
  const numCls = 'px-4 py-2 text-right tabular-nums'

  return (
    <div className="overflow-x-auto">
      <div className="px-5 py-2 border-b border-gray-100 flex justify-end no-print">
        <button
          onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(summary.sports.map(s => s.sport)))}
          className="text-xs text-[#F56A00] hover:underline font-semibold"
        >
          {allCollapsed ? 'Kembangkan semua' : 'Kecilkan semua'}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">Sukan / Atlet</th>
            {summary.columns.map(c => (
              <th key={c} className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3 whitespace-nowrap">{c}</th>
            ))}
            <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {summary.sports.map(s => {
            const isCollapsed = collapsed.has(s.sport)
            return [
              <tr key={s.sport} className="border-b border-gray-100 bg-orange-50/50 font-semibold text-[#111]">
                <td className="px-4 py-2">
                  <button onClick={() => toggle(s.sport)} className="inline-flex items-center gap-2 hover:text-[#F56A00]">
                    <span className="inline-flex w-4 h-4 items-center justify-center border border-gray-300 rounded text-[10px] leading-none text-[#888]">
                      {isCollapsed ? '+' : '−'}
                    </span>
                    {s.sport}
                  </button>
                </td>
                {summary.columns.map(c => <td key={c} className={numCls}>{cell(s.counts[c])}</td>)}
                <td className={numCls}>{s.total}</td>
              </tr>,
              ...(isCollapsed ? [] : s.athletes.map(a => (
                <tr key={`${s.sport}|${a.name}`} className="border-b border-gray-50 text-[#444] hover:bg-gray-50">
                  <td className="pl-12 pr-4 py-2">{a.name}</td>
                  {summary.columns.map(c => <td key={c} className={numCls}>{cell(a.counts[c])}</td>)}
                  <td className={numCls}>{a.total}</td>
                </tr>
              ))),
            ]
          })}
          <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-[#111]">
            <td className="px-4 py-3">JUMLAH KESELURUHAN</td>
            {summary.columns.map(c => <td key={c} className={numCls}>{cell(summary.counts[c])}</td>)}
            <td className={numCls}>{summary.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
