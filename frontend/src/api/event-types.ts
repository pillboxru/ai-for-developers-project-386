export interface EventType {
  id: string
  name: string
  description: string
  durationMinutes: number
  hidden: boolean
}

// Новый тип всегда создаётся видимым
export type NewEventType = Omit<EventType, 'id' | 'hidden'>

export type EventTypeChanges = Partial<Omit<EventType, 'id'>>

export async function fetchEventTypes(): Promise<EventType[]> {
  const response = await request('GET', '/api/event-types')
  return response.json()
}

export async function fetchOwnerEventTypes(): Promise<EventType[]> {
  const response = await request('GET', '/api/owner/event-types')
  return response.json()
}

export async function createEventType(
  fields: NewEventType,
): Promise<EventType> {
  const response = await request('POST', '/api/owner/event-types', fields)
  return response.json()
}

export async function updateEventType(
  id: string,
  changes: EventTypeChanges,
): Promise<EventType> {
  const response = await request(
    'PATCH',
    `/api/owner/event-types/${id}`,
    changes,
  )
  return response.json()
}

export async function deleteEventType(id: string): Promise<void> {
  await request('DELETE', `/api/owner/event-types/${id}`)
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function request(
  method: HttpMethod,
  url: string,
  body?: object,
): Promise<Response> {
  const response = await fetch(url, requestInit(method, body))
  if (!response.ok) {
    throw new Error(`${method} ${url} failed: ${response.status}`)
  }
  return response
}

function requestInit(method: HttpMethod, body?: object): RequestInit {
  if (body === undefined) {
    return { method }
  }
  // Fastify отклоняет Content-Type: application/json с пустым телом,
  // поэтому заголовок ставим, только когда тело есть
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
