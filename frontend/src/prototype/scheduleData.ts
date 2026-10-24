// ПРОТОТИП редактора расписания: данные и вычисления в памяти, без API.
// Пояс владельца в прототипе совпадает с поясом браузера, чтобы не тащить
// пересчёт поясов: вопрос прототипа про поведение редактора, а не про пояса.

export const CELL_MINUTES = 30
export const CELLS_PER_DAY = (24 * 60) / CELL_MINUTES

export const weekdayShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const weekdayLong = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]
export const weekdayAccusativePlural = [
  'понедельники',
  'вторники',
  'среды',
  'четверги',
  'пятницы',
  'субботы',
  'воскресенья',
]

// Минуты от начала суток; конец может быть 1440 (24:00)
export interface Interval {
  start: number
  end: number
}

// Неделя: 7 дней (с понедельника) × 48 ячеек по 30 минут
export type WeeklyCells = boolean[][]

// Дата 'YYYY-MM-DD' → доступное время на неё; пустой список — дата закрыта
export type Overrides = Record<string, Interval[]>

export interface Booking {
  id: string
  guestName: string
  eventTypeName: string
  date: string
  start: number
  end: number
}

export interface ScheduleState {
  weekly: WeeklyCells
  overrides: Overrides
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatInterval(interval: Interval) {
  return `${formatMinutes(interval.start)}–${formatMinutes(interval.end)}`
}

export function formatIntervals(intervals: Interval[]) {
  return intervals.length === 0
    ? 'недоступен'
    : intervals.map(formatInterval).join(', ')
}

export const startOptions = Array.from({ length: CELLS_PER_DAY }, (_, i) => ({
  value: String(i * CELL_MINUTES),
  label: formatMinutes(i * CELL_MINUTES),
}))

export const endOptions = Array.from({ length: CELLS_PER_DAY }, (_, i) => ({
  value: String((i + 1) * CELL_MINUTES),
  label: formatMinutes((i + 1) * CELL_MINUTES),
}))

export function emptyDay() {
  return Array.from({ length: CELLS_PER_DAY }, () => false)
}

export function cellsToIntervals(cells: boolean[]): Interval[] {
  const result: Interval[] = []
  let start: number | null = null
  cells.forEach((on, i) => {
    if (on && start === null) start = i
    if (!on && start !== null) {
      result.push({ start: start * CELL_MINUTES, end: i * CELL_MINUTES })
      start = null
    }
  })
  if (start !== null) result.push({ start: start * CELL_MINUTES, end: 24 * 60 })
  return result
}

export function intervalsToCells(intervals: Interval[]) {
  const cells = emptyDay()
  for (const { start, end } of intervals)
    for (let m = start; m < end; m += CELL_MINUTES)
      cells[m / CELL_MINUTES] = true
  return cells
}

// Сливает пересечения и выбрасывает пустые интервалы
export function normalize(intervals: Interval[]) {
  return cellsToIntervals(
    intervalsToCells(intervals.filter((i) => i.end > i.start)),
  )
}

export function defaultWeekly(): WeeklyCells {
  return weekdayShort.map((_, day) =>
    day < 5 ? intervalsToCells([{ start: 9 * 60, end: 18 * 60 }]) : emptyDay(),
  )
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number) {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

// 0 — понедельник
export function weekdayOf(key: string) {
  return (parseDateKey(key).getDay() + 6) % 7
}

export function formatDate(key: string) {
  return parseDateKey(key).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

export const today = dateKey(new Date())
export const windowEnd = addDays(today, 13)

export function availabilityFor(key: string, state: ScheduleState) {
  return state.overrides[key] ?? cellsToIntervals(state.weekly[weekdayOf(key)])
}

export function isInside(booking: Booking, state: ScheduleState) {
  return availabilityFor(booking.date, state).some(
    (i) => i.start <= booking.start && booking.end <= i.end,
  )
}

export function outsideBookings(state: ScheduleState) {
  return bookings.filter((b) => !isInside(b, state))
}

// Ближайшие рабочие даты окна записи: на них лежат бронирования из макета
function workdaysFrom(start: string, count: number) {
  const result: string[] = []
  for (
    let key = addDays(start, 1);
    result.length < count;
    key = addDays(key, 1)
  )
    if (weekdayOf(key) < 5) result.push(key)
  return result
}

const workdays = workdaysFrom(today, 8)

export const initialOverrides: Overrides = {
  [addDays(today, -4)]: [],
  [addDays(today, -2)]: [{ start: 10 * 60, end: 14 * 60 }],
  [workdays[3]]: [],
  [workdays[6]]: [{ start: 12 * 60, end: 16 * 60 }],
}

export const bookings: Booking[] = [
  {
    id: 'b1',
    guestName: 'Анна Смирнова',
    eventTypeName: 'Знакомство',
    date: workdays[0],
    start: 10 * 60,
    end: 10 * 60 + 30,
  },
  {
    id: 'b2',
    guestName: 'Игорь Ли',
    eventTypeName: 'Консультация',
    date: workdays[0],
    start: 16 * 60,
    end: 17 * 60,
  },
  {
    id: 'b3',
    guestName: 'Мария Котова',
    eventTypeName: 'Знакомство',
    date: workdays[1],
    start: 9 * 60,
    end: 9 * 60 + 30,
  },
  {
    id: 'b4',
    guestName: 'Пётр Волков',
    eventTypeName: 'Разбор кода',
    date: workdays[2],
    start: 13 * 60,
    end: 15 * 60,
  },
  {
    id: 'b5',
    guestName: 'Ольга Нам',
    eventTypeName: 'Консультация',
    date: workdays[4],
    start: 17 * 60,
    end: 18 * 60,
  },
  {
    id: 'b6',
    guestName: 'Денис Орлов',
    eventTypeName: 'Знакомство',
    date: workdays[6],
    start: 12 * 60 + 30,
    end: 13 * 60,
  },
]

export function bookingsOn(key: string) {
  return bookings.filter((b) => b.date === key)
}

export function formatBooking(b: Booking) {
  return `${formatDate(b.date)}, ${formatInterval(b)} — ${b.guestName} (${b.eventTypeName})`
}
