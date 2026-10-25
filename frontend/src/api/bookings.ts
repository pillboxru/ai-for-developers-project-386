import type { QueryClient } from '@tanstack/react-query'
import {
  createBookingMutation,
  listBookingsOptions,
  listBookingsQueryKey,
} from './generated/@tanstack/react-query.gen.ts'

// Бронирование слота гостем: сервер примет только начало одного из слотов,
// которые вычисляет в момент запроса, иначе 409 slot_unavailable
export const createBookingMutationOptions = () => createBookingMutation()

// Предстоящие бронирования всех типов, включая отменённые, по началу
export const upcomingBookingsQuery = () => listBookingsOptions()

// Список мог устареть: сервер отказал из-за бронирования, которого ещё нет
// на экране
export function invalidateUpcomingBookings(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: listBookingsQueryKey() })
}
