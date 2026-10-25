import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHealth } from './health.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchHealth', () => {
  it('запрашивает /api/health у того же сервера через SDK', async () => {
    const fetchMock = vi.fn<(request: Request) => Promise<Response>>(async () =>
      Response.json({ status: 'ok' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchHealth()).resolves.toEqual({ status: 'ok' })
    expect(fetchMock.mock.calls[0][0].url).toBe(`${location.origin}/api/health`)
  })
})
