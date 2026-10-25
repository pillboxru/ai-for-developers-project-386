import type { RouteHandlers } from '../generated/fastify.gen.js'
import type { ApiError } from '../generated/types.gen.js'
import type { EventTypeService } from '../services/eventTypes.js'

const titleTakenMessage = 'Тип события с таким названием уже есть'

// fieldErrors, чтобы форма показала текст под полем «Название»
const titleTaken: ApiError = {
  code: 'event_type_title_taken',
  message: titleTakenMessage,
  fieldErrors: [{ field: 'title', message: titleTakenMessage }],
}

export const adminEventTypeHandlers = (
  eventTypeService: EventTypeService,
): Pick<RouteHandlers, 'listAdminEventTypes' | 'createEventType'> => ({
  listAdminEventTypes: async (_request, reply) =>
    reply.code(200).send(eventTypeService.listAll()),

  createEventType: async (request, reply) => {
    const result = eventTypeService.create(request.body)
    if (result.kind === 'title_taken') {
      return reply.code(409).send(titleTaken)
    }
    return reply.code(201).send(result.eventType)
  },
})
