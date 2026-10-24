// ПРОТОТИП: переключатель вариантов UI-прототипа, в продакшен-сборке не рендерится
import { ActionIcon, Group, Paper, Text } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useEffect } from 'react'

interface PrototypeVariant {
  key: string
  name: string
}

interface PrototypeSwitcherProps {
  variants: PrototypeVariant[]
  current: string
  onChange: (key: string) => void
}

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
}: PrototypeSwitcherProps) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  )
  const go = (step: number) =>
    onChange(variants[(index + step + variants.length) % variants.length].key)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      // Стрелки внутри полей ввода и календаря принадлежат им, а не переключателю
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.closest('table'))
      )
        return
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (!import.meta.env.DEV) return null

  const variant = variants[index]
  return (
    <Paper
      pos="fixed"
      bottom={16}
      left="50%"
      bg="dark.9"
      c="white"
      radius="xl"
      shadow="xl"
      px={6}
      py={4}
      style={{ transform: 'translateX(-50%)', zIndex: 1000 }}
    >
      <Group gap="xs" wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          onClick={() => go(-1)}
          aria-label="Предыдущий вариант"
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
        <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
          {variant.key} ({variant.name})
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          onClick={() => go(1)}
          aria-label="Следующий вариант"
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      </Group>
    </Paper>
  )
}
