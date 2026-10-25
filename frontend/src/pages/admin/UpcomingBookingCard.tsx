import { Anchor, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { Booking } from '../../api/generated/types.gen.ts'
import { formatTime } from '../../format/dateTime.ts'

interface UpcomingBookingCardProps {
  booking: Booking
  ownerTimeZone: string
  now: Date
}

export function UpcomingBookingCard({
  booking,
  ownerTimeZone,
  now,
}: UpcomingBookingCardProps) {
  // По часам браузера (27.1): сервер отдаёт идущий звонок в списке, но
  // признака «идёт» в контракте нет
  const inProgress =
    new Date(booking.start).getTime() <= now.getTime() &&
    now.getTime() < new Date(booking.end).getTime()

  return (
    <Paper component="article" withBorder p="md" radius="md">
      <Stack gap={6}>
        <Group gap="sm">
          <Title order={3} size="h4">
            {formatTime(booking.start, ownerTimeZone)}–
            {formatTime(booking.end, ownerTimeZone)}
          </Title>
          {inProgress && (
            <Badge variant="light" color="green">
              Идёт сейчас
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Text fw={500}>{booking.eventType.title}</Text>
          {booking.eventType.hidden && (
            <Badge variant="light" color="gray">
              Скрыт
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Text>{booking.name}</Text>
          <Anchor href={`mailto:${booking.email}`}>{booking.email}</Anchor>
        </Group>
        {booking.comment && (
          <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
            {booking.comment}
          </Text>
        )}
      </Stack>
    </Paper>
  )
}
