// ПРОТОТИП экрана выбора слота гостем: варианты A–D на маршруте /book/:eventTypeId,
// переключаются через ?variant=, пояс гостя подменяется через ?tz=
import {
  Accordion,
  Affix,
  Anchor,
  Button,
  Code,
  Container,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import 'dayjs/locale/ru'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { PrototypeSwitcher } from '../components/PrototypeSwitcher.tsx'
import { variants } from '../prototype/SlotPickerVariants.tsx'
import {
  bookingWindow,
  computeSlots,
  dateKey,
  eventTypes,
  formatDay,
  formatTime,
  groupByDate,
  guestDates,
  owner,
} from '../prototype/slotPickerData.ts'

const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const timeZones = [
  browserTimeZone,
  'Europe/Moscow',
  'Asia/Yekaterinburg',
  'Asia/Tokyo',
  'America/New_York',
].filter((zone, index, all) => all.indexOf(zone) === index)

export function SlotPickerPrototypePage() {
  const { eventTypeId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [now] = useState(() => Date.now())
  const navigate = useNavigate()

  const setParam = (key: string, value: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null) next.delete(key)
      else next.set(key, value)
      return next
    })

  const eventType = eventTypes.find((type) => type.id === eventTypeId)
  if (!eventType) {
    return (
      <Container size="lg" py="xl">
        <Title order={2}>Тип события не найден</Title>
        <Text c="dimmed" mt="sm">
          Есть: {eventTypes.map((type) => type.id).join(', ')}
        </Text>
        <Anchor component={Link} to="/book/intro">
          К выбору типа события
        </Anchor>
      </Container>
    )
  }

  const variantKey = searchParams.get('variant') ?? 'A'
  const variant =
    variants.find((candidate) => candidate.key === variantKey) ?? variants[0]
  const guestTimeZone = searchParams.get('tz') ?? browserTimeZone
  const selectedSlot = searchParams.get('slot')
  const slots = computeSlots(eventType, now)
  const dates = guestDates(now, guestTimeZone)
  const slotsByDate = groupByDate(slots, guestTimeZone)
  const range = bookingWindow(now)
  const selected = slots.find((slot) => slot.start === selectedSlot)
  const Variant = variant.Component

  return (
    <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1 }}>
      <Container size="lg" py="xl" pb={120}>
        <Variant
          // Пересоздаём вариант при смене пояса, чтобы сбросить выбранную дату
          key={`${variant.key}-${guestTimeZone}`}
          owner={owner}
          eventType={eventType}
          dates={dates}
          slotsByDate={slotsByDate}
          guestTimeZone={guestTimeZone}
          selectedSlot={selectedSlot}
          onSelectSlot={(start) => setParam('slot', start)}
        />

        <Accordion variant="contained" mt={48}>
          <Accordion.Item value="state">
            <Accordion.Control>Состояние прототипа</Accordion.Control>
            <Accordion.Panel>
              <Stack>
                <Group>
                  <Select
                    label="Пояс гостя (?tz=)"
                    data={timeZones}
                    value={guestTimeZone}
                    onChange={(zone) => setParam('tz', zone)}
                  />
                  <Select
                    label="Тип события"
                    data={eventTypes.map((type) => ({
                      value: type.id,
                      label: type.title,
                    }))}
                    value={eventType.id}
                    onChange={(id) =>
                      id &&
                      navigate({
                        pathname: `/book/${id}`,
                        search: searchParams.toString(),
                      })
                    }
                  />
                </Group>
                <Code block>
                  {JSON.stringify(
                    {
                      variant: variant.key,
                      ownerTimeZone: owner.timeZone,
                      guestTimeZone,
                      window: {
                        start: new Date(range.start).toISOString(),
                        end: new Date(range.end).toISOString(),
                      },
                      eventType,
                      datesShown: `${dates[0]} … ${dates[dates.length - 1]} (${dates.length})`,
                      datesWithSlots: [...slotsByDate.keys()].length,
                      slots: slots.length,
                      selectedSlot,
                      selectedSlotFound: selected !== undefined,
                    },
                    null,
                    2,
                  )}
                </Code>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Container>

      {selected && (
        <Affix position={{ bottom: 72, right: 20 }}>
          <Paper withBorder shadow="lg" p="md" w={320}>
            <Text size="sm" c="dimmed">
              Выбрано
            </Text>
            <Text fw={600}>
              {formatDay(dateKey(selected.start, guestTimeZone))},{' '}
              {formatTime(selected.start, guestTimeZone)}–
              {formatTime(selected.end, guestTimeZone)}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Здесь откроется форма бронирования: её вид решает тикет
              «Бронирование гостем».
            </Text>
            <Group mt="sm">
              <Button size="xs">Продолжить</Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setParam('slot', null)}
              >
                Выбрать другое время
              </Button>
            </Group>
          </Paper>
        </Affix>
      )}

      <PrototypeSwitcher
        variants={variants}
        current={variant.key}
        onChange={(key) => setParam('variant', key)}
      />
    </DatesProvider>
  )
}
