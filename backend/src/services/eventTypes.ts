import { randomUUID } from 'node:crypto'
import type {
  CreateEventType,
  EventType,
  PublicEventType,
  UpdateEventType,
} from '../generated/types.gen.js'
import type {
  EventTypeRecord,
  EventTypeRepository,
} from '../repositories/eventTypes.js'

export interface EventTypeServiceDeps {
  eventTypes: EventTypeRepository
}

export type CreateEventTypeResult =
  { kind: 'created'; eventType: EventType } | { kind: 'title_taken' }

export type UpdateEventTypeResult =
  | { kind: 'updated'; eventType: EventType }
  | { kind: 'not_found' }
  | { kind: 'title_taken' }

export type DeleteEventTypeResult = { kind: 'deleted' } | { kind: 'not_found' }

// Названия сравниваются без учёта регистра по правилам русского языка.
// Больше ничего не нормализуем: «ё» и «е» разные буквы, а схлопывание
// пробелов сделало бы одинаковыми названия, которые владелец видит разными
const titleKey = (title: string) => title.toLocaleLowerCase('ru')

// Гостю уходят только поля PublicEventType: схема ответа закрыта, и шаг
// слотов или признак скрытия в ответе были бы ошибкой контракта
export const toPublicEventType = ({
  id,
  title,
  description,
  durationMinutes,
}: EventTypeRecord): PublicEventType => ({
  id,
  title,
  description,
  durationMinutes,
})

export type EventTypeService = ReturnType<typeof createEventTypeService>

export function createEventTypeService({ eventTypes }: EventTypeServiceDeps) {
  // Бронирований пока нет: hasBookings начнёт считаться по ним вместе с
  // хранилищем бронирований
  const toEventType = (record: EventTypeRecord): EventType => ({
    ...record,
    hasBookings: false,
  })

  // Скрытые типы тоже участвуют: иначе вернуть скрытый тип гостям было бы
  // нельзя без переименования. Правка с собой не сравнивает (23.2): владелец
  // может сменить регистр в собственном названии
  const isTitleTaken = (title: string, exceptId?: string) => {
    const key = titleKey(title)
    return eventTypes
      .list()
      .some(
        (existing) =>
          existing.id !== exceptId && titleKey(existing.title) === key,
      )
  }

  return {
    // Все типы, включая скрытые, в порядке создания
    listAll: (): EventType[] => eventTypes.list().map(toEventType),

    // Видимые типы в порядке создания: то, из чего выбирает гость
    listVisible: (): PublicEventType[] =>
      eventTypes
        .list()
        .filter((record) => !record.hidden)
        .map(toPublicEventType),

    // Тип, на который гость может записаться. Скрытый для гостя не существует
    // (4.1): его страница, слоты и бронирование на него отвечают 404
    findVisible: (id: string): EventTypeRecord | undefined => {
      const record = eventTypes.get(id)
      return record && !record.hidden ? record : undefined
    },

    create: (input: CreateEventType): CreateEventTypeResult => {
      if (isTitleTaken(input.title)) {
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

    // Правка полной моделью (23.1): описания нет во вводе — его нет и у типа
    update: (id: string, input: UpdateEventType): UpdateEventTypeResult => {
      if (!eventTypes.get(id)) {
        return { kind: 'not_found' }
      }
      if (isTitleTaken(input.title, id)) {
        return { kind: 'title_taken' }
      }

      const record: EventTypeRecord = {
        id,
        title: input.title,
        description: input.description,
        durationMinutes: input.durationMinutes,
        slotStepMinutes: input.slotStepMinutes,
        hidden: input.hidden,
      }
      eventTypes.update(record)
      return { kind: 'updated', eventType: toEventType(record) }
    },

    delete: (id: string): DeleteEventTypeResult => {
      if (!eventTypes.get(id)) {
        return { kind: 'not_found' }
      }
      eventTypes.delete(id)
      return { kind: 'deleted' }
    },
  }
}
