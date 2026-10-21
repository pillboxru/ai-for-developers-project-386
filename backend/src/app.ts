import { existsSync } from 'node:fs'
import path from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { healthRoutes } from './routes/health.js'

export interface AppOptions {
  // Папка с собранным фронтендом. В продакшене бекенд раздаёт его сам.
  staticDir?: string
  logger?: boolean
}

export function buildApp({ staticDir, logger = false }: AppOptions = {}) {
  const app = Fastify({ logger })

  app.register(healthRoutes, { prefix: '/api' })

  if (staticDir && existsSync(staticDir)) {
    app.register(fastifyStatic, { root: path.resolve(staticDir) })

    // SPA-fallback: любые GET-пути вне /api отдают index.html
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api')) {
        return reply.sendFile('index.html')
      }
      return reply.code(404).send({ error: 'Not Found' })
    })
  }

  return app
}
