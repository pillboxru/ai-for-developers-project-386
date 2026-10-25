import { Alert, Box, Divider, Flex, Stack } from '@mantine/core'
import { DatePicker, DatesProvider } from '@mantine/dates'
import { IconAlertTriangle } from '@tabler/icons-react'
import 'dayjs/locale/ru'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Slot, SlotList } from '../../api/generated/types.gen.ts'
import { dateKeyIn } from '../../format/dateTime.ts'
import { DaySlots } from './DaySlots.tsx'
import { guestDays } from './guestDays.ts'

interface SlotPickerProps {
  slotList: SlotList
  guestTimeZone: string
}

const calendarLabels = {
  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
}

// Сравниваются моменты, а не строки: в адресе может оказаться тот же момент
// в другой записи, например с миллисекундами
function findSlot(slots: Slot[], start: string) {
  const time = new Date(start).getTime()
  return slots.find((slot) => new Date(slot.start).getTime() === time)
}

export function SlotPicker({ slotList, guestTimeZone }: SlotPickerProps) {
  const { minDate, maxDate, slotsByDate } = guestDays(slotList, guestTimeZone)
  const [searchParams, setSearchParams] = useSearchParams()
  const slotParam = searchParams.get('slot')
  const selectedSlot =
    slotParam === null ? undefined : findSlot(slotList.slots, slotParam)
  const [firstDate] = slotsByDate.keys()
  const [selectedDate, setSelectedDate] = useState(() =>
    selectedSlot ? dateKeyIn(selectedSlot.start, guestTimeZone) : firstDate,
  )
  // После перезагрузки слотов на выбранной дате их может не остаться
  const shownDate = slotsByDate.has(selectedDate) ? selectedDate : firstDate
  const daySlots = slotsByDate.get(shownDate)
  const [slotUnavailable, setSlotUnavailable] = useState(false)

  // Слот из адреса заняли, он прошёл или его и не было: гость выбирает заново
  const staleSlotParam = slotParam !== null && selectedSlot === undefined
  useEffect(() => {
    if (!staleSlotParam) {
      return
    }
    setSlotUnavailable(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('slot')
        return next
      },
      { replace: true },
    )
  }, [staleSlotParam, setSearchParams])

  // Новая запись в истории: «назад» браузера возвращает к выбору слота
  function selectSlot(slot: Slot) {
    setSlotUnavailable(false)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('slot', slot.start)
      return next
    })
  }

  return (
    <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1 }}>
      <Stack gap={0}>
        {slotUnavailable && (
          <Box px="lg" pt="lg">
            <Alert
              color="yellow"
              icon={<IconAlertTriangle />}
              title="Это время уже недоступно. Выберите другое."
              withCloseButton
              closeButtonLabel="Закрыть"
              onClose={() => setSlotUnavailable(false)}
            />
          </Box>
        )}
        <Flex direction={{ base: 'column', md: 'row' }}>
          <Box p="lg">
            <DatePicker
              size="md"
              value={shownDate}
              defaultDate={shownDate}
              // Без allowDeselect повторный щелчок не снимает выбор: null не придёт
              onChange={(date) => date && setSelectedDate(date)}
              minDate={minDate}
              maxDate={maxDate}
              maxLevel="month"
              excludeDate={(date) => !slotsByDate.has(date)}
              ariaLabels={calendarLabels}
              // Mantine отмечает выбранный день только атрибутом data-selected:
              // aria-pressed сообщает выбор и программе чтения с экрана
              getDayProps={(date) => ({ 'aria-pressed': date === shownDate })}
            />
          </Box>
          <Divider orientation="vertical" visibleFrom="md" />
          <Box p="lg" w={{ md: 260 }}>
            {daySlots && (
              <DaySlots
                date={shownDate}
                slots={daySlots}
                guestTimeZone={guestTimeZone}
                selectedStart={selectedSlot?.start ?? null}
                onSelect={selectSlot}
              />
            )}
          </Box>
        </Flex>
      </Stack>
    </DatesProvider>
  )
}
