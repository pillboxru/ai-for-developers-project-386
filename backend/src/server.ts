import { buildApp } from './app.js'

const app = buildApp({ staticDir: process.env.STATIC_DIR, logger: true })
const port = Number(process.env.PORT ?? 3000)

try {
  // 0.0.0.0, чтобы сервер был доступен снаружи Docker-контейнера
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
