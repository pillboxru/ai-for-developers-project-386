import type { EventType } from '../generated/types.gen.js'

// hasBookings не хранится: это производное от бронирований, его считает
// сервис. Pick, а не Omit: у моделей контракта есть индексная сигнатура,
// и Omit по ней теряет все именованные поля
export type EventTypeRecord = Pick<
  EventType,
  | 'id'
  | 'title'
  | 'description'
  | 'durationMinutes'
  | 'slotStepMinutes'
  | 'hidden'
>

export interface EventTypeRepository {
  // В порядке создания
  list(): EventTypeRecord[]
  insert(record: EventTypeRecord): void
}

// Хранилище в памяти процесса (ADR 0001). Map обходится в порядке вставки,
// это и есть порядок создания
export function createEventTypeRepository(): EventTypeRepository {
  const records = new Map<string, EventTypeRecord>()

  return {
    list: () => [...records.values()],
    insert: (record) => {
      records.set(record.id, record)
    },
  }
}
