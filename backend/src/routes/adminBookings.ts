import type { RouteHandlers } from '../generated/fastify.gen.js'
import type { BookingService } from '../services/bookings.js'

export const adminBookingHandlers = (
  bookingService: BookingService,
): Pick<RouteHandlers, 'listBookings'> => ({
  listBookings: async (_request, reply) =>
    reply.code(200).send(bookingService.listUpcoming()),
})
