import { screen, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { handleGetEventType } from '../api/generated/msw.gen.ts'
import type { ApiError } from '../api/generated/types.gen.ts'
import { renderApp } from '../test/renderApp.tsx'
import { server } from '../test/server.ts'

const eventTypeId = '7b0c4c3e-8a43-4d5e-9d6a-2f1e0a7f0c11'

describe('страница типа события', () => {
  it('показывает название типа', async () => {
    server.use(
      handleGetEventType({
        body: { id: eventTypeId, title: 'Консультация', durationMinutes: 30 },
      }),
    )
    renderApp(`/book/${eventTypeId}`)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Консультация' }),
    ).toBeInTheDocument()
  })

  it.each<[string, string, number, ApiError]>([
    [
      'скрытый или несуществующий тип (404)',
      eventTypeId,
      404,
      { code: 'not_found', message: 'Не найдено' },
    ],
    [
      'id не UUID (400)',
      'not-a-uuid',
      400,
      { code: 'validation_error', message: 'Неверный адрес запроса' },
    ],
  ])(
    '%s: «Тип события не найден» со ссылкой на список',
    async (_case, id, status, error) => {
      server.use(handleGetEventType(() => HttpResponse.json(error, { status })))
      renderApp(`/book/${id}`)

      const main = within(screen.getByRole('main'))
      expect(
        await main.findByRole('heading', { name: 'Тип события не найден' }),
      ).toBeInTheDocument()
      expect(main.queryByRole('alert')).toBeNull()
      expect(
        main.getByRole('link', { name: 'К списку типов событий' }),
      ).toHaveAttribute('href', '/book')
    },
  )

  it('сбой сервера — ошибка загрузки с «Повторить», а не «не найден»', async () => {
    server.use(
      handleGetEventType(() =>
        HttpResponse.json<ApiError>(
          { code: 'internal_error', message: 'Внутренняя ошибка сервера' },
          { status: 500 },
        ),
      ),
    )
    renderApp(`/book/${eventTypeId}`)

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByRole('button', { name: 'Повторить' }),
    ).toBeVisible()
    expect(screen.queryByText('Тип события не найден')).toBeNull()
  })
})
