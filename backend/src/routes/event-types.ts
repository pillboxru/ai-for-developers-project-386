import type { FastifyPluginAsync } from 'fastify'
import {
  EventTypeNotFoundError,
  type EventTypeChanges,
  type EventTypeService,
  type NewEventType,
} from '../services/event-types.js'

export interface EventTypeRoutesOptions {
  eventTypes: EventTypeService
}

const fieldSchemas = {
  // minLength пропустил бы название из одних пробелов
  name: { type: 'string', pattern: '\\S' },
  description: { type: 'string', default: '' },
  durationMinutes: {
    type: 'integer',
    minimum: 15,
    maximum: 240,
    multipleOf: 15,
  },
}

// Без additionalProperties: false поле id из тела перезаписало бы id типа.
// Fastify по умолчанию не отклоняет, а вырезает лишние поля.
const createBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'durationMinutes'],
  properties: fieldSchemas,
}

const updateBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    name: fieldSchemas.name,
    description: { type: 'string' },
    durationMinutes: fieldSchemas.durationMinutes,
    hidden: { type: 'boolean' },
  },
}

export const eventTypeRoutes: FastifyPluginAsync<
  EventTypeRoutesOptions
> = async (app, { eventTypes }) => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof EventTypeNotFoundError) {
      return reply
        .code(404)
        .send({ error: 'Not Found', message: error.message })
    }
    // Остальные ошибки, в том числе валидации, обрабатывает Fastify
    throw error
  })

  app.get('/event-types', async () => eventTypes.listVisible())

  app.post<{ Body: NewEventType }>(
    '/owner/event-types',
    { schema: { body: createBodySchema } },
    async (request, reply) => {
      reply.code(201)
      return eventTypes.create(request.body)
    },
  )

  app.get('/owner/event-types', async () => eventTypes.listAll())

  app.patch<{ Params: { id: string }; Body: EventTypeChanges }>(
    '/owner/event-types/:id',
    { schema: { body: updateBodySchema } },
    async (request) => eventTypes.update(request.params.id, request.body),
  )

  app.delete<{ Params: { id: string } }>(
    '/owner/event-types/:id',
    async (request, reply) => {
      eventTypes.delete(request.params.id)
      return reply.code(204).send()
    },
  )
}
