// Read-only mode utility for client review

export const isReadOnlyMode = (): boolean => {
  return import.meta.env.VITE_READ_ONLY_MODE === 'true'
}
