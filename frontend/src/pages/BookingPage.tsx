import { Container, Text, Title } from '@mantine/core'

export function BookingPage() {
  return (
    <Container size="md" py="xl">
      <Title order={1}>Запись</Title>
      <Text c="dimmed" mt="sm">
        Здесь появится выбор свободного слота.
      </Text>
    </Container>
  )
}
