import type {
  EventType,
  EventTypeFields,
  EventTypeRepository,
} from '../repositories/event-types.js'

// Новый тип всегда создаётся видимым
export type NewEventType = Omit<EventTypeFields, 'hidden'>

export type EventTypeChanges = Partial<EventTypeFields>

export class EventTypeNotFoundError extends Error {
  constructor(id: string) {
    super(`Тип события ${id} не найден`)
    this.name = 'EventTypeNotFoundError'
  }
}

export class EventTypeService {
  constructor(private readonly repository: EventTypeRepository) {}

  listAll(): EventType[] {
    return this.repository.list()
  }

  listVisible(): EventType[] {
    return this.repository.list().filter((eventType) => !eventType.hidden)
  }

  create(fields: NewEventType): EventType {
    return this.repository.create({ ...fields, hidden: false })
  }

  update(id: string, changes: EventTypeChanges): EventType {
    const updated = this.repository.update(id, changes)
    if (!updated) {
      throw new EventTypeNotFoundError(id)
    }
    return updated
  }

  delete(id: string): void {
    if (!this.repository.delete(id)) {
      throw new EventTypeNotFoundError(id)
    }
  }
}
