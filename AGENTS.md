# AGENTS.md

Сервис записи на звонок (упрощённый Cal.com): владелец создаёт типы событий (название, описание, длительность) и видит все предстоящие бронирования одним списком, гость выбирает тип события и бронирует свободный слот в ближайшие 14 дней. Без авторизации, личного кабинета и интеграций с внешними календарями.

Требования к поведению сервиса: `docs/requirements.md`.

## Команды

Запускай только через make:

- `make setup` — установить зависимости
- `make dev` — бекенд на :3000 и фронтенд на :5173 (Vite проксирует `/api` на бекенд)
- `make test` — тесты (Vitest)
- `make lint` / `make lint-fix` — oxlint и Prettier
- `make check` — lint + test + build; запускай перед каждым коммитом
- `make docker-build` / `make docker-run` — образ и запуск на :3000

## Структура

- `contract/` — контракт API на TypeSpec (`main.tsp`), из него собирается OpenAPI 3.0 в `contract/dist/openapi.json`. Новый эндпоинт начинается с правки контракта (ADR 0005).
- `backend/` — Fastify + TypeScript. `src/app.ts` собирает приложение (`buildApp`), `src/server.ts` только запускает его.
- `frontend/` — Vite + React + Mantine. Тесты рядом с кодом (`*.test.tsx`).
- npm workspaces: зависимости ставь в свой пакет (`npm install <pkg> -w backend`).
- `CLAUDE.md` содержит только `@AGENTS.md`. Всё, что нужно добавить в `CLAUDE.md` (в том числе по инструкции скилла), добавляй в `AGENTS.md`.

## Архитектура

- Backend: `routes/` (HTTP: валидация, вызов сервиса, ответ) → `services/` (бизнес-логика: слоты, бронирования) → `repositories/` (хранение данных). Маршруты не обращаются к хранилищу напрямую, только через сервисы.
- Frontend: компоненты не вызывают `fetch`, запросы к API идут только через функции из `frontend/src/api/`.
- В продакшене один контейнер: Fastify отдаёт API под `/api` и собранный фронтенд (`STATIC_DIR`). Все API-маршруты начинаются с `/api`.

## Образцы

- Маршрут: `backend/src/routes/health.ts`, его тест через `app.inject()`: `backend/src/routes/health.test.ts`.
- Запрос к API: `frontend/src/api/health.ts`.
- Тест компонента: `frontend/src/App.test.tsx` (обёртка `MantineProvider` и `MemoryRouter`; `fetch` подменяй через `vi.stubGlobal`).

## Как писать код

- Перед реализацией найди и обнови существующие типы, модели и helper-ы. Не создавай параллельные сущности.
- Не используй `any` и приведения `as`, чтобы заглушить ошибку типов: исправь исходный тип. Для фиксированных наборов значений используй union литералов.
- Делай только то, что просили: не переписывай и не «улучшай» соседний код. Рефакторинг не меняет поведение.
- Стек свежий, версии смотри в package.json. API библиотек сверяй с документацией этой версии, а не с памятью.
- Предпочитай популярные библиотеки и компоненты Mantine самописным решениям. Новые команды добавляй целью в Makefile.
- Комментарий объясняет, почему код написан именно так, а не что он делает.

## Баги и проверка

- Исправляй причину, а не следствие. Не прячь симптом через `?.`, try/catch, проверку на null или значение по умолчанию: найди, откуда пришли неверные данные.
- Баг: сначала тест, который его воспроизводит и падает, потом минимальная правка. Временные логи удали.
- Перед отчётом запусти `make check` и посмотри `git diff`: в нём только файлы, относящиеся к задаче.

## Git и безопасность

- Коммиты только по Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`, `build:`, `refactor:`. По ним release-please собирает версию и changelog.
- Коммит, который закрывает тикет, ссылается на него номером в конце заголовка: `feat: book a free slot (#49)`. GitHub делает из номера ссылку, и по истории видно, какой коммит какую задачу делал.
- PR, в котором несколько тикетов, сливай merge-коммитом, а не squash: squash склеит коммиты в один, и ссылки на тикеты пропадут из истории `main`.
- Работай в отдельной ветке, не в `main`. Коммит, push и merge PR делай только после явного одобрения пользователя: когда `make check` зелёный, предложи и дождись ответа.
- Без явной просьбы не выполняй деструктивные команды (`rm -rf`, `git reset --hard`, `git push --force`, `git clean`). Не коммить секреты и `.env`.
- Не редактируй `.github/workflows/hexlet-check.yml`: его генерирует Хекслет.
- Если видишь изменения, которые ты не делал, игнорируй их.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (pillboxru/ai-for-developers-project-386), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
