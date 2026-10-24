// ПРОТОТИП редактора расписания и исключений: три структурно разных варианта.
// A — матрица «дни × 30 минут» с выделением мышью, B — интервалы по дням с полями
// времени, C — календарь дат, где правка даты решает, менять дату или весь день недели.
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
  Grid,
  Group,
  Menu,
  Modal,
  Paper,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import {
  IconCopy,
  IconDots,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useEffect, useState, type ReactNode } from 'react'
import {
  availabilityFor,
  bookings,
  bookingsOn,
  CELL_MINUTES,
  cellsToIntervals,
  emptyDay,
  endOptions,
  formatDate,
  formatInterval,
  formatIntervals,
  formatMinutes,
  intervalsToCells,
  normalize,
  startOptions,
  today,
  weekdayAccusativePlural,
  weekdayLong,
  weekdayOf,
  weekdayShort,
  windowEnd,
  type Booking,
  type Interval,
  type Overrides,
  type ScheduleState,
} from './scheduleData.ts'

export interface VariantProps {
  state: ScheduleState
  onChange: (next: ScheduleState) => void
  outside: Set<string>
}

interface Variant {
  key: string
  name: string
  Component: (props: VariantProps) => ReactNode
}

// ---------- общие куски ----------

function IntervalsEditor({
  value,
  onChange,
}: {
  value: Interval[]
  onChange: (next: Interval[]) => void
}) {
  const update = (index: number, patch: Partial<Interval>) =>
    onChange(
      value.map((interval, i) => {
        if (i !== index) return interval
        const next = { ...interval, ...patch }
        if (next.end <= next.start) next.end = next.start + CELL_MINUTES
        return next
      }),
    )
  const add = () => {
    const last = value.at(-1)
    const start = last ? Math.min(last.end + 60, 23 * 60) : 9 * 60
    onChange([...value, { start, end: Math.min(start + 60, 24 * 60) }])
  }
  return (
    <Stack gap={6}>
      {value.map((interval, index) => (
        <Group key={index} gap={6} wrap="nowrap">
          <Select
            size="xs"
            w={90}
            data={startOptions}
            value={String(interval.start)}
            onChange={(v) => v && update(index, { start: Number(v) })}
            allowDeselect={false}
            aria-label="Начало"
          />
          <Text size="sm">—</Text>
          <Select
            size="xs"
            w={90}
            data={endOptions.filter((o) => Number(o.value) > interval.start)}
            value={String(interval.end)}
            onChange={(v) => v && update(index, { end: Number(v) })}
            allowDeselect={false}
            aria-label="Конец"
          />
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            aria-label="Удалить интервал"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconPlus size={14} />}
        onClick={add}
        w="fit-content"
      >
        Добавить интервал
      </Button>
    </Stack>
  )
}

function BookingLine({
  booking,
  outside,
}: {
  booking: Booking
  outside: boolean
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Badge
        size="sm"
        variant={outside ? 'filled' : 'light'}
        color={outside ? 'orange' : 'gray'}
      >
        {formatInterval(booking)}
      </Badge>
      <Text size="sm" truncate>
        {booking.guestName} · {booking.eventTypeName}
      </Text>
      {outside && (
        <Text size="xs" c="orange">
          вне доступного времени
        </Text>
      )}
    </Group>
  )
}

interface OverrideDraft {
  dates: string[]
  closed: boolean
  intervals: Interval[]
}

// Модалка исключения: на новую дату можно выбрать сразу несколько дат (отпуск)
function OverrideModal({
  opened,
  onClose,
  editing,
  state,
  onSave,
}: {
  opened: boolean
  onClose: () => void
  editing: string | null
  state: ScheduleState
  onSave: (draft: OverrideDraft) => void
}) {
  const [draft, setDraft] = useState<OverrideDraft>({
    dates: [],
    closed: true,
    intervals: [],
  })
  useEffect(() => {
    if (!opened) return
    if (editing) {
      const intervals = state.overrides[editing] ?? []
      setDraft({
        dates: [editing],
        closed: intervals.length === 0,
        intervals: intervals.length
          ? intervals
          : [{ start: 9 * 60, end: 18 * 60 }],
      })
    } else
      setDraft({
        dates: [],
        closed: true,
        intervals: [{ start: 9 * 60, end: 18 * 60 }],
      })
    // Состояние модалки сбрасываем только при открытии
  }, [opened, editing])

  const affected = bookings.filter((b) => {
    if (!draft.dates.includes(b.date)) return false
    const intervals = draft.closed ? [] : normalize(draft.intervals)
    return !intervals.some((i) => i.start <= b.start && b.end <= i.end)
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        editing ? `Исключение: ${formatDate(editing)}` : 'Новое исключение'
      }
      size="auto"
    >
      <Group align="flex-start" gap="xl">
        {!editing && (
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Даты
            </Text>
            <DatePicker
              type="multiple"
              value={draft.dates}
              onChange={(dates) => setDraft({ ...draft, dates })}
              minDate={today}
              getDayProps={(date) => ({
                style: state.overrides[date]
                  ? { textDecoration: 'underline' }
                  : undefined,
              })}
            />
            <Text size="xs" c="dimmed" maw={260}>
              Подчёркнуты даты, у которых уже есть исключение: оно заменится.
            </Text>
          </Stack>
        )}
        <Stack gap="sm" w={300}>
          <SegmentedControl
            value={draft.closed ? 'closed' : 'hours'}
            onChange={(v) => setDraft({ ...draft, closed: v === 'closed' })}
            data={[
              { value: 'closed', label: 'Закрыть дату' },
              { value: 'hours', label: 'Свои часы' },
            ]}
          />
          {draft.closed ? (
            <Text size="sm" c="dimmed">
              Гости не смогут записаться на эти даты.
            </Text>
          ) : (
            <IntervalsEditor
              value={draft.intervals}
              onChange={(intervals) => setDraft({ ...draft, intervals })}
            />
          )}
          {affected.length > 0 && (
            <Paper withBorder p="xs" bg="var(--mantine-color-orange-light)">
              <Text size="sm" fw={500} mb={4}>
                Окажутся вне доступного времени:
              </Text>
              <Stack gap={4}>
                {affected.map((b) => (
                  <BookingLine key={b.id} booking={b} outside />
                ))}
              </Stack>
            </Paper>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button
              disabled={draft.dates.length === 0}
              onClick={() => {
                onSave(draft)
                onClose()
              }}
            >
              Готово
            </Button>
          </Group>
        </Stack>
      </Group>
    </Modal>
  )
}

function applyOverride(
  state: ScheduleState,
  draft: OverrideDraft,
): ScheduleState {
  const overrides: Overrides = { ...state.overrides }
  for (const date of draft.dates)
    overrides[date] = draft.closed ? [] : normalize(draft.intervals)
  return { ...state, overrides }
}

function removeOverride(state: ScheduleState, date: string): ScheduleState {
  const overrides = { ...state.overrides }
  delete overrides[date]
  return { ...state, overrides }
}

function sortedOverrideDates(overrides: Overrides) {
  return Object.keys(overrides).sort()
}

function setDay(
  state: ScheduleState,
  day: number,
  cells: boolean[],
): ScheduleState {
  return {
    ...state,
    weekly: state.weekly.map((current, i) =>
      i === day ? [...cells] : current,
    ),
  }
}

// ---------- A: матрица ----------

interface DragState {
  day0: number
  row0: number
  day1: number
  row1: number
  value: boolean
}

const CELL_HEIGHT = 14

function MatrixVariant({ state, onChange, outside }: VariantProps) {
  const [showNight, setShowNight] = useState(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const firstRow = showNight ? 0 : 12
  const lastRow = showNight ? 48 : 46
  const rows = Array.from(
    { length: lastRow - firstRow },
    (_, i) => firstRow + i,
  )

  useEffect(() => {
    if (!drag) return
    function onUp() {
      if (!drag) return
      const [d0, d1] = [
        Math.min(drag.day0, drag.day1),
        Math.max(drag.day0, drag.day1),
      ]
      const [r0, r1] = [
        Math.min(drag.row0, drag.row1),
        Math.max(drag.row0, drag.row1),
      ]
      onChange({
        ...state,
        weekly: state.weekly.map((cells, day) =>
          day < d0 || day > d1
            ? cells
            : cells.map((on, row) =>
                row >= r0 && row <= r1 ? drag.value : on,
              ),
        ),
      })
      setDrag(null)
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [drag, onChange, state])

  const inDrag = (day: number, row: number) =>
    drag !== null &&
    day >= Math.min(drag.day0, drag.day1) &&
    day <= Math.max(drag.day0, drag.day1) &&
    row >= Math.min(drag.row0, drag.row1) &&
    row <= Math.max(drag.row0, drag.row1)

  // Бронирования окна записи на датах без исключений, разложенные по дням недели
  const bookingsAt = (day: number, row: number) => {
    const from = row * CELL_MINUTES
    const to = from + CELL_MINUTES
    return bookings.filter(
      (b) =>
        weekdayOf(b.date) === day &&
        !(b.date in state.overrides) &&
        b.start < to &&
        from < b.end,
    )
  }

  const copyDay = (from: number, targets: number[]) =>
    onChange({
      ...state,
      weekly: state.weekly.map((cells, day) =>
        targets.includes(day) ? [...state.weekly[from]] : cells,
      ),
    })

  return (
    <Grid gap="xl">
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Paper withBorder p="md">
          <Group justify="space-between" mb="sm">
            <div>
              <Title order={4}>Неделя</Title>
              <Text size="xs" c="dimmed">
                Зажмите мышь и протяните, чтобы открыть или закрыть время.
              </Text>
            </div>
            <Switch
              size="xs"
              label="Ночные часы"
              checked={showNight}
              onChange={(e) => setShowNight(e.currentTarget.checked)}
            />
          </Group>
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: '44px repeat(7, 1fr)',
              userSelect: 'none',
            }}
          >
            <div />
            {weekdayShort.map((label, day) => (
              <Group key={label} gap={0} justify="center" wrap="nowrap" pb={4}>
                <Text size="sm" fw={600}>
                  {label}
                </Text>
                <Menu position="bottom" withinPortal>
                  <Menu.Target>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="gray"
                      aria-label="Действия с днём"
                    >
                      <IconDots size={14} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Копировать {weekdayShort[day]} на</Menu.Label>
                    <Menu.Item onClick={() => copyDay(day, [0, 1, 2, 3, 4])}>
                      Все будни
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => copyDay(day, [0, 1, 2, 3, 4, 5, 6])}
                    >
                      Все дни
                    </Menu.Item>
                    {weekdayShort.map((target, t) =>
                      t === day ? null : (
                        <Menu.Item
                          key={target}
                          onClick={() => copyDay(day, [t])}
                        >
                          {weekdayLong[t]}
                        </Menu.Item>
                      ),
                    )}
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      onClick={() => onChange(setDay(state, day, emptyDay()))}
                    >
                      Очистить день
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            ))}
            {rows.map((row) => (
              <Box key={row} style={{ display: 'contents' }}>
                <Text
                  size="10px"
                  c="dimmed"
                  ta="right"
                  pr={6}
                  style={{
                    lineHeight: `${CELL_HEIGHT}px`,
                    transform: 'translateY(-7px)',
                  }}
                >
                  {row % 2 === 0 ? formatMinutes(row * CELL_MINUTES) : ''}
                </Text>
                {weekdayShort.map((label, day) => {
                  const on = inDrag(day, row)
                    ? drag!.value
                    : state.weekly[day][row]
                  const here = bookingsAt(day, row)
                  const conflict = here.some((b) => outside.has(b.id))
                  const cell = (
                    <Box
                      key={label}
                      h={CELL_HEIGHT}
                      onMouseDown={() =>
                        setDrag({
                          day0: day,
                          row0: row,
                          day1: day,
                          row1: row,
                          value: !state.weekly[day][row],
                        })
                      }
                      onMouseEnter={() =>
                        drag && setDrag({ ...drag, day1: day, row1: row })
                      }
                      style={{
                        cursor: 'pointer',
                        background: on
                          ? 'var(--mantine-color-indigo-filled)'
                          : 'var(--mantine-color-default)',
                        opacity: inDrag(day, row) ? 0.7 : 1,
                        borderTop:
                          row % 2 === 0
                            ? '1px solid var(--mantine-color-default-border)'
                            : '1px dashed var(--mantine-color-default-border)',
                        borderLeft:
                          '1px solid var(--mantine-color-default-border)',
                        boxShadow: here.length
                          ? `inset 4px 0 0 var(--mantine-color-${conflict ? 'orange' : 'teal'}-5)`
                          : undefined,
                      }}
                    />
                  )
                  return here.length ? (
                    <Tooltip
                      key={label}
                      label={here
                        .map(
                          (b) =>
                            `${formatDate(b.date)} ${formatInterval(b)} ${b.guestName}`,
                        )
                        .join('\n')}
                      style={{ whiteSpace: 'pre' }}
                    >
                      {cell}
                    </Tooltip>
                  ) : (
                    cell
                  )
                })}
              </Box>
            ))}
          </Box>
          <Group gap="md" mt="sm">
            <Group gap={4}>
              <Box w={10} h={10} bg="teal.5" />
              <Text size="xs">бронирование</Text>
            </Group>
            <Group gap={4}>
              <Box w={10} h={10} bg="orange.5" />
              <Text size="xs">бронирование вне доступного времени</Text>
            </Group>
          </Group>
        </Paper>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <ExceptionCards state={state} onChange={onChange} outside={outside} />
      </Grid.Col>
    </Grid>
  )
}

// Список исключений карточками; прошедшие свёрнуты
function ExceptionCards({ state, onChange, outside }: VariantProps) {
  const [modal, setModal] = useState<{ editing: string | null } | null>(null)
  const [showPast, setShowPast] = useState(false)
  const dates = sortedOverrideDates(state.overrides)
  const upcoming = dates.filter((d) => d >= today)
  const past = dates.filter((d) => d < today)

  const card = (date: string, readonly: boolean) => (
    <Paper key={date} withBorder p="xs" opacity={readonly ? 0.6 : 1}>
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text size="sm" fw={500}>
            {formatDate(date)}
          </Text>
          <Text size="xs" c="dimmed">
            {state.overrides[date].length === 0
              ? 'Закрыта'
              : formatIntervals(state.overrides[date])}
            {date > windowEnd && ' · за окном записи'}
          </Text>
        </div>
        {!readonly && (
          <Group gap={0} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setModal({ editing: date })}
              aria-label="Изменить"
            >
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onChange(removeOverride(state, date))}
              aria-label="Удалить"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        )}
      </Group>
      {bookingsOn(date)
        .filter((b) => outside.has(b.id))
        .map((b) => (
          <Box key={b.id} mt={4}>
            <BookingLine booking={b} outside />
          </Box>
        ))}
    </Paper>
  )

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Title order={4}>Исключения</Title>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => setModal({ editing: null })}
        >
          Добавить
        </Button>
      </Group>
      <Stack gap="xs">
        {upcoming.length === 0 && (
          <Text size="sm" c="dimmed">
            Нет исключений: на все даты действует расписание.
          </Text>
        )}
        {upcoming.map((d) => card(d, false))}
        {past.length > 0 && (
          <>
            <UnstyledButton onClick={() => setShowPast((v) => !v)}>
              <Text size="xs" c="dimmed">
                {showPast ? 'Скрыть прошедшие' : `Прошедшие (${past.length})`}
              </Text>
            </UnstyledButton>
            <Collapse expanded={showPast}>
              <Stack gap="xs">{past.map((d) => card(d, true))}</Stack>
            </Collapse>
          </>
        )}
      </Stack>
      <OverrideModal
        opened={modal !== null}
        editing={modal?.editing ?? null}
        onClose={() => setModal(null)}
        state={state}
        onSave={(draft) => onChange(applyOverride(state, draft))}
      />
    </Paper>
  )
}

