import { describe, expect, it } from 'vitest'
import type { CreateEventType } from '../generated/types.gen.js'
import { buildTestApp } from '../test/buildTestApp.js'

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function eventTypeInput(overrides: Partial<CreateEventType> = {}) {
  return {
    title: 'Консультация',
    durationMinutes: 30,
    slotStepMinutes: 30,
    hidden: false,
    ...overrides,
  } satisfies CreateEventType
}

describe('GET /api/admin/event-types', () => {
  it('на старте приложения типов нет', async () => {
    const app = buildTestApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/event-types',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([])
  })

  it('отдаёт все типы, включая скрытые, в порядке создания', async () => {
    const app = buildTestApp()
    for (const input of [
      eventTypeInput({ title: 'Знакомство' }),
      eventTypeInput({ title: 'Разбор', hidden: true }),
      eventTypeInput({ title: 'Консультация' }),
    ]) {
      await app.inject({
        method: 'POST',
        url: '/api/admin/event-types',
        payload: input,
      })
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/event-types',
    })

    expect(response.statusCode).toBe(200)
    expect(
      response.json().map((eventType: { title: string }) => eventType.title),
    ).toEqual(['Знакомство', 'Разбор', 'Консультация'])
    expect(response.json()[1]).toMatchObject({
      hidden: true,
      hasBookings: false,
    })
  })
})

describe('POST /api/admin/event-types', () => {
  it('создаёт тип с серверным UUID', async () => {
    const app = buildTestApp()
    const input = eventTypeInput({
      description: 'Обсудим задачу\nи сроки',
      durationMinutes: 90,
      slotStepMinutes: 15,
      hidden: true,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/event-types',
      payload: input,
    })

    expect(response.statusCode).toBe(201)
    const created = response.json()
    expect(created).toEqual({
      ...input,
      id: expect.stringMatching(uuid),
      hasBookings: false,
    })
  })

  it('id у каждого типа свой', async () => {
    const app = buildTestApp()
    const create = (title: string) =>
      app.inject({
        method: 'POST',
        url: '/api/admin/event-types',
        payload: eventTypeInput({ title }),
      })

    const first = (await create('Знакомство')).json()
    const second = (await create('Разбор')).json()

    expect(first.id).not.toBe(second.id)
  })

  it.each([
    ['id', { id: '7b0c4c3e-8a43-4d5e-9d6a-2f1e0a7f0c11' }],
    ['hasBookings', { hasBookings: false }],
    ['color', { color: 'red' }],
  ])('присланное поле %s даёт 400 «Неизвестное поле»', async (field, extra) => {
    const app = buildTestApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/event-types',
      payload: { ...eventTypeInput(), ...extra },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      code: 'validation_error',
      fieldErrors: [{ field, message: 'Неизвестное поле' }],
    })
  })

  it.each([
    ['durationMinutes', 20],
    ['durationMinutes', 255],
    ['slotStepMinutes', 0],
  ])('%s = %i вне 15…240 с шагом 15 даёт 400 у поля', async (field, value) => {
    const app = buildTestApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/event-types',
      payload: { ...eventTypeInput(), [field]: value },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      code: 'validation_error',
      fieldErrors: [{ field, message: 'Недопустимое значение' }],
    })
  })
})

describe('уникальность названия', () => {
  async function createTitles(titles: string[]) {
    const app = buildTestApp()
    const responses = []
    for (const title of titles) {
      responses.push(
        await app.inject({
          method: 'POST',
          url: '/api/admin/event-types',
          payload: eventTypeInput({ title }),
        }),
      )
    }
    return { app, last: responses[responses.length - 1] }
  }

  it.each([
    ['то же название', 'Консультация', 'Консультация'],
    ['другой регистр', 'Консультация', 'КОНСУЛЬТАЦИЯ'],
    ['регистр «Ё»', 'Ёлка', 'ёлка'],
  ])('%s даёт 409 event_type_title_taken', async (_case, first, second) => {
    const { app, last } = await createTitles([first, second])

    expect(last.statusCode).toBe(409)
    expect(last.json()).toEqual({
      code: 'event_type_title_taken',
      message: 'Тип события с таким названием уже есть',
      fieldErrors: [
        { field: 'title', message: 'Тип события с таким названием уже есть' },
      ],
    })
    const list = await app.inject({
      method: 'GET',
      url: '/api/admin/event-types',
    })
    expect(list.json()).toHaveLength(1)
  })

  it('со скрытым типом название тоже не повторяется', async () => {
    const app = buildTestApp()
    await app.inject({
      method: 'POST',
      url: '/api/admin/event-types',
      payload: eventTypeInput({ title: 'Разбор', hidden: true }),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/event-types',
      payload: eventTypeInput({ title: 'разбор' }),
    })

    expect(response.statusCode).toBe(409)
  })

  it.each([
    ['«ё» и «е»', 'Ёлка', 'Елка'],
    ['пробелы внутри не схлопываются', 'Разбор кода', 'Разбор  кода'],
  ])('%s различаются', async (_case, first, second) => {
    const { last } = await createTitles([first, second])

    expect(last.statusCode).toBe(201)
  })
})
