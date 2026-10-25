import { randomUUID } from 'node:crypto'
import type { CreateEventType, EventType } from '../generated/types.gen.js'
import type {
  EventTypeRecord,
  EventTypeRepository,
} from '../repositories/eventTypes.js'

export interface EventTypeServiceDeps {
  eventTypes: EventTypeRepository
}

export type CreateEventTypeResult =
  { kind: 'created'; eventType: EventType } | { kind: 'title_taken' }

// Названия сравниваются без учёта регистра по правилам русского языка.
// Больше ничего не нормализуем: «ё» и «е» разные буквы, а схлопывание
// пробелов сделало бы одинаковыми названия, которые владелец видит разными
const titleKey = (title: string) => title.toLocaleLowerCase('ru')

export type EventTypeService = ReturnType<typeof createEventTypeService>

export function createEventTypeService({ eventTypes }: EventTypeServiceDeps) {
  // Бронирований пока нет: hasBookings начнёт считаться по ним вместе с
  // хранилищем бронирований
  const toEventType = (record: EventTypeRecord): EventType => ({
    ...record,
    hasBookings: false,
  })

  return {
    // Все типы, включая скрытые, в порядке создания
    listAll: (): EventType[] => eventTypes.list().map(toEventType),

    // Скрытый тип для гостя не существует, как и тип с неизвестным id
    findVisible: (id: string): EventType | undefined => {
      const record = eventTypes.get(id)
      return record && !record.hidden ? toEventType(record) : undefined
    },

    create: (input: CreateEventType): CreateEventTypeResult => {
      // Скрытые типы тоже участвуют: иначе вернуть скрытый тип гостям было
      // бы нельзя без переименования
      const key = titleKey(input.title)
      if (
        eventTypes.list().some((existing) => titleKey(existing.title) === key)
      ) {
        return { kind: 'title_taken' }
      }

      const record: EventTypeRecord = {
        // id выдаёт сервер, клиент его не присылает (ADR 0003)
        id: randomUUID(),
        title: input.title,
        description: input.description,
        durationMinutes: input.durationMinutes,
        slotStepMinutes: input.slotStepMinutes,
        hidden: input.hidden,
      }
      eventTypes.insert(record)
      return { kind: 'created', eventType: toEventType(record) }
    },
  }
}
