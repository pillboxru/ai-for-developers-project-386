import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  handleGetEventType,
  handleGetOwner,
  handleListSlots,
} from '../api/generated/msw.gen.ts'
import type {
  ApiError,
  Owner,
  PublicEventType,
  Slot,
} from '../api/generated/types.gen.ts'
import { renderApp } from '../test/renderApp.tsx'
import { server } from '../test/server.ts'

const eventTypeId = '7b0c4c3e-8a43-4d5e-9d6a-2f1e0a7f0c11'

const eventType: PublicEventType = {
  id: eventTypeId,
  title: 'Консультация',
  description: 'Разберём код\nи архитектуру',
  durationMinutes: 30,
}

const owner: Owner = { name: 'Анна Смирнова', timeZone: 'Europe/Moscow' }

// Сегодня у владельца 25 октября: окно записи — с 00:00 25.10 до 00:00 08.11
// по Москве. Гость во Владивостоке (+7 ч к Москве) видит его с 07:00 25.10
// до 07:00 08.11, то есть даты 25 октября — 8 ноября
const today = new Date('2026-10-25T03:00:00Z')
const bookingWindow = {
  start: '2026-10-24T21:00:00Z',
  end: '2026-11-07T21:00:00Z',
}

function slot(start: string): Slot {
  const end = new Date(new Date(start).getTime() + 30 * 60_000)
  return { start, end: end.toISOString().replace('.000Z', 'Z') }
}

function serveScreen({
  ownerProfile = owner,
  slots = [],
}: { ownerProfile?: Owner; slots?: Slot[] } = {}) {
  server.use(
    handleGetEventType({ body: eventType }),
    handleGetOwner({ body: ownerProfile }),
    handleListSlots({ body: { bookingWindow, slots } }),
  )
}

