import { Temporal } from 'temporal-polyfill'
import type {
  Booking,
  EventType,
  Slot,
  SlotList,
  TimeOfDay,
  WeeklySchedule,
} from '../generated/types.gen.js'
import type { BookingRepository } from '../repositories/bookings.js'
import type { EventTypeRepository } from '../repositories/eventTypes.js'
import type {
  ScheduleRecord,
  ScheduleRepository,
} from '../repositories/schedule.js'
import { toBooking } from './bookings.js'

export interface SlotInput {
  eventType: Pick<EventType, 'durationMinutes' | 'slotStepMinutes'>
  // Доступное время: расписание с исключениями
  availability: ScheduleRecord
  bookings: Pick<Booking, 'start' | 'end' | 'cancelled'>[]
  now: Date
  // IANA-имя пояса владельца
  timeZone: string
}

const windowDays = 14
// Минимальный запас: гостю нужен хотя бы час до начала звонка
const minimumNotice = { hours: 1 }

type Weekday = keyof Pick<
  WeeklySchedule,
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
>

// Индекс — dayOfWeek из Temporal минус один: 1 — понедельник, 7 — воскресенье
const weekdays: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

interface Piece {
  start: Temporal.PlainDateTime
  end: Temporal.PlainDateTime
}

// 24:00 — конец дня, то есть 00:00 следующей даты
function atTime(date: Temporal.PlainDate, time: TimeOfDay) {
  return time === '24:00'
    ? date.add({ days: 1 }).toPlainDateTime()
    : date.toPlainDateTime(Temporal.PlainTime.from(time))
}

// Доступное время по часам владельца: куски от даты from до даты to
// включительно
function availablePieces(
  { weekly, overrides }: ScheduleRecord,
  from: Temporal.PlainDate,
  to: Temporal.PlainDate,
): Piece[] {
  const overrideRanges = new Map(
    overrides.map((override) => [override.date, override.ranges]),
  )
  const pieces: Piece[] = []
  for (
    let date = from;
    Temporal.PlainDate.compare(date, to) <= 0;
    date = date.add({ days: 1 })
  ) {
    // Исключение заменяет расписание на дату целиком, пустое закрывает её
    const ranges =
      overrideRanges.get(date.toString()) ??
      weekly[weekdays[date.dayOfWeek - 1]]
    for (const range of ranges) {
      const start = atTime(date, range.start)
      const end = atTime(date, range.end)
      // Промежутки одного дня не соприкасаются, поэтому стык бывает только
      // в полночь: 24:00 одной даты и 00:00 следующей — один кусок
      const last = pieces.at(-1)
      if (last && last.end.equals(start)) {
        last.end = end
      } else {
        pieces.push({ start, end })
      }
    }
  }
  return pieces
}

export function computeSlots({
  eventType,
  availability,
  bookings,
  now,
  timeZone,
}: SlotInput): SlotList {
  const nowInstant = Temporal.Instant.fromEpochMilliseconds(now.getTime())
  const earliestStart = nowInstant.add(minimumNotice)
  const today = nowInstant.toZonedDateTimeISO(timeZone).toPlainDate()
  // PlainDate.toZonedDateTime без времени даёт начало дня, а не 00:00: в
  // некоторых поясах переход на летнее время выпадает на полночь, и 00:00
  // в этот день не существует
  const windowStart = today.toZonedDateTime(timeZone)
  const windowEnd = today.add({ days: windowDays }).toZonedDateTime(timeZone)

  // Бронирования любых типов; отменённые время не занимают
  const busy = bookings
    .filter((booking) => !booking.cancelled)
    .map((booking) => ({
      start: Temporal.Instant.from(booking.start),
      end: Temporal.Instant.from(booking.end),
    }))

  const duration = { minutes: eventType.durationMinutes }
  const step = { minutes: eventType.slotStepMinutes }
  const slots: Slot[] = []
  // С предыдущей даты: кусок, начатый до окна записи, задаёт сетку и в
  // первый день окна. Слоты до начала окна отсечёт минимальный запас.
  // По последнюю дату окна: её куски кончаются не позже 00:00 следующей
  // даты, то есть конца окна, и слот за окно не выйдет
  for (const piece of availablePieces(
    availability,
    today.subtract({ days: 1 }),
    today.add({ days: windowDays - 1 }),
  )) {
    // Сетка строится по часам владельца: владелец задаёт расписание в них,
    // и переход на летнее время не должен сдвигать начала слотов
    for (
      let start = piece.start;
      Temporal.PlainDateTime.compare(start.add(duration), piece.end) <= 0;
      start = start.add(step)
    ) {
      // Время из повторяющегося часа при переводе назад берётся по первому
      // смещению (disambiguation 'compatible' по умолчанию)
      const zonedStart = start.toZonedDateTime(timeZone)
      const zonedEnd = zonedStart.add(duration)
      // При переводе вперёд часы на стене уходят дальше, чем прошло времени.
      // Такой слот начинается в несуществующем часе или пересекает его
      if (
        Temporal.PlainDateTime.compare(
          zonedEnd.toPlainDateTime(),
          start.add(duration),
        ) > 0
      ) {
        continue
      }
      const slotStart = zonedStart.toInstant()
      const slotEnd = zonedEnd.toInstant()
      // Полуоткрытые промежутки: бронирования могут стоять впритык
      const overlapsBooking = busy.some(
        (booking) =>
          Temporal.Instant.compare(slotStart, booking.end) < 0 &&
          Temporal.Instant.compare(booking.start, slotEnd) < 0,
      )
      if (
        Temporal.Instant.compare(slotStart, earliestStart) < 0 ||
        overlapsBooking
      ) {
        continue
      }
      slots.push({ start: slotStart.toString(), end: slotEnd.toString() })
    }
  }

  return {
    bookingWindow: {
      start: windowStart.toInstant().toString(),
      end: windowEnd.toInstant().toString(),
    },
    slots,
  }
}

export interface SlotServiceDeps {
  schedule: ScheduleRepository
  bookings: BookingRepository
  // Конец бронирования считается по длительности его типа (ADR 0002)
  eventTypes: EventTypeRepository
  now: () => Date
  timeZone: string
}

export type SlotService = ReturnType<typeof createSlotService>

export function createSlotService({
  schedule,
  bookings,
  eventTypes,
  now,
  timeZone,
}: SlotServiceDeps) {
  // Бронирования всех типов: неотменённые не пересекаются, даже если у них
  // разные типы событий
  const allBookings = () =>
    bookings.list().map((record) => {
      const eventType = eventTypes.get(record.eventTypeId)
      // Тип с бронированиями не удаляется: без него конец бронирования не из
      // чего вычислить (ADR 0002)
      if (!eventType) {
        throw new Error(
          `Бронирование ${record.id} ссылается на несуществующий тип события ${record.eventTypeId}`,
        )
      }
      return toBooking(record, eventType)
    })

  return {
    listSlots: (eventType: SlotInput['eventType']): SlotList =>
      computeSlots({
        eventType,
        availability: schedule.get(),
        bookings: allBookings(),
        now: now(),
        timeZone,
      }),
  }
}
