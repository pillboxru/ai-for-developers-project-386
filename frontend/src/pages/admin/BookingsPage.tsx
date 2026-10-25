import { Container, Text, Title } from '@mantine/core'

export function BookingsPage() {
  return (
    <Container size="lg" py="xl">
      <Title order={1}>Бронирования</Title>
      <Text c="dimmed" mt="sm">
        Скоро здесь появятся предстоящие бронирования.
      </Text>
    </Container>
  )
}
