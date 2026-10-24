import {
  Button,
  Group,
  NumberInput,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core'
import { isNotEmpty, useForm } from '@mantine/form'
import type { NewEventType } from '../api/event-types.ts'

// Те же ограничения проверяет бекенд, форма лишь подсказывает заранее
const duration = { min: 15, max: 240, step: 15 }

interface FormValues {
  name: string
  description: string
  // NumberInput отдаёт строку, пока поле пустое
  durationMinutes: number | string
}

interface EventTypeFormProps {
  initialValues: NewEventType
  onSubmit: (fields: NewEventType) => void
  submitting: boolean
}

function EventTypeForm({
  initialValues,
  onSubmit,
  submitting,
}: EventTypeFormProps) {
  const form = useForm<FormValues, NewEventType>({
    initialValues,
    validate: {
      name: isNotEmpty('Укажите название'),
      durationMinutes: (value) =>
        typeof value === 'number' &&
        value >= duration.min &&
        value <= duration.max &&
        value % duration.step === 0
          ? null
          : `От ${duration.min} до ${duration.max} минут, кратно ${duration.step}`,
    },
    transformValues: (values) => ({
      ...values,
      durationMinutes: Number(values.durationMinutes),
    }),
  })

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack>
        <TextInput label="Название" {...form.getInputProps('name')} />
        <Textarea label="Описание" {...form.getInputProps('description')} />
        <NumberInput
          label="Длительность, мин"
          min={duration.min}
          max={duration.max}
          step={duration.step}
          {...form.getInputProps('durationMinutes')}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={submitting}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

export default EventTypeForm
