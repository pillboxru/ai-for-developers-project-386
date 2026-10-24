// ПРОТОТИП: четыре структурно разных варианта экрана выбора слота гостем
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { IconClockHour4, IconWorld } from '@tabler/icons-react'
import { useState } from 'react'
import {
  type EventType,
  type Owner,
  type Slot,
  formatDay,
  formatDayParts,
  formatDuration,
  formatTime,
  hourOf,
  slotCount,
} from './slotPickerData.ts'

export interface VariantProps {
  owner: Owner
  eventType: EventType
  dates: string[]
  slotsByDate: Map<string, Slot[]>
  guestTimeZone: string
  selectedSlot: string | null
  onSelectSlot: (start: string) => void
}

function TimeZoneNote({
  owner,
  guestTimeZone,
}: Pick<VariantProps, 'owner' | 'guestTimeZone'>) {
  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <IconWorld size={16} style={{ flexShrink: 0, marginTop: 2 }} />
      <Text size="sm" c="dimmed">
        {guestTimeZone === owner.timeZone
          ? `Время указано по поясу ${guestTimeZone}`
          : `Время показано по вашему поясу: ${guestTimeZone}. Владелец работает по ${owner.timeZone}.`}
      </Text>
    </Group>
  )
}

function firstDateWithSlots(props: VariantProps): string {
  const { dates, slotsByDate, selectedSlot } = props
  if (selectedSlot) {
    for (const [key, slots] of slotsByDate)
      if (slots.some((slot) => slot.start === selectedSlot)) return key
  }
  return dates.find((key) => slotsByDate.has(key)) ?? dates[0]
}

