# AGENTS.md

Сервис записи на звонок (упрощённый Cal.com): гость выбирает свободный слот по 30 минут, владелец видит список встреч. Без авторизации.

## Команды

Запускай только через make:

- `make setup` — установить зависимости
- `make dev` — бекенд на :3000 и фронтенд на :5173 (Vite проксирует `/api` на бекенд)
- `make test` — тесты (Vitest)
- `make lint` / `make lint-fix` — oxlint и Prettier
- `make check` — lint + test + build; запускай перед каждым коммитом
- `make docker-build` / `make docker-run` — образ и запуск на :3000

## Структура

- `backend/` — Fastify + TypeScript. `src/app.ts` собирает приложение (`buildApp`), `src/server.ts` только запускает его. Тесты через `app.inject()`.
- `frontend/` — Vite + React + Mantine. Тесты рядом с компонентами (`*.test.tsx`).
- npm workspaces: зависимости ставь в свой пакет (`npm install <pkg> -w backend`).

## Правила

- В продакшене один контейнер: Fastify отдаёт API под `/api` и собранный фронтенд (`STATIC_DIR`). Все API-маршруты начинаются с `/api`.
- Коммиты только по Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`, `build:`, `refactor:`. По ним release-please собирает версию и changelog.
- Не редактируй `.github/workflows/hexlet-check.yml`: его генерирует Хекслет.
- Исправляй причину, а не следствие.
- Если видишь изменения, которые ты не делал, игнорируй их.