beforeEach(() => {
  vi.setSystemTime(today)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('страница типа события', () => {
  it('в левой колонке владелец, тип события и пояс', async () => {
    serveScreen({ slots: [slot('2026-10-26T23:00:00Z')] })
    renderApp(`/book/${eventTypeId}`)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Консультация' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Анна Смирнова')).toBeInTheDocument()
    expect(screen.getByText('АС')).toBeInTheDocument()
    expect(screen.getByText('30 мин')).toBeInTheDocument()
    expect(screen.getByText(/^Разберём код/)).toHaveTextContent(
      'Разберём код и архитектуру',
    )
    expect(
      screen.getByText(
        'Время показано по вашему поясу: Asia/Vladivostok. Владелец работает по Europe/Moscow.',
      ),
    ).toBeInTheDocument()
  })

  it('пояса гостя и владельца совпадают — одна подпись пояса', async () => {
    serveScreen({
      ownerProfile: { ...owner, timeZone: 'Asia/Vladivostok' },
      slots: [slot('2026-10-26T23:00:00Z')],
    })
    renderApp(`/book/${eventTypeId}`)

    expect(
      await screen.findByText('Время указано по поясу Asia/Vladivostok'),
    ).toBeInTheDocument()
  })

  it('календарь в границах окна по поясу гостя, даты без слотов неактивны', async () => {
    serveScreen({
      slots: [
        // 27 октября 09:00 у гостя, а в UTC ещё 26-е
        slot('2026-10-26T23:00:00Z'),
        slot('2026-11-03T00:00:00Z'),
      ],
    })
    renderApp(`/book/${eventTypeId}`)

    const day = (name: string) => screen.getByRole('button', { name })
    expect(
      await screen.findByRole('button', { name: '27 октября 2026' }),
    ).toBePressed()
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent(/^пн$/i)
    expect(day('24 октября 2026')).toBeDisabled()
    expect(day('25 октября 2026')).toBeDisabled()
    expect(day('28 октября 2026')).toBeDisabled()
    expect(day('27 октября 2026')).toBeEnabled()
    expect(day('Предыдущий месяц')).toBeDisabled()

    fireEvent.click(day('Следующий месяц'))

    expect(day('3 ноября 2026')).toBeEnabled()
    expect(day('8 ноября 2026')).toBeDisabled()
    expect(day('9 ноября 2026')).toBeDisabled()
    expect(day('Следующий месяц')).toBeDisabled()
  })

  it('слоты дня по частям дня гостя, пустые группы скрыты', async () => {
    serveScreen({
      slots: [
        // Время у гостя: 09:00, 11:30, 12:00, 16:30, 17:00 27 октября
        slot('2026-10-26T23:00:00Z'),
        slot('2026-10-27T01:30:00Z'),
        slot('2026-10-27T02:00:00Z'),
        slot('2026-10-27T06:30:00Z'),
        slot('2026-10-27T07:00:00Z'),
        // 3 ноября 10:00 у гостя
        slot('2026-11-03T00:00:00Z'),
      ],
    })
    renderApp(`/book/${eventTypeId}`)

    const times = (part: string) =>
      within(screen.getByRole('group', { name: part }))
        .getAllByRole('button')
        .map((button) => button.textContent)
    expect(
      await screen.findByRole('heading', { name: 'вт, 27 октября' }),
    ).toBeInTheDocument()
    expect(times('Утро')).toEqual(['09:00', '11:30'])
    expect(times('День')).toEqual(['12:00', '16:30'])
    expect(times('Вечер')).toEqual(['17:00'])

    fireEvent.click(screen.getByRole('button', { name: 'Следующий месяц' }))
    fireEvent.click(screen.getByRole('button', { name: '3 ноября 2026' }))

    expect(
      screen.getByRole('heading', { name: 'вт, 3 ноября' }),
    ).toBeInTheDocument()
    expect(times('Утро')).toEqual(['10:00'])
    expect(screen.queryByRole('group', { name: 'День' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Вечер' })).toBeNull()
  })

  describe('выбранный слот в адресе', () => {
    const slots = [
      slot('2026-10-26T23:00:00Z'),
      slot('2026-10-27T01:30:00Z'),
      slot('2026-11-03T00:00:00Z'),
    ]
    const slotParam = (search: string) =>
      new URLSearchParams(search).get('slot')

    it('нажатие на слот пишет его начало в ?slot= и подсвечивает его', async () => {
      serveScreen({ slots })
      const { currentLocation } = renderApp(`/book/${eventTypeId}`)

      const button = await screen.findByRole('button', { name: '11:30' })
      expect(button).not.toBePressed()
      fireEvent.click(button)

      expect(slotParam(currentLocation().search)).toBe('2026-10-27T01:30:00Z')
      expect(screen.getByRole('button', { name: '11:30' })).toBePressed()
      expect(screen.getByRole('button', { name: '09:00' })).not.toBePressed()
    })

    it('со ?slot= выбрана дата этого слота', async () => {
      serveScreen({ slots })
      renderApp(`/book/${eventTypeId}?slot=2026-11-03T00:00:00Z`)

      expect(
        await screen.findByRole('button', { name: '3 ноября 2026' }),
      ).toBePressed()
      expect(
        screen.getByRole('heading', { name: 'вт, 3 ноября' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10:00' })).toBePressed()
    })

    it('?slot= не из списка слотов сбрасывается с предупреждением', async () => {
      serveScreen({ slots })
      const { currentLocation } = renderApp(
        `/book/${eventTypeId}?slot=2026-11-03T00:15:00Z`,
      )

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(
        'Это время уже недоступно. Выберите другое.',
      )
      await waitFor(() =>
        expect(slotParam(currentLocation().search)).toBeNull(),
      )
      expect(
        screen.getByRole('heading', { name: 'вт, 27 октября' }),
      ).toBeInTheDocument()

      fireEvent.click(within(alert).getByRole('button', { name: 'Закрыть' }))
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  it('без слотов в окне — пустое состояние, левая колонка остаётся', async () => {
    serveScreen({ slots: [] })
    renderApp(`/book/${eventTypeId}`)

    expect(
      await screen.findByRole('heading', {
        name: 'В ближайшие 14 дней свободного времени нет',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Выбрать другой тип события' }),
    ).toHaveAttribute('href', '/book')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Консультация' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Следующий месяц' })).toBeNull()
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
      server.use(
        handleGetEventType(() => HttpResponse.json(error, { status })),
        handleListSlots(() => HttpResponse.json(error, { status })),
        handleGetOwner({ body: owner }),
      )
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
      handleGetOwner({ body: owner }),
      handleListSlots({ body: { bookingWindow, slots: [] } }),
    )
    renderApp(`/book/${eventTypeId}`)

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByRole('button', { name: 'Повторить' }),
    ).toBeVisible()
    expect(screen.queryByText('Тип события не найден')).toBeNull()
  })
})
