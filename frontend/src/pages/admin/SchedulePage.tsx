import { Container, Text, Title } from '@mantine/core'

export function SchedulePage() {
  return (
    <Container size="lg" py="xl">
      <Title order={1}>Расписание</Title>
      <Text c="dimmed" mt="sm">
        Скоро здесь можно будет задать расписание и исключения.
      </Text>
    </Container>
  )
}
