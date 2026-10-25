import type { Booking } from '../../api/generated/types.gen.ts'
import { dateKeyIn, formatDateKey } from '../../format/dateTime.ts'

export interface BookingDay {
  // 'YYYY-MM-DD' по часам владельца
  date: string
  // «Сегодня», «Завтра» или «пт, 24 октября»
  label: string
  bookings: Booking[]
}

// Следующая дата календаря. Полдень UTC: прибавление суток не задевает
// переходы на летнее время ни в каком поясе
function nextDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

// Группы по дням владельца в порядке списка. Звонок через полночь попадает
// в день своего начала. «Сегодня» — тоже по часам владельца, а не браузера:
// день и время на экране должны совпадать
export function bookingDays(
  bookings: Booking[],
  timeZone: string,
  now: Date,
): BookingDay[] {
  const today = dateKeyIn(now, timeZone)
  const tomorrow = nextDateKey(today)
  const label = (date: string) =>
    date === today
      ? 'Сегодня'
      : date === tomorrow
        ? 'Завтра'
        : formatDateKey(date)

  const days = new Map<string, Booking[]>()
  for (const booking of bookings) {
    const date = dateKeyIn(booking.start, timeZone)
    days.set(date, [...(days.get(date) ?? []), booking])
  }
  return [...days].map(([date, dayBookings]) => ({
    date,
    label: label(date),
    bookings: dayBookings,
  }))
}
