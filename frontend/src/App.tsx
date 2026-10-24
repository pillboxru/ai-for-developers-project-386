import { useEffect, useState } from 'react'
import {
  Anchor,
  Badge,
  Box,
  Container,
  Group,
  Text,
  Title,
} from '@mantine/core'
import { Link, Route, Routes } from 'react-router'
import { fetchHealth } from './api/health.ts'
import GuestPage from './pages/GuestPage.tsx'
import OwnerEventTypesPage from './pages/OwnerEventTypesPage.tsx'

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
      <Group gap="md" mb="md">
        <Anchor component={Link} to="/">
          Гость
        </Anchor>
        <Anchor component={Link} to="/owner">
          Владелец
        </Anchor>
      </Group>
      <Title order={1}>Запись на звонок</Title>
      <Text c="dimmed" mt="sm">
        Выберите свободное время и запишитесь на встречу.
      </Text>
      <Group mt="lg" gap="xs">
        <Text size="sm">Бекенд:</Text>
        <Badge color={statusColor[status]}>{statusLabel[status]}</Badge>
      </Group>
      <Box mt="xl">
        <Routes>
          <Route path="/" element={<GuestPage />} />
          <Route path="/owner" element={<OwnerEventTypesPage />} />
        </Routes>
      </Box>
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
