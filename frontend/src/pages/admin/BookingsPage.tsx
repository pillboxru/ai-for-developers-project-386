import { Container, Group, Stack, Text, Title } from '@mantine/core'
import { IconCalendarEvent, IconWorld } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { bookingsQuery } from '../../api/bookings.ts'
import type { Booking } from '../../api/generated/types.gen.ts'
import { ownerQuery } from '../../api/owner.ts'
import { PageEmptyState } from '../../components/PageEmptyState.tsx'
import { QueryContent } from '../../components/QueryContent.tsx'
import { bookingDays, type BookingDay } from './bookingDays.ts'
import { UpcomingBookingCard } from './UpcomingBookingCard.tsx'

export function BookingsPage() {
  const bookings = useQuery(bookingsQuery())
  const owner = useQuery(ownerQuery())

  return (
    <Container size="lg" py="xl">
      <Title order={1}>Бронирования</Title>
      <QueryContent query={owner}>
        {({ timeZone }) => (
          <QueryContent query={bookings}>
            {(list) =>
              list.length === 0 ? (
                <PageEmptyState
                  icon={IconCalendarEvent}
                  title="Предстоящих бронирований нет"
                  description="Здесь появятся бронирования гостей."
                />
              ) : (
                <UpcomingBookings
                  bookings={list}
                  ownerTimeZone={timeZone}
                  loadedAt={bookings.dataUpdatedAt}
                />
              )
            }
          </QueryContent>
        )}
      </QueryContent>
    </Container>
  )
}

function UpcomingBookings({
  bookings,
  ownerTimeZone,
  loadedAt,
}: {
  bookings: Booking[]
  ownerTimeZone: string
  // Когда пришёл список, мс от эпохи
  loadedAt: number
}) {
  // Автообновления нет (26.2): «Сегодня» и «Идёт сейчас» считаются на момент
  // загрузки списка: почти тот же момент, по которому сервер отобрал предстоящие.
  // Перезагрузка списка (например, после отмены) пересчитывает их
  const now = new Date(loadedAt)

  return (
    <Stack mt="lg" gap="xl">
      <Group gap={6}>
        <IconWorld size={16} />
        <Text size="sm" c="dimmed">
          Время указано по поясу {ownerTimeZone}
        </Text>
      </Group>
      {bookingDays(bookings, ownerTimeZone, now).map((day) => (
        <DaySection
          key={day.date}
          day={day}
          ownerTimeZone={ownerTimeZone}
          now={now}
        />
      ))}
    </Stack>
  )
}

function DaySection({
  day,
  ownerTimeZone,
  now,
}: {
  day: BookingDay
  ownerTimeZone: string
  now: Date
}) {
  const headingId = useId()

  return (
    <Stack component="section" aria-labelledby={headingId} gap="sm">
      <Title order={2} size="h3" id={headingId}>
        {day.label}
      </Title>
      {day.bookings.map((booking) => (
        <UpcomingBookingCard
          key={booking.id}
          booking={booking}
          ownerTimeZone={ownerTimeZone}
          now={now}
        />
      ))}
    </Stack>
  )
}
