import { randomUUID } from 'node:crypto'

export interface EventType {
  id: string
  name: string
  description: string
  durationMinutes: number
  hidden: boolean
}

export type EventTypeFields = Omit<EventType, 'id'>

// Хранение в памяти процесса: см. docs/adr/0001-in-memory-storage.md
export class EventTypeRepository {
  private readonly items = new Map<string, EventType>()

  list(): EventType[] {
    return [...this.items.values()]
  }

  create(fields: EventTypeFields): EventType {
    const eventType = { id: randomUUID(), ...fields }
    this.items.set(eventType.id, eventType)
    return eventType
  }

  update(id: string, changes: Partial<EventTypeFields>): EventType | undefined {
    const current = this.items.get(id)
    if (!current) {
      return undefined
    }
    const updated = { ...current, ...changes }
    this.items.set(id, updated)
    return updated
  }

  delete(id: string): boolean {
    return this.items.delete(id)
  }
}
