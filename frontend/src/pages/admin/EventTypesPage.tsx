import { Button, Container, Group, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconCalendarPlus, IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { adminEventTypesQuery } from '../../api/eventTypes.ts'
import { PageEmptyState } from '../../components/PageEmptyState.tsx'
import { QueryContent } from '../../components/QueryContent.tsx'
import { EventTypeModal } from './EventTypeModal.tsx'
import { EventTypesTable } from './EventTypesTable.tsx'

export function EventTypesPage() {
  const query = useQuery(adminEventTypesQuery())
  const [modalOpened, modal] = useDisclosure(false)

  const createButton = (
    <Button leftSection={<IconPlus size={16} />} onClick={modal.open}>
      Создать тип события
    </Button>
  )

  return (
    <Container size="lg" py="xl">
      <Title order={1}>Типы событий</Title>
      <QueryContent query={query}>
        {(eventTypes) =>
          eventTypes.length === 0 ? (
            <PageEmptyState
              icon={IconCalendarPlus}
              title="Типов событий пока нет"
              description="Создайте первый, чтобы гости могли записаться."
              action={createButton}
            />
          ) : (
            <Stack mt="lg" gap="md">
              <Group>{createButton}</Group>
              <EventTypesTable eventTypes={eventTypes} />
            </Stack>
          )
        }
      </QueryContent>
      <EventTypeModal opened={modalOpened} onClose={modal.close} />
    </Container>
  )
}
