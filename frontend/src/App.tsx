import { useEffect, useState } from 'react'
import { Anchor, Badge, Container, Group } from '@mantine/core'
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
      <Group justify="space-between" mb="xl">
        <Group gap="md">
          <Anchor component={Link} to="/">
            Гость
          </Anchor>
          <Anchor component={Link} to="/owner">
            Владелец
          </Anchor>
        </Group>
        <Badge variant="dot" size="xs" color={statusColor[status]}>
          {statusLabel[status]}
        </Badge>
      </Group>
      <Routes>
        <Route path="/" element={<GuestPage />} />
        <Route path="/owner" element={<OwnerEventTypesPage />} />
      </Routes>
    </Container>
  )
}

const statusLabel: Record<BackendStatus, string> = {
  loading: 'бекенд: проверяем…',
  ok: 'бекенд: ok',
  error: 'бекенд недоступен',
}

const statusColor: Record<BackendStatus, string> = {
  loading: 'gray',
  ok: 'green',
  error: 'red',
}

export default App
