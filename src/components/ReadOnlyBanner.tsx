import { isReadOnlyMode } from '../lib/readOnlyMode'

export function ReadOnlyBanner() {
  if (!isReadOnlyMode()) return null

  return (
    <div className="mb-4 px-4 py-3 bg-yellow-50 border-l-4 border-yellow-400 rounded text-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <div>
          <p className="font-semibold text-yellow-800">Review Mode (Read-Only)</p>
          <p className="text-yellow-700 text-xs mt-0.5">You can view all information but cannot submit changes. Contact admin to make edits.</p>
        </div>
      </div>
    </div>
  )
}
