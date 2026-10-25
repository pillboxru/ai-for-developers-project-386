import { Container, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { isApiError } from '../api/errors.ts'
import { eventTypeQuery } from '../api/eventTypes.ts'
import { EventTypeNotFound } from '../components/EventTypeNotFound.tsx'
import { QueryContent } from '../components/QueryContent.tsx'

// 404 — тип скрыт или удалён, 400 — в адресе не UUID. Для гостя это одна
// и та же битая ссылка: повтор тут не поможет, нужен другой тип
function isMissingEventType(error: unknown) {
  return (
    isApiError(error) &&
    (error.code === 'not_found' || error.code === 'validation_error')
  )
}

export function EventTypePage() {
  const { eventTypeId } = useParams()
  // Маршрут /book/:eventTypeId без параметра не совпадает
  if (eventTypeId === undefined) {
    throw new Error('EventTypePage вне маршрута /book/:eventTypeId')
  }
  const query = useQuery(eventTypeQuery(eventTypeId))

  return (
    <Container size="lg" py="xl">
      {isMissingEventType(query.error) ? (
        <EventTypeNotFound />
      ) : (
        <QueryContent query={query}>
          {(eventType) => <Title order={1}>{eventType.title}</Title>}
        </QueryContent>
      )}
    </Container>
  )
}
