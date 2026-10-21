import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

describe('app', () => {
  it('раздаёт фронтенд из staticDir', async () => {
    const staticDir = mkdtempSync(path.join(tmpdir(), 'static-'))
    writeFileSync(path.join(staticDir, 'index.html'), '<div id="root"></div>')
    const app = buildApp({ staticDir })

    const root = await app.inject({ method: 'GET', url: '/' })
    expect(root.statusCode).toBe(200)
    expect(root.body).toContain('<div id="root">')

    const spaRoute = await app.inject({ method: 'GET', url: '/bookings' })
    expect(spaRoute.statusCode).toBe(200)
    expect(spaRoute.body).toContain('<div id="root">')

    const unknownApi = await app.inject({ method: 'GET', url: '/api/unknown' })
    expect(unknownApi.statusCode).toBe(404)
  })
})
