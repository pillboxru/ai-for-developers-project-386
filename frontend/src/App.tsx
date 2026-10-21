import { useEffect, useState } from 'react'
import { Badge, Container, Group, Text, Title } from '@mantine/core'
import { fetchHealth } from './api/health.ts'

type BackendStatus = 'loading' | 'ok' | 'error'

function App() {
  const [status, setStatus] = useState<BackendStatus>('loading')

  useEffect(() => {
    fetchHealth()
      .then((health) => setStatus(health.status))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Запись на звонок</Title>
      <Text c="dimmed" mt="sm">
        Выберите свободное время и запишитесь на встречу.
      </Text>
      <Group mt="lg" gap="xs">
        <Text size="sm">Бекенд:</Text>
        <Badge color={statusColor[status]}>{statusLabel[status]}</Badge>
      </Group>
    </Container>
  )
}

const statusLabel: Record<BackendStatus, string> = {
  loading: 'проверяем…',
  ok: 'ok',
  error: 'недоступен',
}

const statusColor: Record<BackendStatus, string> = {
  loading: 'gray',
  ok: 'green',
  error: 'red',
}

export default App
