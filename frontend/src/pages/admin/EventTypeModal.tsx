import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fieldErrorsOf } from '../../api/errors.ts'
import {
  createEventTypeMutationOptions,
  invalidateEventTypes,
} from '../../api/eventTypes.ts'
import type {
  CreateEventType,
  Minutes15,
} from '../../api/generated/types.gen.ts'
import { formatDuration } from '../../format/duration.ts'
import { notifyActionError, notifySuccess } from '../../notifications.ts'

// Значения Minutes15 из контракта: 15…240 с шагом 15
const minutes15: Minutes15[] = [
  15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240,
]
const minutesOptions = minutes15.map((value) => ({
  value,
  label: formatDuration(value),
}))

interface EventTypeFormValues {
  title: string
  description: string
  durationMinutes: Minutes15
  slotStepMinutes: Minutes15
  // В форме видимость, а не hidden: переключатель подписан «Показывать гостям»
  visibleToGuests: boolean
}

const initialValues: EventTypeFormValues = {
  title: '',
  description: '',
  durationMinutes: 30,
  slotStepMinutes: 30,
  visibleToGuests: true,
}

// Сервер строки не обрезает: пробелы по краям убирает форма, а пустое
// необязательное описание не отправляется
function toRequestBody(values: EventTypeFormValues): CreateEventType {
  const description = values.description.trim()
  return {
    title: values.title.trim(),
    ...(description && { description }),
    durationMinutes: values.durationMinutes,
    slotStepMinutes: values.slotStepMinutes,
    hidden: !values.visibleToGuests,
  }
}

interface EventTypeModalProps {
  opened: boolean
  onClose: () => void
}

export function EventTypeModal({ opened, onClose }: EventTypeModalProps) {
  const queryClient = useQueryClient()
  // Те же границы, что в контракте, но после обрезки пробелов: так их
  // проверит сервер, получив обрезанные строки
  const form = useForm({
    initialValues,
    validate: {
      title: (value) => {
        const length = value.trim().length
        if (length === 0) return 'Обязательное поле'
        if (length > 100) return 'Не больше 100 символов'
        return null
      },
      description: (value) =>
        value.trim().length > 1000 ? 'Не больше 1000 символов' : null,
    },
  })
  const mutation = useMutation({
    ...createEventTypeMutationOptions(),
    onSuccess: async () => {
      notifySuccess('Тип события сохранён')
      form.reset()
      onClose()
      await invalidateEventTypes(queryClient)
    },
    onError: (error) => {
      const fieldErrors = fieldErrorsOf(error)
      if (fieldErrors) {
        form.setErrors(fieldErrors)
      } else {
        notifyActionError()
      }
    },
  })

  return (
    <Modal opened={opened} onClose={onClose} title="Новый тип события">
      <form
        onSubmit={form.onSubmit((values) =>
          mutation.mutate({ body: toRequestBody(values) }),
        )}
      >
        <Stack>
          <TextInput
            label="Название"
            required
            {...form.getInputProps('title')}
          />
          <Textarea
            label="Описание"
            autosize
            minRows={3}
            {...form.getInputProps('description')}
          />
          <Select
            label="Длительность"
            data={minutesOptions}
            allowDeselect={false}
            {...form.getInputProps('durationMinutes')}
          />
          <Select
            label="Шаг"
            description="Через сколько минут друг от друга начинаются слоты"
            data={minutesOptions}
            allowDeselect={false}
            {...form.getInputProps('slotStepMinutes')}
          />
          <Switch
            label="Показывать гостям"
            {...form.getInputProps('visibleToGuests', { type: 'checkbox' })}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
