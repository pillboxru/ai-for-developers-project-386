import { describe, expect, it } from 'vitest'
import { buildApp } from '../app.js'

async function createEventType(app: ReturnType<typeof buildApp>) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/owner/event-types',
    payload: consultation,
  })
  return response.json<{ id: string }>()
}

const consultation = {
  name: 'Консультация',
  description: 'Разбор вашего проекта',
  durationMinutes: 60,
}

describe('API типов событий', () => {
  it('владелец создаёт тип, гость видит его в списке', async () => {
    const app = buildApp()

    const created = await app.inject({
      method: 'POST',
      url: '/api/owner/event-types',
      payload: consultation,
    })
    expect(created.statusCode).toBe(201)
    expect(created.json()).toMatchObject({ ...consultation, hidden: false })

    const guestList = await app.inject({
      method: 'GET',
      url: '/api/event-types',
    })
    expect(guestList.statusCode).toBe(200)
    expect(guestList.json()).toEqual([created.json()])
  })

  it.each([
    ['пустое название', { ...consultation, name: '' }],
    ['название из пробелов', { ...consultation, name: '   ' }],
    ['без названия', { description: '', durationMinutes: 30 }],
    ['длительность не кратна 15', { ...consultation, durationMinutes: 20 }],
    ['длительность больше 240', { ...consultation, durationMinutes: 300 }],
    ['длительность меньше 15', { ...consultation, durationMinutes: 0 }],
  ])('отклоняет тип события: %s', async (_case, payload) => {
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/owner/event-types',
      payload,
    })

    expect(response.statusCode).toBe(400)
  })

  it('описание необязательно', async () => {
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/owner/event-types',
      payload: { name: 'Созвон', durationMinutes: 30 },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ description: '' })
  })

  it('скрытый тип видит только владелец', async () => {
    const app = buildApp()
    const { id } = await createEventType(app)

    const hidden = await app.inject({
      method: 'PATCH',
      url: `/api/owner/event-types/${id}`,
      payload: { hidden: true },
    })
    expect(hidden.statusCode).toBe(200)
    expect(hidden.json()).toMatchObject({ ...consultation, hidden: true })

    const ownerList = await app.inject({
      method: 'GET',
      url: '/api/owner/event-types',
    })
    expect(ownerList.json()).toEqual([hidden.json()])

    const guestList = await app.inject({
      method: 'GET',
      url: '/api/event-types',
    })
    expect(guestList.json()).toEqual([])
  })

  it('владелец удаляет тип', async () => {
    const app = buildApp()
    const { id } = await createEventType(app)

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/owner/event-types/${id}`,
    })
    expect(deleted.statusCode).toBe(204)

    const ownerList = await app.inject({
      method: 'GET',
      url: '/api/owner/event-types',
    })
    expect(ownerList.json()).toEqual([])
  })

  it('несуществующий тип: 404 при изменении и удалении', async () => {
    const app = buildApp()

    const patched = await app.inject({
      method: 'PATCH',
      url: '/api/owner/event-types/missing',
      payload: { hidden: true },
    })
    expect(patched.statusCode).toBe(404)

    const deleted = await app.inject({
      method: 'DELETE',
      url: '/api/owner/event-types/missing',
    })
    expect(deleted.statusCode).toBe(404)
  })

  it('владелец редактирует название, описание и длительность', async () => {
    const app = buildApp()
    const { id } = await createEventType(app)

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/owner/event-types/${id}`,
      payload: { name: 'Разбор кода', description: '', durationMinutes: 90 },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id,
      name: 'Разбор кода',
      description: '',
      durationMinutes: 90,
      hidden: false,
    })
  })

  it.each([
    ['пустое изменение', {}],
    ['название из пробелов', { name: ' ' }],
    ['длительность не кратна 15', { durationMinutes: 50 }],
  ])('отклоняет изменение: %s', async (_case, payload) => {
    const app = buildApp()
    const { id } = await createEventType(app)

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/owner/event-types/${id}`,
      payload,
    })

    expect(response.statusCode).toBe(400)
  })

  it('id и посторонние поля из тела запроса не попадают в тип', async () => {
    const app = buildApp()
    const existing = await createEventType(app)

    const created = await app.inject({
      method: 'POST',
      url: '/api/owner/event-types',
      payload: { ...consultation, id: existing.id, extra: 1 },
    })
    await app.inject({
      method: 'PATCH',
      url: `/api/owner/event-types/${existing.id}`,
      payload: { name: 'Разбор кода', id: 'forged', extra: 1 },
    })

    const ownerList = await app.inject({
      method: 'GET',
      url: '/api/owner/event-types',
    })
    const ids = ownerList.json<{ id: string }[]>().map(({ id }) => id)
    expect(ids).toEqual([existing.id, created.json<{ id: string }>().id])
    expect(ids[1]).not.toBe(existing.id)
    expect(ownerList.json()[0]).toEqual({
      ...consultation,
      id: existing.id,
      name: 'Разбор кода',
      hidden: false,
    })
  })
})
