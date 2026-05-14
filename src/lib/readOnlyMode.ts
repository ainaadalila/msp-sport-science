// Read-only mode utility for client review

export const isReadOnlyMode = (): boolean => {
  const mode = import.meta.env.VITE_READ_ONLY_MODE
  console.log('[ReadOnly] VITE_READ_ONLY_MODE =', mode, 'type:', typeof mode)
  return mode === 'true' || mode === true
}
