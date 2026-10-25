import { createBookingMutation } from './generated/@tanstack/react-query.gen.ts'

// Бронирование слота гостем: сервер примет только начало одного из слотов,
// которые вычисляет в момент запроса, иначе 409 slot_unavailable
export const createBookingMutationOptions = () => createBookingMutation()
