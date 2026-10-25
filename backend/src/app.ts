import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import openapiGlue from 'fastify-openapi-glue'
import { apiErrorHandler, sendNotFound } from './errors.js'
import { healthHandlers } from './routes/health.js'

// Собранный контракт лежит на том же расстоянии от src/ и от dist/, а в
// Docker-образ копируется по тому же пути
const specification = fileURLToPath(
  new URL('../../contract/dist/openapi.json', import.meta.url),
)

export interface AppOptions {
  // Папка с собранным фронтендом. В продакшене бекенд раздаёт его сам.
  staticDir?: string
  logger?: boolean
}

export function buildApp({ staticDir, logger = false }: AppOptions = {}) {
  const app = Fastify({
    logger,
    ajv: {
      // Лишнее поле должно давать 400, а не молча удаляться, и форма
      // показывает ошибки всех полей сразу
      customOptions: {
        removeAdditional: false,
        allErrors: true,
        // TypeSpec выносит строковый скаляр в allOf, а maxLength оставляет
        // рядом без type: схема верна, но Ajv засоряет лог предупреждениями
        strictTypes: false,
      },
    },
  })

  app.setErrorHandler(apiErrorHandler)

  app.register(openapiGlue, {
    specification,
    serviceHandlers: { ...healthHandlers },
  })

  if (staticDir && existsSync(staticDir)) {
    app.register(fastifyStatic, { root: path.resolve(staticDir) })

    // SPA-fallback: любые GET-пути вне /api отдают index.html
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api')) {
        return reply.sendFile('index.html')
      }
      return sendNotFound(reply)
    })
  } else {
    app.setNotFoundHandler((_request, reply) => sendNotFound(reply))
  }

  return app
}
