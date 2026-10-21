export interface HealthStatus {
  status: 'ok'
}

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await fetch('/api/health')
  if (!response.ok) {
    throw new Error(`GET /api/health failed: ${response.status}`)
  }
  return response.json()
}
