import { describe, expect, it } from 'vitest'
import type { CreateEventType } from '../generated/types.gen.js'
import { createBookingRepository } from '../repositories/bookings.js'
import { createEventTypeRepository } from '../repositories/eventTypes.js'
import { createScheduleRepository } from '../repositories/schedule.js'
import { createBookingService } from './bookings.js'
import { createEventTypeService } from './eventTypes.js'
import { createSlotService } from './slots.js'

// Сервисы с общим хранилищем, как в buildApp. Понедельник 2 ноября, 09:00
// по Москве; расписание по умолчанию пн–пт 9:00–18:00
function services() {
  const eventTypes = createEventTypeRepository()
  const bookings = createBookingRepository()
  const eventTypeService = createEventTypeService({ eventTypes })
  const now = () => new Date('2026-11-02T06:00:00Z')
  const slotService = createSlotService({
    schedule: createScheduleRepository(),
    bookings,
    eventTypes,
    now,
    timeZone: 'Europe/Moscow',
  })
  const bookingService = createBookingService({
    bookings,
    eventTypes,
    eventTypeService,
    slotService,
    now,
  })
  return { eventTypeService, slotService, bookingService }
}

describe('смена шага слотов', () => {
  it('существующее бронирование остаётся, даже если не попадает на новую сетку', () => {
    const { eventTypeService, slotService, bookingService } = services()
    const input: CreateEventType = {
      title: 'Консультация',
      durationMinutes: 30,
      slotStepMinutes: 30,
      hidden: false,
    }
    const created = eventTypeService.create(input)
    if (created.kind !== 'created') {
      throw new Error('тип события не создан')
    }
    const { id } = created.eventType
    // Вторник 3 ноября, 10:00–10:30 по Москве
    const booked = bookingService.create(id, {
      start: '2026-11-03T07:00:00Z',
      name: 'Иван Петров',
      email: 'ivan@example.com',
    })
    expect(booked.kind).toBe('created')

    // Новая сетка вторника: 9:00, 9:45, 10:30… — 10:00 на неё не попадает
    const updated = eventTypeService.update(id, {
      ...input,
      slotStepMinutes: 45,
    })
    expect(updated.kind).toBe('updated')

    const starts = slotService
      .listSlots({ durationMinutes: 30, slotStepMinutes: 45 })
      .slots.map((slot) => slot.start)
    // 9:45–10:15 пересекается с бронированием, значит оно на месте
    expect(starts).not.toContain('2026-11-03T06:45:00Z')
    expect(starts).toContain('2026-11-03T06:00:00Z')
    expect(starts).toContain('2026-11-03T07:30:00Z')
  })
})
