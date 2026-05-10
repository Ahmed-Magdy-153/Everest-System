// Stub — wire to auth store when backend is ready
export function usePermissions() {
  return { can: (_action: string, _resource: string) => true }
}