/* A. Классика Cal.com: карточка типа, сетка месяца, колонка слотов выбранного дня */
function VariantA(props: VariantProps) {
  const { owner, eventType, dates, slotsByDate, guestTimeZone } = props
  const [selectedDate, setSelectedDate] = useState(() =>
    firstDateWithSlots(props),
  )
  const daySlots = slotsByDate.get(selectedDate) ?? []

  return (
    <Paper withBorder radius="lg" shadow="sm">
      <Flex direction={{ base: 'column', md: 'row' }}>
        <Stack p="lg" gap="sm" w={{ md: 280 }}>
          <Group gap="xs">
            <Avatar name={owner.name} color="initials" size="sm" />
            <Text size="sm" c="dimmed">
              {owner.name}
            </Text>
          </Group>
          <Title order={3}>{eventType.title}</Title>
          <Group gap={6}>
            <IconClockHour4 size={16} />
            <Text size="sm">{formatDuration(eventType.durationMinutes)}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {eventType.description}
          </Text>
          <TimeZoneNote owner={owner} guestTimeZone={guestTimeZone} />
        </Stack>
        <Divider orientation="vertical" visibleFrom="md" />
        <Box p="lg">
          <DatePicker
            size="md"
            value={selectedDate}
            onChange={(value) => value && setSelectedDate(value)}
            minDate={dates[0]}
            maxDate={dates[dates.length - 1]}
            excludeDate={(date) => !slotsByDate.has(date)}
          />
        </Box>
        <Divider orientation="vertical" visibleFrom="md" />
        <Stack p="lg" gap="sm" w={{ md: 220 }}>
          <Text fw={600}>{formatDay(selectedDate)}</Text>
          <ScrollArea.Autosize mah={340}>
            <Stack gap="xs">
              {daySlots.map((slot) => (
                <Button
                  key={slot.start}
                  variant={
                    props.selectedSlot === slot.start ? 'filled' : 'outline'
                  }
                  onClick={() => props.onSelectSlot(slot.start)}
                >
                  {formatTime(slot.start, guestTimeZone)}
                </Button>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Flex>
    </Paper>
  )
}

/* E. Победитель: раскладка A, слоты дня по группам «Утро / День / Вечер» из B */
function VariantE(props: VariantProps) {
  const { owner, eventType, dates, slotsByDate, guestTimeZone } = props
  const [selectedDate, setSelectedDate] = useState(() =>
    firstDateWithSlots(props),
  )
  const daySlots = slotsByDate.get(selectedDate) ?? []

  return (
    <Paper withBorder radius="lg" shadow="sm">
      <Flex direction={{ base: 'column', md: 'row' }}>
        <Stack p="lg" gap="sm" w={{ md: 280 }}>
          <Group gap="xs">
            <Avatar name={owner.name} color="initials" size="sm" />
            <Text size="sm" c="dimmed">
              {owner.name}
            </Text>
          </Group>
          <Title order={3}>{eventType.title}</Title>
          <Group gap={6}>
            <IconClockHour4 size={16} />
            <Text size="sm">{formatDuration(eventType.durationMinutes)}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {eventType.description}
          </Text>
          <TimeZoneNote owner={owner} guestTimeZone={guestTimeZone} />
        </Stack>
        <Divider orientation="vertical" visibleFrom="md" />
        <Box p="lg">
          <DatePicker
            size="md"
            value={selectedDate}
            onChange={(value) => value && setSelectedDate(value)}
            minDate={dates[0]}
            maxDate={dates[dates.length - 1]}
            excludeDate={(date) => !slotsByDate.has(date)}
          />
        </Box>
        <Divider orientation="vertical" visibleFrom="md" />
        <Stack p="lg" gap="sm" w={{ md: 260 }}>
          <Text fw={600}>{formatDay(selectedDate)}</Text>
          <ScrollArea.Autosize mah={380}>
            <Stack gap="md">
              {dayParts.map(({ label, from, to }) => {
                const partSlots = daySlots.filter((slot) => {
                  const hour = hourOf(slot.start, guestTimeZone)
                  return hour >= from && hour < to
                })
                if (partSlots.length === 0) return null
                return (
                  <Stack key={label} gap="xs">
                    <Text fw={600} c="dimmed" size="sm">
                      {label}
                    </Text>
                    <SimpleGrid cols={2} spacing="xs">
                      {partSlots.map((slot) => (
                        <Button
                          key={slot.start}
                          variant={
                            props.selectedSlot === slot.start
                              ? 'filled'
                              : 'outline'
                          }
                          onClick={() => props.onSelectSlot(slot.start)}
                        >
                          {formatTime(slot.start, guestTimeZone)}
                        </Button>
                      ))}
                    </SimpleGrid>
                  </Stack>
                )
              })}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Flex>
    </Paper>
  )
}

/* B. Полоса из всех дней окна и слоты дня, разбитые на утро, день и вечер */
const dayParts = [
  { label: 'Утро', from: 0, to: 12 },
  { label: 'День', from: 12, to: 17 },
  { label: 'Вечер', from: 17, to: 24 },
]

function VariantB(props: VariantProps) {
  const { owner, eventType, dates, slotsByDate, guestTimeZone } = props
  const [selectedDate, setSelectedDate] = useState(() =>
    firstDateWithSlots(props),
  )
  const daySlots = slotsByDate.get(selectedDate) ?? []

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <Title order={2}>{eventType.title}</Title>
            <Badge variant="light" leftSection={<IconClockHour4 size={14} />}>
              {formatDuration(eventType.durationMinutes)}
            </Badge>
          </Group>
          <Text c="dimmed">{eventType.description}</Text>
        </Stack>
        <Group gap="xs">
          <Avatar name={owner.name} color="initials" />
          <Text fw={500}>{owner.name}</Text>
        </Group>
      </Group>
      <TimeZoneNote owner={owner} guestTimeZone={guestTimeZone} />

      <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
        <Group gap="xs" wrap="nowrap">
          {dates.map((key) => {
            const count = slotsByDate.get(key)?.length ?? 0
            const parts = formatDayParts(key)
            const selected = key === selectedDate
            return (
              <UnstyledButton
                key={key}
                disabled={count === 0}
                onClick={() => setSelectedDate(key)}
              >
                <Paper
                  withBorder
                  w={84}
                  p="xs"
                  ta="center"
                  bg={
                    selected ? 'var(--mantine-primary-color-light)' : undefined
                  }
                  bd={
                    selected
                      ? '2px solid var(--mantine-primary-color-filled)'
                      : undefined
                  }
                  opacity={count === 0 ? 0.4 : 1}
                >
                  <Text size="xs" tt="uppercase" c="dimmed">
                    {parts.weekday}
                  </Text>
                  <Text fw={700} fz={24} lh={1.2}>
                    {parts.day}
                  </Text>
                  <Text size="xs">{parts.month}</Text>
                  <Text size="xs" c={count === 0 ? 'dimmed' : 'teal'} mt={4}>
                    {count === 0 ? 'нет слотов' : slotCount(count)}
                  </Text>
                </Paper>
              </UnstyledButton>
            )
          })}
        </Group>
      </ScrollArea>

      <Title order={4}>{formatDay(selectedDate)}</Title>
      {dayParts.map(({ label, from, to }) => {
        const partSlots = daySlots.filter((slot) => {
          const hour = hourOf(slot.start, guestTimeZone)
          return hour >= from && hour < to
        })
        if (partSlots.length === 0) return null
        return (
          <Stack key={label} gap="xs">
            <Text fw={600} c="dimmed" size="sm">
              {label}
            </Text>
            <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="xs">
              {partSlots.map((slot) => (
                <Button
                  key={slot.start}
                  variant={
                    props.selectedSlot === slot.start ? 'filled' : 'default'
                  }
                  onClick={() => props.onSelectSlot(slot.start)}
                >
                  {formatTime(slot.start, guestTimeZone)}
                </Button>
              ))}
            </SimpleGrid>
          </Stack>
        )
      })}
    </Stack>
  )
}

/* C. Повестка: все дни окна сразу, без отдельного шага выбора даты */
function VariantC(props: VariantProps) {
  const { owner, eventType, dates, slotsByDate, guestTimeZone } = props
  const nearest = dates
    .map((key) => slotsByDate.get(key)?.[0])
    .find((slot) => slot !== undefined)

  return (
    <Flex direction={{ base: 'column', md: 'row' }} gap="xl" align="flex-start">
      <Paper
        withBorder
        p="lg"
        w={{ base: '100%', md: 300 }}
        pos={{ md: 'sticky' }}
        top={80}
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {owner.name}
          </Text>
          <Title order={3}>{eventType.title}</Title>
          <Text size="sm">{formatDuration(eventType.durationMinutes)}</Text>
          <Text size="sm" c="dimmed">
            {eventType.description}
          </Text>
          <TimeZoneNote owner={owner} guestTimeZone={guestTimeZone} />
          {nearest && (
            <Button
              variant="light"
              onClick={() => props.onSelectSlot(nearest.start)}
            >
              Ближайшее: {formatDay(dateKeyOf(nearest, props))},{' '}
              {formatTime(nearest.start, guestTimeZone)}
            </Button>
          )}
        </Stack>
      </Paper>
      <Stack gap={0} style={{ flex: 1 }} w="100%">
        {dates.map((key) => {
          const daySlots = slotsByDate.get(key) ?? []
          return (
            <Box key={key}>
              <Group align="flex-start" py="md" wrap="nowrap">
                <Text
                  fw={600}
                  w={150}
                  style={{ flexShrink: 0 }}
                  c={daySlots.length === 0 ? 'dimmed' : undefined}
                >
                  {formatDay(key)}
                </Text>
                {daySlots.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Нет свободного времени
                  </Text>
                ) : (
                  <Group gap={6}>
                    {daySlots.map((slot) => (
                      <Button
                        key={slot.start}
                        size="xs"
                        radius="xl"
                        variant={
                          props.selectedSlot === slot.start ? 'filled' : 'light'
                        }
                        onClick={() => props.onSelectSlot(slot.start)}
                      >
                        {formatTime(slot.start, guestTimeZone)}
                      </Button>
                    ))}
                  </Group>
                )}
              </Group>
              <Divider />
            </Box>
          )
        })}
      </Stack>
    </Flex>
  )
}

function dateKeyOf(slot: Slot, props: VariantProps): string {
  for (const [key, slots] of props.slotsByDate)
    if (slots.includes(slot)) return key
  return props.dates[0]
}

/* D. Неделя таблицей: колонки дней, листание по неделям */
function VariantD(props: VariantProps) {
  const { owner, eventType, dates, slotsByDate, guestTimeZone } = props
  const weeks: string[][] = []
  for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7))
  const [week, setWeek] = useState('0')
  const weekDates = weeks[Number(week)]

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text>
          <Text span fw={700}>
            {eventType.title}
          </Text>{' '}
          · {formatDuration(eventType.durationMinutes)} · {owner.name}
        </Text>
        <SegmentedControl
          value={week}
          onChange={setWeek}
          data={weeks.map((days, index) => ({
            value: String(index),
            label: `${formatDayParts(days[0]).day} ${formatDayParts(days[0]).month} – ${formatDayParts(days[days.length - 1]).day} ${formatDayParts(days[days.length - 1]).month}`,
          }))}
        />
      </Group>
      <TimeZoneNote owner={owner} guestTimeZone={guestTimeZone} />
      <ScrollArea type="auto" scrollbars="x">
        <SimpleGrid cols={7} spacing="xs" miw={760}>
          {weekDates.map((key) => {
            const parts = formatDayParts(key)
            const daySlots = slotsByDate.get(key) ?? []
            return (
              <Stack key={key} gap={6}>
                <Paper
                  withBorder
                  p={6}
                  ta="center"
                  bg="var(--mantine-color-body)"
                >
                  <Text size="xs" tt="uppercase" c="dimmed">
                    {parts.weekday}
                  </Text>
                  <Text fw={700}>
                    {parts.day} {parts.month}
                  </Text>
                </Paper>
                {daySlots.length === 0 ? (
                  <Text c="dimmed" ta="center" size="sm">
                    —
                  </Text>
                ) : (
                  daySlots.map((slot) => (
                    <Button
                      key={slot.start}
                      size="compact-sm"
                      variant={
                        props.selectedSlot === slot.start ? 'filled' : 'light'
                      }
                      onClick={() => props.onSelectSlot(slot.start)}
                    >
                      {formatTime(slot.start, guestTimeZone)}
                    </Button>
                  ))
                )}
              </Stack>
            )
          })}
        </SimpleGrid>
      </ScrollArea>
    </Stack>
  )
}

export const variants = [
  { key: 'A', name: 'Месяц и колонка слотов', Component: VariantA },
  { key: 'B', name: 'Полоса дней', Component: VariantB },
  { key: 'C', name: 'Повестка на 14 дней', Component: VariantC },
  { key: 'D', name: 'Неделя таблицей', Component: VariantD },
  { key: 'E', name: 'Выбран: A + группы из B', Component: VariantE },
]
