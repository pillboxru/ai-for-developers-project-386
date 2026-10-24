import { Container, Text, Title } from '@mantine/core'

export function BookPage() {
  return (
    <Container size="lg" py="xl">
      <Title order={1}>Запись на звонок</Title>
      <Text c="dimmed" mt="sm">
        Скоро здесь можно будет выбрать свободный слот.
      </Text>
    </Container>
  )
}
