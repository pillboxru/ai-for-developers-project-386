import type { Booking, Uuid } from '../generated/types.gen.js'

// Бронирование хранит тип ссылкой и не копирует длительность: конец
// считается по типу (ADR 0002). Pick, а не Omit: у моделей контракта есть
// индексная сигнатура, и Omit по ней теряет все именованные поля
export type BookingRecord = Pick<
  Booking,
  'id' | 'start' | 'name' | 'email' | 'comment' | 'cancelled'
> & { eventTypeId: Uuid }

export interface BookingRepository {
  // В порядке создания
  list(): BookingRecord[]
  insert(record: BookingRecord): void
}

// Хранилище в памяти процесса (ADR 0001)
export function createBookingRepository(): BookingRepository {
  const records: BookingRecord[] = []

  return {
    list: () => [...records],
    insert: (record) => {
      records.push(record)
    },
  }
}
