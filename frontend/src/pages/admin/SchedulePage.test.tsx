import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  handleGetOwner,
  handleGetSchedule,
  handleListBookings,
  handleUpdateSchedule,
} from '../../api/generated/msw.gen.ts'
import type {
  ApiError,
  Booking,
  Schedule,
  UpdateSchedule,
  WeeklySchedule,
} from '../../api/generated/types.gen.ts'
import { renderApp } from '../../test/renderApp.tsx'
import { server } from '../../test/server.ts'

// Сегодня понедельник 2 ноября, 09:00 по Москве; браузер во Владивостоке
const today = new Date('2026-11-02T06:00:00Z')
const bookingWindow = {
  start: '2026-11-01T21:00:00Z',
  end: '2026-11-15T21:00:00Z',
}

const workday = [{ start: '09:00', end: '18:00' }]
const defaultWeekly: WeeklySchedule = {
  monday: workday,
  tuesday: workday,
  wednesday: workday,
  thursday: workday,
  friday: workday,
  saturday: [],
  sunday: [],
}

const defaultSchedule: Schedule = {
  weekly: defaultWeekly,
  overrides: [],
  bookingWindow,
}

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: crypto.randomUUID(),
    eventType: {
      id: '7b0c4c3e-8a43-4d5e-9d6a-2f1e0a7f0c11',
      title: 'Консультация',
      hidden: false,
    },
    // Вторник 3 ноября, 10:00–10:30 по Москве
    start: '2026-11-03T07:00:00Z',
    end: '2026-11-03T07:30:00Z',
    name: 'Иван Петров',
    email: 'ivan@example.com',
    cancelled: false,
    ...overrides,
  }
}

function serveEditor({
  schedule = defaultSchedule,
  bookings = [],
}: { schedule?: Schedule; bookings?: Booking[] } = {}) {
  server.use(
    handleGetOwner({
      body: { name: 'Анна Смирнова', timeZone: 'Europe/Moscow' },
    }),
    handleGetSchedule({ body: schedule }),
    handleListBookings({ body: bookings }),
  )
}

// Ячейка матрицы: день недели и получас по часам владельца
const cell = (day: string, time: string) =>
  screen.getByRole('gridcell', { name: `${day}, ${time}` })

const isOpen = (day: string, time: string) =>
  cell(day, time).getAttribute('aria-selected') === 'true'

// Протягивание мышью от одной ячейки до другой
function drag(from: HTMLElement, to: HTMLElement) {
  fireEvent.mouseDown(from)
  fireEvent.mouseEnter(to)
  fireEvent.mouseUp(to)
}

function dayMenu(day: string, item: string) {
  fireEvent.click(screen.getByRole('button', { name: `Действия: ${day}` }))
  fireEvent.click(screen.getByRole('menuitem', { name: item }))
}

async function openEditor() {
  renderApp('/admin/schedule')
  return screen.findByRole('grid', { name: 'Неделя' })
}

