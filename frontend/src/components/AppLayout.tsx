import { Anchor, AppShell, Group } from '@mantine/core'
import { Link, Outlet } from 'react-router'

export function AppLayout() {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Anchor
            component={Link}
            to="/"
            fw={700}
            c="inherit"
            underline="never"
          >
            Запись на звонок
          </Anchor>
          <Anchor component={Link} to="/owner" size="sm" c="dimmed">
            Для владельца
          </Anchor>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
