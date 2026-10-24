// ПРОТОТИП страницы /admin/schedule: варианты A–C редактора переключаются через
// ?variant=, политика конфликтов с бронированиями — через ?policy=
// (warn — предупредить и сохранить, block — запретить, silent — сохранить молча).
// Черновик общий для всех вариантов, поэтому правки переживают переключение.
import {
  Accordion,
  Alert,
  Button,
  Code,
  Container,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { IconAlertTriangle } from '@tabler/icons-react'
import 'dayjs/locale/ru'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PrototypeSwitcher } from '../components/PrototypeSwitcher.tsx'
import { variants } from '../prototype/ScheduleEditorVariants.tsx'
import {
  bookings,
  cellsToIntervals,
  defaultWeekly,
  formatBooking,
  formatDate,
  formatIntervals,
  initialOverrides,
  outsideBookings,
  weekdayShort,
  type ScheduleState,
} from '../prototype/scheduleData.ts'

type Policy = 'warn' | 'block' | 'silent'

const policies: { value: Policy; label: string }[] = [
  { value: 'warn', label: 'Предупредить' },
  { value: 'block', label: 'Запретить' },
  { value: 'silent', label: 'Молча' },
]

function isPolicy(value: string | null): value is Policy {
  return policies.some((p) => p.value === value)
}

const initial: ScheduleState = {
  weekly: defaultWeekly(),
  overrides: initialOverrides,
}

export function ScheduleEditorPrototypePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [confirm, setConfirm] = useState(false)

  const setParam = (key: string, value: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(key, value)
      return next
    })

  const variantKey = searchParams.get('variant') ?? 'A'
  const variant =
    variants.find((candidate) => candidate.key === variantKey) ?? variants[0]
  const policyParam = searchParams.get('policy')
  const policy: Policy = isPolicy(policyParam) ? policyParam : 'warn'

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft)
  const outsideDraft = outsideBookings(draft)
  const outsideSaved = new Set(outsideBookings(saved).map((b) => b.id))
  // Предупреждаем только о тех, кого выбросит именно эта правка
  const newlyOutside = outsideDraft.filter((b) => !outsideSaved.has(b.id))
  const outside = new Set(outsideDraft.map((b) => b.id))

  const save = () => {
    if (policy !== 'silent' && newlyOutside.length > 0) setConfirm(true)
    else setSaved(draft)
  }

  return (
    <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1 }}>
      <Container size="lg" py="md" pb={100}>
        <Tabs value="schedule" mb="lg">
          <Tabs.List>
            <Tabs.Tab value="bookings" disabled>
              Бронирования
            </Tabs.Tab>
            <Tabs.Tab value="event-types" disabled>
              Типы событий
            </Tabs.Tab>
            <Tabs.Tab value="schedule">Расписание</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <Paper withBorder p="xs" mb="md" bg="var(--mantine-color-yellow-light)">
          <Group gap="sm">
            <Text size="xs" fw={600}>
              ПРОТОТИП · бронирования вне доступного времени при сохранении:
            </Text>
            <SegmentedControl
              size="xs"
              value={policy}
              onChange={(value) => setParam('policy', value)}
              data={policies}
            />
          </Group>
        </Paper>

        <Group justify="space-between" mb="md">
          <div>
            <Title order={2}>Расписание</Title>
            <Text size="sm" c="dimmed">
              Время по поясу владельца. Гости видят слоты только внутри
              доступного времени.
            </Text>
          </div>
          <Group>
            {dirty && (
              <Text size="sm" c="dimmed">
                Есть несохранённые изменения
              </Text>
            )}
            <Button
              variant="default"
              disabled={!dirty}
              onClick={() => setDraft(saved)}
            >
              Отменить
            </Button>
            <Button disabled={!dirty} onClick={save}>
              Сохранить
            </Button>
          </Group>
        </Group>

        {policy !== 'silent' && newlyOutside.length > 0 && (
          <Alert
            color="orange"
            icon={<IconAlertTriangle />}
            mb="md"
            title={
              policy === 'block'
                ? 'Так сохранить нельзя: бронирования окажутся вне доступного времени'
                : 'После сохранения бронирования окажутся вне доступного времени'
            }
          >
            <Stack gap={2}>
              {newlyOutside.map((b) => (
                <Text key={b.id} size="sm">
                  {formatBooking(b)}
                </Text>
              ))}
              {policy === 'warn' && (
                <Text size="sm" c="dimmed" mt={4}>
                  Бронирования останутся. Если звонок не состоится, отмените
                  бронирование в разделе «Бронирования».
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        <variant.Component
          state={draft}
          onChange={setDraft}
          outside={outside}
        />

        <Accordion variant="contained" mt="xl">
          <Accordion.Item value="state">
            <Accordion.Control>Состояние прототипа</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" fw={600}>
                Черновик {dirty ? '(не сохранён)' : '(= сохранённому)'}
              </Text>
              <Code block>
                {weekdayShort
                  .map(
                    (label, day) =>
                      `${label}: ${formatIntervals(cellsToIntervals(draft.weekly[day]))}`,
                  )
                  .join('\n')}
                {'\n\nИсключения:\n'}
                {Object.keys(draft.overrides)
                  .sort()
                  .map(
                    (date) =>
                      `${formatDate(date)}: ${draft.overrides[date].length ? formatIntervals(draft.overrides[date]) : 'закрыта'}`,
                  )
                  .join('\n')}
                {'\n\nВсе бронирования:\n'}
                {bookings
                  .map(
                    (b) =>
                      `${outside.has(b.id) ? '⚠ ' : '  '}${formatBooking(b)}`,
                  )
                  .join('\n')}
              </Code>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Container>

      <Modal
        opened={confirm}
        onClose={() => setConfirm(false)}
        title={
          policy === 'block' ? 'Сохранить нельзя' : 'Сохранить расписание?'
        }
      >
        <Text size="sm" mb="sm">
          {policy === 'block'
            ? 'Эти бронирования окажутся вне доступного времени. Сначала отмените их или оставьте для них время.'
            : 'Эти бронирования окажутся вне доступного времени. Они останутся в силе, новые гости на это время записаться не смогут.'}
        </Text>
        <Stack gap={4} mb="md">
          {newlyOutside.map((b) => (
            <Text key={b.id} size="sm">
              • {formatBooking(b)}
            </Text>
          ))}
        </Stack>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirm(false)}>
            {policy === 'block' ? 'Понятно' : 'Вернуться'}
          </Button>
          {policy === 'warn' && (
            <Button
              color="orange"
              onClick={() => {
                setSaved(draft)
                setConfirm(false)
              }}
            >
              Сохранить всё равно
            </Button>
          )}
        </Group>
      </Modal>

      <PrototypeSwitcher
        variants={variants}
        current={variant.key}
        onChange={(key) => setParam('variant', key)}
      />
    </DatesProvider>
  )
}
