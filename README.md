# Календарь звонков

[![hexlet-check](https://github.com/pillboxru/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/pillboxru/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- Бекенд: [Fastify](https://fastify.dev/) + TypeScript
- Фронтенд: [Vite](https://vite.dev/) + React + [Mantine](https://mantine.dev/)
- Тесты: [Vitest](https://vitest.dev/), линтер: [oxlint](https://oxc.rs/) + [Prettier](https://prettier.io/)
- Сборка и запуск: npm workspaces, GNU Make, Docker
- CI: GitHub Actions, релизы: [release-please](https://github.com/googleapis/release-please)

## Установка

Нужны Node.js 24, GNU Make и Docker. На Windows make ставится через [Scoop](https://scoop.sh/): `scoop install make`.

```bash
git clone https://github.com/pillboxru/ai-for-developers-project-386.git
cd ai-for-developers-project-386
make setup
```

## Использование

```bash
make dev      # бекенд на http://localhost:3000, фронтенд на http://localhost:5173
make check    # линтер, тесты и сборка
```

Запуск в Docker (приложение откроется на http://localhost:3000):

```bash
make docker-build
make docker-run
```

Порт задаётся переменной окружения `PORT` (по умолчанию `3000`).

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
