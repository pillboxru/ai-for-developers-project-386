import { Container, Text, Title } from '@mantine/core'

export function OwnerPage() {
  return (
    <Container size="md" py="xl">
      <Title order={1}>Страница владельца</Title>
      <Text c="dimmed" mt="sm">
        Здесь появится управление доступным временем и список бронирований.
      </Text>
    </Container>
  )
}
