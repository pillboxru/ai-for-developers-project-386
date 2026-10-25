import { Badge, Table } from '@mantine/core'
import type { EventType } from '../../api/generated/types.gen.ts'
import { formatDuration } from '../../format/duration.ts'

interface EventTypesTableProps {
  eventTypes: EventType[]
}

export function EventTypesTable({ eventTypes }: EventTypesTableProps) {
  return (
    <Table.ScrollContainer minWidth={480}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Название</Table.Th>
            <Table.Th>Длительность</Table.Th>
            <Table.Th>Шаг</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {eventTypes.map((eventType) => (
            <Table.Tr key={eventType.id}>
              <Table.Td>{eventType.title}</Table.Td>
              <Table.Td>{formatDuration(eventType.durationMinutes)}</Table.Td>
              <Table.Td>{formatDuration(eventType.slotStepMinutes)}</Table.Td>
              <Table.Td>
                {eventType.hidden && (
                  <Badge variant="light" color="gray">
                    Скрыт
                  </Badge>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