// ---------- B: интервалы по дням ----------

function IntervalsVariant({ state, onChange, outside }: VariantProps) {
  const [modal, setModal] = useState<{ editing: string | null } | null>(null)
  const [pastFilter, setPastFilter] = useState('upcoming')
  const dates = sortedOverrideDates(state.overrides).filter(
    (d) => pastFilter === 'all' || d >= today,
  )

  return (
    <Stack gap="xl">
      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Еженедельное расписание
        </Title>
        <Stack gap={0}>
          {weekdayLong.map((label, day) => {
            const intervals = cellsToIntervals(state.weekly[day])
            const enabled = intervals.length > 0
            return (
              <Group
                key={label}
                align="flex-start"
                py="sm"
                wrap="nowrap"
                style={{
                  borderTop: day
                    ? '1px solid var(--mantine-color-default-border)'
                    : undefined,
                }}
              >
                <Switch
                  w={160}
                  label={label}
                  checked={enabled}
                  onChange={(e) =>
                    onChange(
                      setDay(
                        state,
                        day,
                        e.currentTarget.checked
                          ? intervalsToCells([{ start: 9 * 60, end: 18 * 60 }])
                          : emptyDay(),
                      ),
                    )
                  }
                />
                <Box style={{ flex: 1 }}>
                  {enabled ? (
                    <IntervalsEditor
                      value={intervals}
                      onChange={(next) =>
                        onChange(setDay(state, day, intervalsToCells(next)))
                      }
                    />
                  ) : (
                    <Text size="sm" c="dimmed" pt={4}>
                      Недоступен
                    </Text>
                  )}
                </Box>
                <CopyDayPopover
                  day={day}
                  onCopy={(targets) =>
                    onChange({
                      ...state,
                      weekly: state.weekly.map((cells, d) =>
                        targets.includes(d) ? [...state.weekly[day]] : cells,
                      ),
                    })
                  }
                />
              </Group>
            )
          })}
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Group justify="space-between" mb="sm">
          <Title order={4}>Исключения на даты</Title>
          <Group>
            <SegmentedControl
              size="xs"
              value={pastFilter}
              onChange={setPastFilter}
              data={[
                { value: 'upcoming', label: 'Предстоящие' },
                { value: 'all', label: 'Все' },
              ]}
            />
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => setModal({ editing: null })}
            >
              Добавить исключение
            </Button>
          </Group>
        </Group>
        {dates.length === 0 ? (
          <Text size="sm" c="dimmed">
            Нет исключений.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Дата</Table.Th>
                <Table.Th>Доступное время</Table.Th>
                <Table.Th>Бронирования вне времени</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {dates.map((date) => {
                const isPast = date < today
                const out = bookingsOn(date).filter((b) => outside.has(b.id))
                return (
                  <Table.Tr key={date} c={isPast ? 'dimmed' : undefined}>
                    <Table.Td>{formatDate(date)}</Table.Td>
                    <Table.Td>
                      {state.overrides[date].length === 0 ? (
                        <Badge color="red" variant="light">
                          Закрыта
                        </Badge>
                      ) : (
                        formatIntervals(state.overrides[date])
                      )}
                    </Table.Td>
                    <Table.Td>
                      {out.length ? (
                        <Stack gap={2}>
                          {out.map((b) => (
                            <BookingLine key={b.id} booking={b} outside />
                          ))}
                        </Stack>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                    <Table.Td>
                      {!isPast && (
                        <Group gap={0} justify="flex-end" wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => setModal({ editing: date })}
                            aria-label="Изменить"
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() =>
                              onChange(removeOverride(state, date))
                            }
                            aria-label="Удалить"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      )}
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
      <OverrideModal
        opened={modal !== null}
        editing={modal?.editing ?? null}
        onClose={() => setModal(null)}
        state={state}
        onSave={(draft) => onChange(applyOverride(state, draft))}
      />
    </Stack>
  )
}

function CopyDayPopover({
  day,
  onCopy,
}: {
  day: number
  onCopy: (targets: number[]) => void
}) {
  const [opened, setOpened] = useState(false)
  const [targets, setTargets] = useState<string[]>([])
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      withArrow
    >
      <Popover.Target>
        <Tooltip label="Копировать на другие дни">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setOpened((o) => !o)}
            aria-label="Копировать"
          >
            <IconCopy size={16} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs" fw={600} mb={6}>
          Копировать на
        </Text>
        <Checkbox.Group value={targets} onChange={setTargets}>
          <Stack gap={6}>
            {weekdayLong.map((label, d) => (
              <Checkbox
                key={label}
                size="xs"
                value={String(d)}
                label={label}
                disabled={d === day}
              />
            ))}
          </Stack>
        </Checkbox.Group>
        <Button
          size="xs"
          mt="sm"
          fullWidth
          disabled={targets.length === 0}
          onClick={() => {
            onCopy(targets.map(Number))
            setTargets([])
            setOpened(false)
          }}
        >
          Применить
        </Button>
      </Popover.Dropdown>
    </Popover>
  )
}

// ---------- C: календарь дат ----------

function CalendarVariant({ state, onChange, outside }: VariantProps) {
  const [selected, setSelected] = useState(today)
  return (
    <Grid gap="xl">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Paper withBorder p="md">
          <Title order={4} mb="sm">
            Даты
          </Title>
          <DatePicker
            value={selected}
            onChange={(d) => d && setSelected(d)}
            numberOfColumns={2}
            size="md"
            allowDeselect={false}
            renderDay={(date) => {
              const day = Number(date.slice(8))
              const intervals = availabilityFor(date, state)
              const isOverride = date in state.overrides
              const hasOutside = bookingsOn(date).some((b) => outside.has(b.id))
              return (
                <Stack gap={0} align="center">
                  <Text
                    size="sm"
                    td={
                      isOverride && intervals.length === 0
                        ? 'line-through'
                        : undefined
                    }
                    c={intervals.length === 0 ? 'dimmed' : undefined}
                  >
                    {day}
                  </Text>
                  <Group gap={2} h={6}>
                    {isOverride && (
                      <Box
                        w={5}
                        h={5}
                        bg="indigo.5"
                        style={{ borderRadius: 5 }}
                      />
                    )}
                    {bookingsOn(date).length > 0 && (
                      <Box
                        w={5}
                        h={5}
                        bg={hasOutside ? 'orange.5' : 'teal.5'}
                        style={{ borderRadius: 5 }}
                      />
                    )}
                  </Group>
                </Stack>
              )
            }}
          />
          <Group gap="md" mt="sm">
            <Group gap={4}>
              <Box w={8} h={8} bg="indigo.5" style={{ borderRadius: 8 }} />
              <Text size="xs">исключение</Text>
            </Group>
            <Group gap={4}>
              <Box w={8} h={8} bg="teal.5" style={{ borderRadius: 8 }} />
              <Text size="xs">есть бронирования</Text>
            </Group>
            <Group gap={4}>
              <Box w={8} h={8} bg="orange.5" style={{ borderRadius: 8 }} />
              <Text size="xs">бронирование вне времени</Text>
            </Group>
          </Group>
        </Paper>
        <Paper withBorder p="md" mt="md">
          <Title order={5} mb="xs">
            Расписание по дням недели
          </Title>
          <Table>
            <Table.Tbody>
              {weekdayLong.map((label, day) => (
                <Table.Tr key={label}>
                  <Table.Td w={140}>{label}</Table.Td>
                  <Table.Td
                    c={state.weekly[day].some(Boolean) ? undefined : 'dimmed'}
                  >
                    {formatIntervals(cellsToIntervals(state.weekly[day]))}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Text size="xs" c="dimmed" mt="xs">
            Меняется из карточки даты: «Применить ко всем …».
          </Text>
        </Paper>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <DatePanel
          key={selected}
          date={selected}
          state={state}
          onChange={onChange}
          outside={outside}
        />
      </Grid.Col>
    </Grid>
  )
}

function DatePanel({
  date,
  state,
  onChange,
  outside,
}: VariantProps & { date: string }) {
  const weekday = weekdayOf(date)
  const isOverride = date in state.overrides
  const isPast = date < today
  const current = availabilityFor(date, state)
  const [open, setOpen] = useState(current.length > 0)
  const [intervals, setIntervals] = useState<Interval[]>(
    current.length ? current : [{ start: 9 * 60, end: 18 * 60 }],
  )
  const edited = open ? normalize(intervals) : []
  const changed = JSON.stringify(edited) !== JSON.stringify(current)

  return (
    <Paper withBorder p="md">
      <Title order={4}>{formatDate(date)}</Title>
      <Group gap="xs" mt={4} mb="md">
        {isOverride ? (
          <Badge variant="light">Исключение</Badge>
        ) : (
          <Badge variant="light" color="gray">
            По расписанию: {weekdayLong[weekday].toLowerCase()}
          </Badge>
        )}
        {date > windowEnd && (
          <Badge variant="outline" color="gray">
            за окном записи
          </Badge>
        )}
      </Group>
      {isPast ? (
        <Text size="sm" c="dimmed">
          Прошедшая дата: {formatIntervals(current)}. Изменить нельзя.
        </Text>
      ) : (
        <Stack gap="sm">
          <Switch
            label="Доступен в этот день"
            checked={open}
            onChange={(e) => setOpen(e.currentTarget.checked)}
          />
          {open && (
            <IntervalsEditor value={intervals} onChange={setIntervals} />
          )}
          <Stack gap={6} mt="xs">
            <Button
              disabled={!changed}
              onClick={() =>
                onChange({
                  ...state,
                  overrides: { ...state.overrides, [date]: edited },
                })
              }
            >
              Только эта дата
            </Button>
            <Button
              variant="light"
              disabled={!changed && !isOverride}
              onClick={() => {
                const next = setDay(state, weekday, intervalsToCells(edited))
                onChange(isOverride ? removeOverride(next, date) : next)
              }}
            >
              Все {weekdayAccusativePlural[weekday]}
            </Button>
            {isOverride && (
              <Button
                variant="subtle"
                color="red"
                onClick={() => onChange(removeOverride(state, date))}
              >
                Вернуть расписание (
                {formatIntervals(cellsToIntervals(state.weekly[weekday]))})
              </Button>
            )}
          </Stack>
        </Stack>
      )}
      <Title order={5} mt="lg" mb="xs">
        Бронирования
      </Title>
      {bookingsOn(date).length === 0 ? (
        <Text size="sm" c="dimmed">
          Нет.
        </Text>
      ) : (
        <Stack gap={4}>
          {bookingsOn(date).map((b) => (
            <BookingLine key={b.id} booking={b} outside={outside.has(b.id)} />
          ))}
        </Stack>
      )}
    </Paper>
  )
}

export const variants: Variant[] = [
  { key: 'A', name: 'Матрица недели', Component: MatrixVariant },
  { key: 'B', name: 'Интервалы по дням', Component: IntervalsVariant },
  { key: 'C', name: 'Календарь дат', Component: CalendarVariant },
]
