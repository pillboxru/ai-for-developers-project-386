import type {
  FastifyError,
  FastifyReply,
  FastifyRequest,
  FastifySchemaValidationError,
} from 'fastify'
import type { ApiError, FieldError } from './generated/types.gen.js'

export function sendNotFound(reply: FastifyReply) {
  const body: ApiError = { code: 'not_found', message: 'Не найдено' }
  return reply.code(404).send(body)
}

function fieldMessage({ keyword, params }: FastifySchemaValidationError) {
  switch (keyword) {
    case 'required':
      return 'Обязательное поле'
    case 'minLength':
      return params.limit === 1
        ? 'Обязательное поле'
        : `Не меньше ${params.limit} символов`
    case 'maxLength':
      return `Не больше ${params.limit} символов`
    // Закрытые схемы контракта описывают лишнее поле как
    // additionalProperties: {not: {}}, и Ajv сообщает о нём по пути поля
    case 'not':
      return 'Неизвестное поле'
    case 'pattern':
    case 'format':
      return 'Неверный формат'
    case 'enum':
      return 'Недопустимое значение'
    default:
      return 'Неверное значение'
  }
}

// instancePath — JSON Pointer (/overrides/2/ranges/0/end), а форма фронтенда
// адресует поля путём через точки
function fieldPath({
  keyword,
  instancePath,
  params,
}: FastifySchemaValidationError) {
  const segments = instancePath.split('/').slice(1)
  if (keyword === 'required') {
    segments.push(String(params.missingProperty))
  }
  return segments.join('.')
}

function toFieldErrors(validation: FastifySchemaValidationError[]) {
  const byField = new Map<string, FieldError>()
  for (const error of validation) {
    const field = fieldPath(error)
    // Ajv может сообщить о поле несколько раз (pattern и minLength); форме
    // нужно одно сообщение на поле
    if (!byField.has(field)) {
      byField.set(field, { field, message: fieldMessage(error) })
    }
  }
  return [...byField.values()]
}

export function apiErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error.validation) {
    const body: ApiError =
      error.validationContext === 'body'
        ? {
            code: 'validation_error',
            message: 'Проверьте введённые данные',
            fieldErrors: toFieldErrors(error.validation),
          }
        : { code: 'validation_error', message: 'Неверный адрес запроса' }
    return reply.code(400).send(body)
  }

  // Ошибки разбора запроса в самом Fastify: невалидный JSON, чужой Content-Type
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    const body: ApiError = {
      code: 'validation_error',
      message: 'Неверный запрос',
    }
    return reply.code(error.statusCode).send(body)
  }

  request.log.error({ err: error }, 'unhandled error')
  const body: ApiError = {
    code: 'internal_error',
    message: 'Внутренняя ошибка сервера',
  }
  return reply.code(500).send(body)
}
