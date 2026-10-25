import { Container } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { isApiError } from '../api/errors.ts'
import { eventTypeQuery } from '../api/eventTypes.ts'
import { ownerQuery } from '../api/owner.ts'
import { slotsQuery } from '../api/slots.ts'
import { EventTypeNotFound } from '../components/EventTypeNotFound.tsx'
import { QueryContent } from '../components/QueryContent.tsx'
import { browserTimeZone } from '../format/dateTime.ts'
import { BookingCard } from './booking/BookingCard.tsx'
import { EventTypeSummary } from './booking/EventTypeSummary.tsx'
import { NoFreeTime } from './booking/NoFreeTime.tsx'
import { SlotPicker } from './booking/SlotPicker.tsx'

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
  // Три запроса идут параллельно: левая колонка не ждёт слотов
  const eventType = useQuery(eventTypeQuery(eventTypeId))
  const owner = useQuery(ownerQuery())
  const slots = useQuery(slotsQuery(eventTypeId))
  const guestTimeZone = browserTimeZone()

  return (
    <Container size="lg" py="xl">
      {isMissingEventType(eventType.error) ||
      isMissingEventType(slots.error) ? (
        <EventTypeNotFound />
      ) : (
        <QueryContent query={eventType}>
          {(eventTypeData) => (
            <QueryContent query={owner}>
              {(ownerData) => (
                <BookingCard
                  aside={
                    <EventTypeSummary
                      owner={ownerData}
                      eventType={eventTypeData}
                      guestTimeZone={guestTimeZone}
                    />
                  }
                >
                  <QueryContent query={slots}>
                    {(slotList) =>
                      slotList.slots.length === 0 ? (
                        <NoFreeTime />
                      ) : (
                        <SlotPicker
                          slotList={slotList}
                          guestTimeZone={guestTimeZone}
                        />
                      )
                    }
                  </QueryContent>
                </BookingCard>
              )}
            </QueryContent>
          )}
        </QueryContent>
      )}
    </Container>
  )
}
