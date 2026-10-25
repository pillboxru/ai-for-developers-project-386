import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import openapiGlue from 'fastify-openapi-glue'
import responseValidation from '@fastify/response-validation'
import ajvFormats from 'ajv-formats'
import { apiErrorHandler, sendNotFound } from './errors.js'
import { healthHandlers } from './routes/health.js'
import { ownerHandlers } from './routes/owner.js'

// Собранный контракт лежит на том же расстоянии от src/ и от dist/, а в
// Docker-образ копируется по тому же пути
const specification = fileURLToPath(
  new URL('../../contract/dist/openapi.json', import.meta.url),
)

export interface AppOptions {
  // Папка с собранным фронтендом. В продакшене бекенд раздаёт его сам.
  staticDir?: string
  logger?: boolean
  // Часы приходят снаружи, чтобы тесты фиксировали время без фейковых таймеров
  now: () => Date
  ownerName: string
  // IANA-имя пояса, по которому считаются окно записи и слоты
  ownerTimeZone: string
  // Сверять ответы с контрактом. Включают тесты маршрутов: проверка
  // замедляет каждый ответ, поэтому в продакшене она выключена
  validateResponses?: boolean
}

// Intl знает базу IANA из ICU и бросает RangeError на неизвестное имя.
// Проверяем при сборке, чтобы сервер с опечаткой в поясе не стартовал,
// а не считал слоты неизвестно по каким часам
function assertTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    throw new Error(
      `Неизвестный часовой пояс владельца «${timeZone}»: нужно IANA-имя, например Europe/Moscow`,
    )
  }
}

export function buildApp({
  staticDir,
  logger = false,
  ownerName,
  ownerTimeZone,
  validateResponses = false,
}: AppOptions) {
  assertTimeZone(ownerTimeZone)

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

  // Регистрируется до glue: плагин навешивает проверку в хуке onRoute и
  // видит только маршруты, добавленные после него
  if (validateResponses) {
    app.register(responseValidation, {
      ajv: {
        // Настройки по умолчанию у плагина правят ответ (удаляют лишние поля,
        // подставляют default) и этим прячут расхождение с контрактом
        removeAdditional: false,
        useDefaults: false,
        coerceTypes: false,
        allErrors: true,
        strictTypes: false,
        // ajv-formats — CommonJS: в ESM импорт по умолчанию отдаёт весь
        // module.exports, а функция плагина лежит в его поле default
        plugins: [ajvFormats.default],
      },
    })
  }

  app.register(openapiGlue, {
    specification,
    serviceHandlers: {
      ...healthHandlers,
      ...ownerHandlers({ name: ownerName, timeZone: ownerTimeZone }),
    },
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
