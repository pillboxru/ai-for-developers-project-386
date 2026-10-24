import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Table,
  Text,
  Title,
} from '@mantine/core'
import {
  createEventType,
  deleteEventType,
  fetchOwnerEventTypes,
  updateEventType,
  type EventType,
  type NewEventType,
} from '../api/event-types.ts'
import EventTypeForm from '../components/EventTypeForm.tsx'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; eventTypes: EventType[] }

type FormState = { mode: 'create' } | { mode: 'edit'; eventType: EventType }

const emptyEventType: NewEventType = {
  name: '',
  description: '',
  durationMinutes: 30,
}

function editableFields({
  name,
  description,
  durationMinutes,
}: EventType): NewEventType {
  return { name, description, durationMinutes }
}

function OwnerEventTypesPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [actionError, setActionError] = useState(false)

  useEffect(() => {
    fetchOwnerEventTypes()
      .then((eventTypes) => setState({ status: 'ready', eventTypes }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  function updateList(change: (eventTypes: EventType[]) => EventType[]) {
    setState((current) =>
      current.status === 'ready'
        ? { ...current, eventTypes: change(current.eventTypes) }
        : current,
    )
  }

  function replaceEventType(updated: EventType) {
    updateList((eventTypes) =>
      eventTypes.map((eventType) =>
        eventType.id === updated.id ? updated : eventType,
      ),
    )
  }

  function openForm(formState: FormState) {
    setSaveError(false)
    setForm(formState)
  }

  async function handleSubmit(form: FormState, fields: NewEventType) {
    setSaving(true)
    setSaveError(false)
    try {
      if (form.mode === 'create') {
        const created = await createEventType(fields)
        updateList((eventTypes) => [...eventTypes, created])
      } else {
        replaceEventType(await updateEventType(form.eventType.id, fields))
      }
      setForm(null)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  async function runAction(action: () => Promise<void>) {
    setActionError(false)
    try {
      await action()
    } catch {
      setActionError(true)
    }
  }

  function toggleHidden(eventType: EventType) {
    return runAction(async () => {
      replaceEventType(
        await updateEventType(eventType.id, { hidden: !eventType.hidden }),
      )
    })
  }

  function remove(eventType: EventType) {
    return runAction(async () => {
      await deleteEventType(eventType.id)
      updateList((eventTypes) =>
        eventTypes.filter(({ id }) => id !== eventType.id),
      )
    })
  }

  return (
    <>
      <Title order={1}>Календарь владельца</Title>
      <Text c="dimmed" mt="sm" mb="xl">
        Типы событий, которые вы предлагаете гостям.
      </Text>
      <Group justify="space-between" mb="md">
        <Title order={2}>Типы событий</Title>
        {state.status === 'ready' && (
          <Button onClick={() => openForm({ mode: 'create' })}>
            Добавить тип
          </Button>
        )}
      </Group>
      {state.status === 'loading' && <Loader />}
      {state.status === 'error' && (
        <Alert color="red">Не удалось загрузить типы событий</Alert>
      )}
      {actionError && (
        <Alert color="red" mb="md">
          Не удалось изменить тип события
        </Alert>
      )}
      {state.status === 'ready' && (
        <Table>
          <Table.Tbody>
            {state.eventTypes.map((eventType) => (
              <Table.Tr key={eventType.id}>
                <Table.Td>
                  <Text fw={500}>{eventType.name}</Text>
                  {eventType.description && (
                    <Text size="sm" c="dimmed">
                      {eventType.description}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{eventType.durationMinutes} мин</Table.Td>
                <Table.Td>
                  {eventType.hidden && (
                    <Badge color="gray" variant="light">
                      Скрыт
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => openForm({ mode: 'edit', eventType })}
                    >
                      Изменить
                    </Button>
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => toggleHidden(eventType)}
                    >
                      {eventType.hidden ? 'Показать' : 'Скрыть'}
                    </Button>
                    <Button
                      variant="subtle"
                      size="xs"
                      color="red"
                      onClick={() => remove(eventType)}
                    >
                      Удалить
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Modal
        opened={form !== null}
        onClose={() => setForm(null)}
        title={
          form?.mode === 'edit' ? 'Изменить тип события' : 'Новый тип события'
        }
      >
        {saveError && (
          <Alert color="red" mb="md">
            Не удалось сохранить тип события
          </Alert>
        )}
        {form && (
          <EventTypeForm
            initialValues={
              form.mode === 'edit'
                ? editableFields(form.eventType)
                : emptyEventType
            }
            onSubmit={(fields) => handleSubmit(form, fields)}
            submitting={saving}
          />
        )}
      </Modal>
    </>
  )
}

export default OwnerEventTypesPage
