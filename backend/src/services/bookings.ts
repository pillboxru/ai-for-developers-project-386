import { randomUUID } from 'node:crypto'
import { Temporal } from 'temporal-polyfill'
import type { Booking, CreateBooking } from '../generated/types.gen.js'
import type {
  BookingRecord,
  BookingRepository,
} from '../repositories/bookings.js'
import type { EventTypeRecord } from '../repositories/eventTypes.js'
import type { EventTypeService } from './eventTypes.js'
import type { SlotService } from './slots.js'

export interface BookingServiceDeps {
  bookings: BookingRepository
  eventTypeService: EventTypeService
  slotService: SlotService
}

export type CreateBookingResult =
  | { kind: 'created'; booking: Booking }
  | { kind: 'not_found' }
  | { kind: 'slot_unavailable' }

// Конец не хранится: начало плюс длительность типа (ADR 0002)
export function toBooking(
  record: BookingRecord,
  eventType: EventTypeRecord,
): Booking {
  return {
    id: record.id,
    eventType: {
      id: eventType.id,
      title: eventType.title,
      hidden: eventType.hidden,
    },
    start: record.start,
    end: Temporal.Instant.from(record.start)
      .add({ minutes: eventType.durationMinutes })
      .toString(),
    name: record.name,
    email: record.email,
    comment: record.comment,
    cancelled: record.cancelled,
  }
}

export type BookingService = ReturnType<typeof createBookingService>

export function createBookingService({
  bookings,
  eventTypeService,
  slotService,
}: BookingServiceDeps) {
  return {
    // Принимается только начало одного из слотов, которые та же функция
    // вычисляет сейчас. Причину отказа гостю не различаем (14.1): занято,
    // прошёл запас, закрыто владельцем или не на сетке — исход один
    create: (
      eventTypeId: string,
      input: CreateBooking,
    ): CreateBookingResult => {
      const eventType = eventTypeService.findVisible(eventTypeId)
      if (!eventType) {
        return { kind: 'not_found' }
      }
      // Сравниваются моменты, а не строки: гость может прислать то же время
      // со смещением или миллисекундами
      const start = Temporal.Instant.from(input.start)
      const slot = slotService
        .listSlots(eventType)
        .slots.find((candidate) =>
          Temporal.Instant.from(candidate.start).equals(start),
        )
      if (!slot) {
        return { kind: 'slot_unavailable' }
      }

      const record: BookingRecord = {
        id: randomUUID(),
        eventTypeId: eventType.id,
        // В записи слота: моменты в UTC с Z, как в списке слотов
        start: slot.start,
        name: input.name,
        email: input.email,
        comment: input.comment,
        cancelled: false,
      }
      bookings.insert(record)
      return { kind: 'created', booking: toBooking(record, eventType) }
    },
  }
}
