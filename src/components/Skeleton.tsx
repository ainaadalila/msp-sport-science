export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  className = '',
}: {
  width?: string | number
  height?: number
  radius?: number
  className?: string
}) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  )
}

export function AthletesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-3">
            <Skeleton width="60%" height={10} />
            <Skeleton width="40%" height={28} radius={4} />
            <Skeleton width="75%" height={10} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex gap-8">
          {['30%', '15%', '8%', '12%', '15%', '10%'].map((w, i) => (
            <Skeleton key={i} width={w} height={10} />
          ))}
        </div>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="px-5 py-3.5 border-b border-gray-50 last:border-0 flex items-center gap-4">
            <Skeleton width={32} height={32} radius={9999} className="shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton width="45%" height={12} />
              <Skeleton width="30%" height={10} />
            </div>
            <Skeleton width="60px" height={10} />
            <Skeleton width="50px" height={10} />
            <Skeleton width="55px" height={22} radius={9999} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-3">
            <Skeleton width="60%" height={10} />
            <Skeleton width="50%" height={32} radius={4} />
            <Skeleton width="75%" height={10} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex gap-8">
          {['25%', '20%', '15%', '12%', '18%', '10%'].map((w, i) => (
            <Skeleton key={i} width={w} height={10} />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="px-5 py-3.5 border-b border-gray-50 last:border-0 flex gap-4">
            {[0, 1, 2, 3, 4, 5].map(j => (
              <Skeleton key={j} width="20%" height={12} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
