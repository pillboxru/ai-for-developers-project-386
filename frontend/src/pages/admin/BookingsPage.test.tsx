import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  handleGetOwner,
  handleListBookings,
} from '../../api/generated/msw.gen.ts'
import type { Booking } from '../../api/generated/types.gen.ts'
import { renderApp } from '../../test/renderApp.tsx'
import { server } from '../../test/server.ts'

// Владелец в Москве, браузер во Владивостоке (+7 ч). Сейчас 19:00 25 октября
// по Москве — у браузера уже 02:00 26 октября: дни считаются по владельцу
const now = new Date('2026-10-25T16:00:00Z')

const consultation = {
  id: '7b0c4c3e-8a43-4d5e-9d6a-2f1e0a7f0c11',
  title: 'Консультация',
  hidden: false,
}

function booking(
  start: string,
  end: string,
  overrides: Partial<Booking> = {},
): Booking {
  return {
    id: crypto.randomUUID(),
    eventType: consultation,
    start,
    end,
    name: 'Иван Петров',
    email: 'ivan@example.com',
    cancelled: false,
    ...overrides,
  }
}

function serveBookings(bookings: Booking[]) {
  server.use(
    handleGetOwner({
      body: { name: 'Анна Смирнова', timeZone: 'Europe/Moscow' },
    }),
    handleListBookings({ body: bookings }),
  )
}

// Заголовки групп и время карточек (заголовок карточки) по порядку
function groups() {
  return screen.getAllByRole('region').map((region) => ({
    day: within(region).getByRole('heading', { level: 2 }).textContent,
    times: within(region)
      .getAllByRole('article')
      .map((card) => within(card).getByRole('heading').textContent),
  }))
}

beforeEach(() => {
  vi.setSystemTime(now)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('предстоящие бронирования владельца', () => {
  it('без бронирований показывает пустое состояние', async () => {
    serveBookings([])
    renderApp('/admin/bookings')

    expect(
      await screen.findByRole('heading', {
        name: 'Предстоящих бронирований нет',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Здесь появятся бронирования гостей.'),
    ).toBeInTheDocument()
  })

  it('группирует по дням владельца: «Сегодня», «Завтра», дальше дата', async () => {
    serveBookings([
      // 20:00–20:30 25 октября по Москве, у браузера уже 26-е
      booking('2026-10-25T17:00:00Z', '2026-10-25T17:30:00Z'),
      // Через полночь: 23:30 26 октября — 00:30 27-го, день начала
      booking('2026-10-26T20:30:00Z', '2026-10-26T21:30:00Z'),
      booking('2026-10-30T07:00:00Z', '2026-10-30T07:30:00Z'),
      booking('2026-10-30T09:00:00Z', '2026-10-30T10:00:00Z'),
    ])
    renderApp('/admin/bookings')

    await screen.findByRole('region', { name: 'Сегодня' })
    expect(groups()).toEqual([
      { day: 'Сегодня', times: ['20:00–20:30'] },
      { day: 'Завтра', times: ['23:30–00:30'] },
      { day: 'пт, 30 октября', times: ['10:00–10:30', '12:00–13:00'] },
    ])
    expect(
      screen.getByText('Время указано по поясу Europe/Moscow'),
    ).toBeInTheDocument()
  })

  it('карточка: тип с пометкой «Скрыт», гость, email ссылкой, комментарий с переносами', async () => {
    serveBookings([
      booking('2026-10-26T07:00:00Z', '2026-10-26T08:00:00Z', {
        eventType: { id: crypto.randomUUID(), title: 'Разбор', hidden: true },
        name: 'Мария Иванова',
        email: 'maria@example.com',
        comment: 'Про сроки\nи бюджет',
      }),
    ])
    renderApp('/admin/bookings')

    const card = within(await screen.findByRole('article'))
    expect(card.getByRole('heading')).toHaveTextContent('10:00–11:00')
    expect(card.getByText('Разбор')).toBeInTheDocument()
    expect(card.getByText('Скрыт')).toBeInTheDocument()
    expect(card.getByText('Мария Иванова')).toBeInTheDocument()
    expect(
      card.getByRole('link', { name: 'maria@example.com' }),
    ).toHaveAttribute('href', 'mailto:maria@example.com')
    const comment = card.getByText('Про сроки и бюджет')
    expect(comment.textContent).toBe('Про сроки\nи бюджет')
    expect(comment).toHaveStyle({ whiteSpace: 'pre-line' })
  })

  it('у видимого типа нет пометки «Скрыт»', async () => {
    serveBookings([booking('2026-10-26T07:00:00Z', '2026-10-26T07:30:00Z')])
    renderApp('/admin/bookings')

    const card = within(await screen.findByRole('article'))
    expect(card.getByText('Консультация')).toBeInTheDocument()
    expect(card.queryByText('Скрыт')).not.toBeInTheDocument()
  })

  it('идущий сейчас звонок помечен «Идёт сейчас», следующий — нет', async () => {
    serveBookings([
      // 18:30–19:30 по Москве, сейчас 19:00
      booking('2026-10-25T15:30:00Z', '2026-10-25T16:30:00Z', {
        name: 'Идущий',
      }),
      // Начинается ровно сейчас: тоже идёт
      booking('2026-10-25T16:00:00Z', '2026-10-25T16:15:00Z', {
        name: 'Только начался',
      }),
      booking('2026-10-25T17:00:00Z', '2026-10-25T17:30:00Z', {
        name: 'Следующий',
      }),
    ])
    renderApp('/admin/bookings')

    const cards = await screen.findAllByRole('article')
    expect(
      cards.map((card) => within(card).queryByText('Идёт сейчас') !== null),
    ).toEqual([true, true, false])
  })
})
