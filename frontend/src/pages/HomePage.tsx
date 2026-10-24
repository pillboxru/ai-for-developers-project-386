import {
  Button,
  Card,
  Container,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { Link } from 'react-router'

const steps = [
  {
    title: 'Выберите день',
    description: 'Откройте страницу записи и найдите удобную дату.',
  },
  {
    title: 'Выберите свободный слот',
    description: 'Каждый слот длится 30 минут.',
  },
  {
    title: 'Подтвердите запись',
    description: 'Владелец увидит встречу в своём списке.',
  },
]

export function HomePage() {
  return (
    <Container size="md" py="xl">
      <Stack align="center" ta="center" gap="md" py="xl">
        <Title order={1}>Запишитесь на звонок в удобное время</Title>
        <Text c="dimmed" size="lg" maw={560}>
          Владелец публикует свободное время, а вы выбираете слот на 30 минут.
          Без регистрации.
        </Text>
        <Button component={Link} to="/book" size="lg">
          Записаться
        </Button>
      </Stack>

      <Title order={2} ta="center" mt="xl" mb="lg">
        Как это работает
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {steps.map((step, index) => (
          <Card key={step.title} withBorder padding="lg">
            <ThemeIcon size="lg" radius="xl" variant="light">
              {index + 1}
            </ThemeIcon>
            <Title order={3} size="h4" mt="md">
              {step.title}
            </Title>
            <Text c="dimmed" size="sm" mt="xs">
              {step.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Stack align="center" mt="xl" py="xl">
        <Button component={Link} to="/book" size="lg">
          Записаться
        </Button>
      </Stack>
    </Container>
  )
}