beforeEach(() => {
  vi.setSystemTime(today)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('редактор расписания', () => {
  it('матрица с понедельника, 06:00–23:00, открыто время из расписания по поясу владельца', async () => {
    serveEditor()
    const grid = await openEditor()

    const columns = within(grid)
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
    expect(columns).toEqual(['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'])
    expect(cell('Понедельник', '06:00')).toBeInTheDocument()
    expect(cell('Понедельник', '22:30')).toBeInTheDocument()
    expect(
      screen.queryByRole('gridcell', { name: 'Понедельник, 05:30' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('gridcell', { name: 'Понедельник, 23:00' }),
    ).not.toBeInTheDocument()
    expect(isOpen('Понедельник', '09:00')).toBe(true)
    expect(isOpen('Пятница', '17:30')).toBe(true)
    expect(isOpen('Понедельник', '08:30')).toBe(false)
    expect(isOpen('Понедельник', '18:00')).toBe(false)
    expect(isOpen('Суббота', '12:00')).toBe(false)
    expect(
      screen.getByText('Время по поясу владельца: Europe/Moscow'),
    ).toBeInTheDocument()
  })

  it('«Ночные часы» показывают сутки', async () => {
    serveEditor({
      schedule: {
        ...defaultSchedule,
        weekly: {
          ...defaultWeekly,
          sunday: [{ start: '23:00', end: '24:00' }],
        },
      },
    })
    await openEditor()

    fireEvent.click(screen.getByRole('switch', { name: 'Ночные часы' }))

    expect(cell('Понедельник', '00:00')).toBeInTheDocument()
    expect(isOpen('Воскресенье', '23:30')).toBe(true)
    expect(isOpen('Воскресенье', '22:30')).toBe(false)
  })

  it('протягивание от открытой ячейки закрывает прямоугольник', async () => {
    serveEditor()
    await openEditor()

    drag(cell('Понедельник', '09:00'), cell('Вторник', '10:00'))

    for (const day of ['Понедельник', 'Вторник']) {
      expect(isOpen(day, '09:00')).toBe(false)
      expect(isOpen(day, '09:30')).toBe(false)
      expect(isOpen(day, '10:00')).toBe(false)
      expect(isOpen(day, '10:30')).toBe(true)
    }
    expect(isOpen('Среда', '09:00')).toBe(true)
  })

  it('протягивание от закрытой ячейки открывает прямоугольник, снизу вверх тоже', async () => {
    serveEditor()
    await openEditor()

    drag(cell('Воскресенье', '11:00'), cell('Суббота', '10:00'))

    for (const day of ['Суббота', 'Воскресенье']) {
      expect(isOpen(day, '09:30')).toBe(false)
      expect(isOpen(day, '10:00')).toBe(true)
      expect(isOpen(day, '10:30')).toBe(true)
      expect(isOpen(day, '11:00')).toBe(true)
      expect(isOpen(day, '11:30')).toBe(false)
    }
    expect(isOpen('Пятница', '08:00')).toBe(false)
  })

  it('щелчок по одной ячейке переключает её', async () => {
    serveEditor()
    await openEditor()

    drag(cell('Суббота', '12:00'), cell('Суббота', '12:00'))

    expect(isOpen('Суббота', '12:00')).toBe(true)
    expect(isOpen('Суббота', '12:30')).toBe(false)
  })

  describe('меню дня', () => {
    // Понедельник 10:00–12:00, остальные будни 9:00–18:00
    const custom = {
      ...defaultSchedule,
      weekly: { ...defaultWeekly, monday: [{ start: '10:00', end: '12:00' }] },
    }

    it('«Копировать на» → «Все будни» заменяет будни, выходные не трогает', async () => {
      serveEditor({ schedule: custom })
      await openEditor()

      dayMenu('Понедельник', 'Все будни')

      for (const day of ['Вторник', 'Среда', 'Четверг', 'Пятница']) {
        expect(isOpen(day, '09:30')).toBe(false)
        expect(isOpen(day, '10:00')).toBe(true)
        expect(isOpen(day, '11:30')).toBe(true)
        expect(isOpen(day, '12:00')).toBe(false)
      }
      expect(isOpen('Суббота', '10:00')).toBe(false)
    })

    it('«Копировать на» → «Все дни» заменяет всю неделю', async () => {
      serveEditor({ schedule: custom })
      await openEditor()

      dayMenu('Понедельник', 'Все дни')

      expect(isOpen('Суббота', '10:00')).toBe(true)
      expect(isOpen('Воскресенье', '11:30')).toBe(true)
      expect(isOpen('Вторник', '09:00')).toBe(false)
    })

    it('«Копировать на» конкретный день', async () => {
      serveEditor({ schedule: custom })
      await openEditor()

      dayMenu('Понедельник', 'Суббота')

      expect(isOpen('Суббота', '10:00')).toBe(true)
      expect(isOpen('Воскресенье', '10:00')).toBe(false)
      expect(isOpen('Вторник', '09:00')).toBe(true)
    })

    it('«Очистить день» закрывает весь день', async () => {
      serveEditor()
      await openEditor()

      dayMenu('Среда', 'Очистить день')

      expect(isOpen('Среда', '09:00')).toBe(false)
      expect(isOpen('Среда', '17:30')).toBe(false)
      expect(isOpen('Четверг', '09:00')).toBe(true)
    })
  })

  describe('черновик', () => {
    const saveButton = () => screen.getByRole('button', { name: 'Сохранить' })
    const cancelButton = () => screen.getByRole('button', { name: 'Отменить' })

    it('без правок кнопки выключены, правка включает их', async () => {
      serveEditor()
      await openEditor()

      expect(saveButton()).toBeDisabled()
      expect(cancelButton()).toBeDisabled()

      dayMenu('Среда', 'Очистить день')

      expect(
        screen.getByText('Есть несохранённые изменения'),
      ).toBeInTheDocument()
      expect(saveButton()).toBeEnabled()
      expect(cancelButton()).toBeEnabled()
    })

    it('«Отменить» возвращает сохранённое расписание', async () => {
      serveEditor()
      await openEditor()
      dayMenu('Среда', 'Очистить день')

      fireEvent.click(cancelButton())

      expect(isOpen('Среда', '09:00')).toBe(true)
      expect(saveButton()).toBeDisabled()
      expect(
        screen.queryByText('Есть несохранённые изменения'),
      ).not.toBeInTheDocument()
    })

    it('«Сохранить» отправляет неделю промежутками и исключения, уведомляет', async () => {
      const overrides = [
        { date: '2026-10-30', ranges: [] },
        { date: '2026-11-20', ranges: [{ start: '10:00', end: '12:00' }] },
      ]
      const sent: UpdateSchedule[] = []
      serveEditor({ schedule: { ...defaultSchedule, overrides } })
      server.use(
        handleUpdateSchedule(async ({ request }) => {
          const body = await request.json()
          sent.push(body)
          return HttpResponse.json({ ...body, bookingWindow })
        }),
      )
      await openEditor()
      dayMenu('Среда', 'Очистить день')
      // Суббота 10:00–11:00 и 11:00–12:00 сливаются в один промежуток
      drag(cell('Суббота', '10:00'), cell('Суббота', '10:30'))
      drag(cell('Суббота', '11:00'), cell('Суббота', '11:30'))
      drag(cell('Воскресенье', '22:00'), cell('Воскресенье', '22:30'))
      fireEvent.click(screen.getByRole('switch', { name: 'Ночные часы' }))
      drag(cell('Воскресенье', '23:00'), cell('Воскресенье', '23:30'))

      fireEvent.click(saveButton())

      expect(
        await screen.findByText('Расписание сохранено'),
      ).toBeInTheDocument()
      expect(sent).toEqual([
        {
          weekly: {
            ...defaultWeekly,
            wednesday: [],
            saturday: [{ start: '10:00', end: '12:00' }],
            sunday: [{ start: '22:00', end: '24:00' }],
          },
          overrides,
        },
      ])
      expect(saveButton()).toBeDisabled()
      expect(isOpen('Суббота', '11:30')).toBe(true)
    })

    it('сбой сохранения: уведомление, черновик остаётся', async () => {
      serveEditor()
      server.use(
        handleUpdateSchedule(() =>
          HttpResponse.json<ApiError>(
            { code: 'internal_error', message: 'Внутренняя ошибка сервера' },
            { status: 500 },
          ),
        ),
      )
      await openEditor()
      dayMenu('Среда', 'Очистить день')

      fireEvent.click(saveButton())

      expect(
        await screen.findByText('Не удалось сохранить. Попробуйте ещё раз.'),
      ).toBeInTheDocument()
      expect(isOpen('Среда', '09:00')).toBe(false)
      expect(saveButton()).toBeEnabled()
    })
  })

  it('полоски предстоящих бронирований окна записи на датах без исключений, с подсказкой', async () => {
    serveEditor({
      schedule: {
        ...defaultSchedule,
        overrides: [
          { date: '2026-11-05', ranges: [{ start: '10:00', end: '11:00' }] },
        ],
      },
      bookings: [
        booking(),
        // Вторник 10 ноября, 10:00–11:00 по Москве
        booking({
          start: '2026-11-10T07:00:00Z',
          end: '2026-11-10T08:00:00Z',
          name: 'Мария Котова',
        }),
        booking({
          start: '2026-11-04T07:00:00Z',
          end: '2026-11-04T07:30:00Z',
          name: 'Отменённый гость',
          cancelled: true,
        }),
        // Четверг 5 ноября — дата с исключением
        booking({
          start: '2026-11-05T07:00:00Z',
          end: '2026-11-05T07:30:00Z',
          name: 'Гость в исключении',
        }),
        // Пятница 20 ноября — за окном записи
        booking({
          start: '2026-11-20T07:00:00Z',
          end: '2026-11-20T07:30:00Z',
          name: 'Гость за окном',
        }),
      ],
    })
    await openEditor()

    fireEvent.mouseEnter(cell('Вторник', '10:00'))
    expect(
      await screen.findByText('вт, 3 ноября, 10:00–10:30 · Иван Петров'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('вт, 10 ноября, 10:00–11:00 · Мария Котова'),
    ).toBeInTheDocument()
    fireEvent.mouseLeave(cell('Вторник', '10:00'))

    fireEvent.mouseEnter(cell('Вторник', '10:30'))
    await waitFor(() =>
      expect(screen.queryByText(/Иван Петров/)).not.toBeInTheDocument(),
    )
    expect(screen.getByText(/Мария Котова/)).toBeInTheDocument()

    for (const [day, time] of [
      ['Среда', '10:00'],
      ['Четверг', '10:00'],
      ['Пятница', '10:00'],
    ]) {
      fireEvent.mouseEnter(cell(day, time))
    }
    expect(screen.queryByText(/Отменённый гость/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Гость в исключении/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Гость за окном/)).not.toBeInTheDocument()
  })

  describe('конфликт с бронированиями', () => {
    const line = 'вт, 3 ноября, 10:00–10:30 — Иван Петров (Консультация)'
    const alertTitle =
      'Так сохранить нельзя: бронирования окажутся вне доступного времени'

    it('черновик конфликтует: Alert со списком, «Сохранить» открывает «Сохранить нельзя» без запроса', async () => {
      serveEditor({
        bookings: [
          booking(),
          booking({ name: 'Отменённый гость', cancelled: true }),
        ],
      })
      await openEditor()
      expect(screen.queryByText(alertTitle)).not.toBeInTheDocument()

      dayMenu('Вторник', 'Очистить день')

      const alert = screen.getByRole('alert')
      expect(within(alert).getByText(alertTitle)).toBeInTheDocument()
      expect(within(alert).getByText(line)).toBeInTheDocument()
      expect(
        within(alert).queryByText(/Отменённый гость/),
      ).not.toBeInTheDocument()

      // Хендлера сохранения нет: запрос уронил бы тест
      fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
      const dialog = await screen.findByRole('dialog', {
        name: 'Сохранить нельзя',
      })
      expect(within(dialog).getByText(line)).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('button', { name: 'Понятно' }))
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      )
      expect(isOpen('Вторник', '10:00')).toBe(false)
    })

    it('черновик, который снова оставляет время бронированию, убирает Alert', async () => {
      serveEditor({ bookings: [booking()] })
      await openEditor()
      dayMenu('Вторник', 'Очистить день')

      drag(cell('Вторник', '10:00'), cell('Вторник', '10:00'))

      expect(screen.queryByText(alertTitle)).not.toBeInTheDocument()
    })

    it('409 от сервера: «Сохранить нельзя» со списком сервера, бронирования перечитываются', async () => {
      const known: Booking[] = []
      serveEditor()
      server.use(
        handleListBookings(() => HttpResponse.json(known)),
        handleUpdateSchedule(() => {
          // Гость успел забронировать, пока владелец правил черновик
          known.push(booking())
          return HttpResponse.json<ApiError>(
            {
              code: 'schedule_conflicts_with_bookings',
              message: 'Бронирования окажутся вне доступного времени.',
              bookings: known,
            },
            { status: 409 },
          )
        }),
      )
      await openEditor()
      dayMenu('Вторник', 'Очистить день')

      fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

      const dialog = await screen.findByRole('dialog', {
        name: 'Сохранить нельзя',
      })
      expect(within(dialog).getByText(line)).toBeInTheDocument()
      expect(await screen.findByText(alertTitle)).toBeInTheDocument()
      expect(
        screen.queryByText('Не удалось сохранить. Попробуйте ещё раз.'),
      ).not.toBeInTheDocument()
    })
  })
})
