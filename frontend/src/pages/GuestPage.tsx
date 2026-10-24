import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { fetchEventTypes, type EventType } from '../api/event-types.ts'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; eventTypes: EventType[] }

function GuestPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    fetchEventTypes()
      .then((eventTypes) => setState({ status: 'ready', eventTypes }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  return (
    <>
      <Title order={1}>Запись на звонок</Title>
      <Text c="dimmed" mt="sm" mb="xl">
        Выберите тип события, чтобы записаться на звонок.
      </Text>
      <EventTypeList state={state} />
    </>
  )
}

function EventTypeList({ state }: { state: LoadState }) {
  if (state.status === 'loading') {
    return <Loader />
  }
  if (state.status === 'error') {
    return <Alert color="red">Не удалось загрузить типы событий</Alert>
  }
  if (state.eventTypes.length === 0) {
    return (
      <Text c="dimmed">Владелец пока не добавил ни одного типа события</Text>
    )
  }

  return (
    <Stack>
      {state.eventTypes.map((eventType) => (
        <Card key={eventType.id} withBorder>
          <Group justify="space-between">
            <Text fw={500}>{eventType.name}</Text>
            <Badge variant="light">{eventType.durationMinutes} мин</Badge>
          </Group>
          {eventType.description && (
            <Text size="sm" c="dimmed" mt="xs">
              {eventType.description}
            </Text>
          )}
        </Card>
      ))}
    </Stack>
  )
}

export default GuestPage
