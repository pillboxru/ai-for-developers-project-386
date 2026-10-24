import {
  ActionIcon,
  Anchor,
  Button,
  Container,
  Group,
  Text,
  ThemeIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { IconCalendarTime, IconMoon, IconSun } from '@tabler/icons-react'
import { Link } from 'react-router'

export function AppHeader() {
  return (
    <Container size="lg" h="100%">
      <Group h="100%" justify="space-between">
        <Anchor component={Link} to="/" underline="never" c="inherit">
          <Group gap="xs">
            <ThemeIcon variant="light" size={32}>
              <IconCalendarTime size={20} />
            </ThemeIcon>
            <Text fw={700}>Календарь звонков</Text>
          </Group>
        </Anchor>
        <Group gap="xs">
          <Button component={Link} to="/book" variant="subtle">
            Записаться
          </Button>
          <ColorSchemeToggle />
        </Group>
      </Group>
    </Container>
  )
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme()
  // При схеме 'auto' переключаем от той темы, что реально видна сейчас
  const computedColorScheme = useComputedColorScheme('light')
  const next = computedColorScheme === 'light' ? 'dark' : 'light'

  return (
    <ActionIcon
      variant="default"
      size="lg"
      onClick={() => setColorScheme(next)}
      aria-label={
        next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'
      }
    >
      {next === 'dark' ? <IconMoon size={20} /> : <IconSun size={20} />}
    </ActionIcon>
  )
}
