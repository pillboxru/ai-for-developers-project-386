// ПРОТОТИП для тикета «Экран выбора слота гостем». Моковые данные в памяти,
// в main не попадает: живёт в ветке prototype/guest-slot-picker.

export interface Owner {
  name: string
  timeZone: string
}

export interface EventType {
  id: string
  title: string
  description: string
  durationMinutes: number
  slotStepMinutes: number
}

export interface Slot {
  start: string
  end: string
}

export const owner: Owner = { name: 'Анна Смирнова', timeZone: 'Europe/Moscow' }

export const eventTypes: EventType[] = [
  {
    id: 'intro',
    title: 'Знакомство',
    description: 'Короткий звонок, чтобы познакомиться и обсудить задачу.',
    durationMinutes: 30,
    slotStepMinutes: 30,
  },
  {
    id: 'consult',
    title: 'Консультация',
    description: 'Разбираем один конкретный вопрос: код, архитектуру или план.',
    durationMinutes: 60,
    slotStepMinutes: 30,
  },
  {
    id: 'review',
    title: 'Разбор проекта',
    description: 'Подробный разбор проекта с экраном и записью рекомендаций.',
    durationMinutes: 120,
    slotStepMinutes: 60,
  },
]

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
// В Москве нет перехода на летнее время, поэтому моку хватает постоянного смещения
const OWNER_OFFSET = 3 * HOUR
const WINDOW_DAYS = 14
const MINIMUM_NOTICE = HOUR

// Минуты от полуночи по часам владельца
type Interval = [number, number]

const weeklySchedule: Record<number, Interval[]> = {
  0: [],
  1: [
    [600, 780],
    [840, 1080],
  ],
  2: [[600, 1080]],
  3: [[600, 1080]],
  4: [[600, 1080]],
  5: [[600, 960]],
  6: [[660, 840]],
}

function availability(dayIndex: number, weekday: number): Interval[] {
  // Исключения: дата закрыта целиком и дата с вечерними часами
  if (dayIndex === 3) return []
  if (dayIndex === 8) return [[840, 1320]]
  return weeklySchedule[weekday]
}

function bookings(dayIndex: number): Interval[] {
  const result: Interval[] = []
  if (dayIndex % 3 === 0) result.push([720, 780])
  if (dayIndex % 2 === 1) result.push([900, 930])
  if (dayIndex === 1) result.push([600, 720])
  return result
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().replace('.000Z', 'Z')
}

export function bookingWindow(now: number): { start: number; end: number } {
  const ownerNow = new Date(now + OWNER_OFFSET)
  const start =
    Date.UTC(
      ownerNow.getUTCFullYear(),
      ownerNow.getUTCMonth(),
      ownerNow.getUTCDate(),
    ) - OWNER_OFFSET
  return { start, end: start + WINDOW_DAYS * DAY }
}

export function computeSlots(eventType: EventType, now: number): Slot[] {
  const { start: windowStart } = bookingWindow(now)
  const slots: Slot[] = []
  for (let dayIndex = 0; dayIndex < WINDOW_DAYS; dayIndex++) {
    const dayStart = windowStart + dayIndex * DAY
    const weekday = new Date(dayStart + OWNER_OFFSET).getUTCDay()
    const busy = bookings(dayIndex)
    for (const [from, to] of availability(dayIndex, weekday)) {
      for (
        let minute = from;
        minute + eventType.durationMinutes <= to;
        minute += eventType.slotStepMinutes
      ) {
        const end = minute + eventType.durationMinutes
        if (
          busy.some(([busyFrom, busyTo]) => minute < busyTo && busyFrom < end)
        )
          continue
        const startMs = dayStart + minute * MINUTE
        if (startMs < now + MINIMUM_NOTICE) continue
        slots.push({
          start: toIso(startMs),
          end: toIso(dayStart + end * MINUTE),
        })
      }
    }
  }
  return slots
}

export function dateKey(instant: string | number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant))
}

function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}

// Даты от первой до последней, на которые в поясе гостя выпадает хотя бы момент окна
export function guestDates(now: number, timeZone: string): string[] {
  const { start, end } = bookingWindow(now)
  const last = dateKey(end - 1, timeZone)
  const dates: string[] = []
  for (let key = dateKey(start, timeZone); key <= last; key = addDays(key, 1))
    dates.push(key)
  return dates
}

export function groupByDate(
  slots: Slot[],
  timeZone: string,
): Map<string, Slot[]> {
  const groups = new Map<string, Slot[]>()
  for (const slot of slots) {
    const key = dateKey(slot.start, timeZone)
    groups.set(key, [...(groups.get(key) ?? []), slot])
  }
  return groups
}

export function formatTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instant))
}

export function hourOf(instant: string, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(instant)),
  )
}

function keyToDate(key: string): Date {
  return new Date(`${key}T12:00:00Z`)
}

export function formatDay(key: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(keyToDate(key))
}

export function formatDayParts(key: string): {
  weekday: string
  day: string
  month: string
} {
  const date = keyToDate(key)
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', ...options }).format(
      date,
    )
  return {
    weekday: part({ weekday: 'short' }),
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }),
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`
}

const slotPlural = new Intl.PluralRules('ru-RU')
const slotWords: Record<string, string> = {
  one: 'слот',
  few: 'слота',
  many: 'слотов',
  other: 'слота',
}

export function slotCount(count: number): string {
  return `${count} ${slotWords[slotPlural.select(count)]}`
}
