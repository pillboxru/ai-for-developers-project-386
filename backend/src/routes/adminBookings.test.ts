import { describe, expect, it } from 'vitest'
import type {
  Booking,
  CreateBooking,
  CreateEventType,
} from '../generated/types.gen.js'
import { buildTestApp, testNow } from '../test/buildTestApp.js'

type TestApp = ReturnType<typeof buildTestApp>

const consultation: CreateEventType = {
  title: 'Консультация',
  durationMinutes: 30,
  slotStepMinutes: 30,
  hidden: false,
}

async function createEventType(
  app: TestApp,
  overrides: Partial<CreateEventType> = {},
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/event-types',
    payload: { ...consultation, ...overrides } satisfies CreateEventType,
  })
  return response.json<{ id: string }>().id
}

async function book(app: TestApp, eventTypeId: string, input: CreateBooking) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/event-types/${eventTypeId}/bookings`,
    payload: input,
  })
  expect(response.statusCode).toBe(201)
}

async function listBookings(app: TestApp) {
  const response = await app.inject({
    method: 'GET',
    url: '/api/admin/bookings',
  })
  expect(response.statusCode).toBe(200)
  return response.json<Booking[]>()
}

const guest = { name: 'Иван Петров', email: 'ivan@example.com' }

describe('GET /api/admin/bookings', () => {
  it('без бронирований — пустой список', async () => {
    const app = buildTestApp()

    expect(await listBookings(app)).toEqual([])
  })

  it('бронирования всех типов, включая скрытые, по началу, а не по созданию', async () => {
    const app = buildTestApp()
    const consultationId = await createEventType(app)
    const reviewId = await createEventType(app, {
      title: 'Разбор',
      durationMinutes: 60,
      slotStepMinutes: 60,
    })
    // Сейчас понедельник 2 ноября, 09:00 по Москве
    await book(app, reviewId, {
      start: '2026-11-04T08:00:00Z',
      name: 'Мария',
      email: 'maria@example.com',
      comment: 'Про сроки\nи бюджет',
    })
    await book(app, consultationId, { start: '2026-11-03T07:00:00Z', ...guest })
    // Скрытый тип убран из выбора гостя, но его бронирования остаются
    await app.inject({
      method: 'PUT',
      url: `/api/admin/event-types/${reviewId}`,
      payload: {
        ...consultation,
        title: 'Разбор',
        durationMinutes: 60,
        slotStepMinutes: 60,
        hidden: true,
      },
    })

    expect(await listBookings(app)).toEqual([
      {
        id: expect.any(String),
        eventType: { id: consultationId, title: 'Консультация', hidden: false },
        start: '2026-11-03T07:00:00Z',
        end: '2026-11-03T07:30:00Z',
        name: 'Иван Петров',
        email: 'ivan@example.com',
        cancelled: false,
      },
      {
        id: expect.any(String),
        eventType: { id: reviewId, title: 'Разбор', hidden: true },
        start: '2026-11-04T08:00:00Z',
        end: '2026-11-04T09:00:00Z',
        name: 'Мария',
        email: 'maria@example.com',
        comment: 'Про сроки\nи бюджет',
        cancelled: false,
      },
    ])
  })

  it('идущий звонок в списке, закончившийся — нет', async () => {
    let now = testNow
    const app = buildTestApp({ now: () => now })
    const eventTypeId = await createEventType(app)
    // Вторник 3 ноября, 10:00–10:30 по Москве
    await book(app, eventTypeId, { start: '2026-11-03T07:00:00Z', ...guest })

    now = new Date('2026-11-03T07:29:59Z')
    expect(await listBookings(app)).toHaveLength(1)

    // Конец не входит: в 10:30 звонок уже закончился
    now = new Date('2026-11-03T07:30:00Z')
    expect(await listBookings(app)).toEqual([])
  })
})
