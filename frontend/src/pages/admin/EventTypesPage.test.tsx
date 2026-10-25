import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  handleCreateEventType,
  handleListAdminEventTypes,
} from '../../api/generated/msw.gen.ts'
import type {
  ApiError,
  CreateEventType,
  EventType,
} from '../../api/generated/types.gen.ts'
import { renderApp } from '../../test/renderApp.tsx'
import { server } from '../../test/server.ts'

function eventType(overrides: Partial<EventType> = {}): EventType {
  return {
    id: crypto.randomUUID(),
    title: 'Консультация',
    durationMinutes: 30,
    slotStepMinutes: 30,
    hidden: false,
    hasBookings: false,
    ...overrides,
  }
}

describe('типы событий владельца', () => {
  it('без типов показывает пустое состояние с кнопкой создания', async () => {
    server.use(handleListAdminEventTypes({ body: [] }))
    renderApp('/admin/event-types')

    expect(
      await screen.findByRole('heading', { name: 'Типов событий пока нет' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Создайте первый, чтобы гости могли записаться.'),
    ).toBeInTheDocument()

    const main = within(screen.getByRole('main'))
    fireEvent.click(main.getByRole('button', { name: 'Создать тип события' }))
    expect(
      await screen.findByRole('dialog', { name: 'Новый тип события' }),
    ).toBeInTheDocument()
  })

  it('показывает типы таблицей в порядке создания', async () => {
    server.use(
      handleListAdminEventTypes({
        body: [
          eventType({ title: 'Знакомство', durationMinutes: 15 }),
          eventType({
            title: 'Разбор',
            durationMinutes: 90,
            slotStepMinutes: 60,
            hidden: true,
          }),
        ],
      }),
    )
    renderApp('/admin/event-types')

    const table = await screen.findByRole('table')
    const rows = within(table)
      .getAllByRole('row')
      .map((row) =>
        within(row)
          .queryAllByRole('cell')
          .map((cell) => cell.textContent),
      )
    expect(rows).toEqual([
      [],
      ['Знакомство', '15 мин', '30 мин', ''],
      ['Разбор', '1 ч 30 мин', '1 ч', 'Скрыт'],
    ])
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Название', 'Длительность', 'Шаг', ''])
    expect(
      screen.getByRole('button', { name: 'Создать тип события' }),
    ).toBeInTheDocument()
  })
})

async function openCreateModal() {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Создать тип события' }),
  )
  return within(
    await screen.findByRole('dialog', { name: 'Новый тип события' }),
  )
}

describe('модалка создания типа события', () => {
  it('открывается с полями и значениями по умолчанию', async () => {
    server.use(handleListAdminEventTypes({ body: [] }))
    renderApp('/admin/event-types')

    const modal = await openCreateModal()

    expect(modal.getByRole('textbox', { name: 'Название' })).toHaveValue('')
    expect(modal.getByRole('textbox', { name: 'Название' })).toBeRequired()
    expect(modal.getByRole('textbox', { name: 'Описание' })).toHaveValue('')
    expect(modal.getByRole('combobox', { name: 'Длительность' })).toHaveValue(
      '30 мин',
    )
    expect(modal.getByRole('combobox', { name: 'Шаг' })).toHaveValue('30 мин')
    expect(
      modal.getByText('Через сколько минут друг от друга начинаются слоты'),
    ).toBeInTheDocument()
    expect(
      modal.getByRole('switch', { name: 'Показывать гостям' }),
    ).toBeChecked()

    fireEvent.click(modal.getByRole('combobox', { name: 'Длительность' }))
    const options = (await screen.findAllByRole('option')).map(
      (option) => option.textContent,
    )
    expect(options).toEqual([
      '15 мин',
      '30 мин',
      '45 мин',
      '1 ч',
      '1 ч 15 мин',
      '1 ч 30 мин',
      '1 ч 45 мин',
      '2 ч',
      '2 ч 15 мин',
      '2 ч 30 мин',
      '2 ч 45 мин',
      '3 ч',
      '3 ч 15 мин',
      '3 ч 30 мин',
      '3 ч 45 мин',
      '4 ч',
    ])
  })

  it('сохраняет тип, закрывается, уведомляет и перезагружает список', async () => {
    const stored: EventType[] = []
    const sent: CreateEventType[] = []
    server.use(
      handleListAdminEventTypes(() => HttpResponse.json(stored)),
      handleCreateEventType(async ({ request }) => {
        const body = await request.json()
        sent.push(body)
        const created = eventType({ ...body })
        stored.push(created)
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    renderApp('/admin/event-types')

    const modal = await openCreateModal()
    fireEvent.change(modal.getByRole('textbox', { name: 'Название' }), {
      target: { value: '  Разбор кода  ' },
    })
    fireEvent.change(modal.getByRole('textbox', { name: 'Описание' }), {
      target: { value: '   ' },
    })
    fireEvent.click(modal.getByRole('combobox', { name: 'Длительность' }))
    fireEvent.click(await screen.findByRole('option', { name: '1 ч 30 мин' }))
    fireEvent.click(modal.getByRole('switch', { name: 'Показывать гостям' }))
    fireEvent.click(modal.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Тип события сохранён')).toBeInTheDocument()
    expect(sent).toEqual([
      {
        title: 'Разбор кода',
        durationMinutes: 90,
        slotStepMinutes: 30,
        hidden: true,
      },
    ])
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Новый тип события' }),
      ).not.toBeInTheDocument(),
    )
    const table = await screen.findByRole('table')
    expect(within(table).getByText('Разбор кода')).toBeInTheDocument()
    expect(within(table).getByText('Скрыт')).toBeInTheDocument()
  })

  it('занятое название показывает ошибку под полем, модалка остаётся', async () => {
    server.use(
      handleListAdminEventTypes({ body: [] }),
      handleCreateEventType(() =>
        HttpResponse.json<ApiError>(
          {
            code: 'event_type_title_taken',
            message: 'Тип события с таким названием уже есть',
            fieldErrors: [
              {
                field: 'title',
                message: 'Тип события с таким названием уже есть',
              },
            ],
          },
          { status: 409 },
        ),
      ),
    )
    renderApp('/admin/event-types')

    const modal = await openCreateModal()
    const title = modal.getByRole('textbox', { name: 'Название' })
    fireEvent.change(title, { target: { value: 'Консультация' } })
    fireEvent.click(modal.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(title).toHaveAccessibleDescription(
        'Тип события с таким названием уже есть',
      ),
    )
    expect(
      screen.getByRole('dialog', { name: 'Новый тип события' }),
    ).toBeInTheDocument()
    expect(title).toHaveValue('Консультация')
  })

  it('при сбое сохранения уведомляет и сохраняет ввод', async () => {
    let attempts = 0
    server.use(
      handleListAdminEventTypes({ body: [] }),
      handleCreateEventType(() => {
        attempts += 1
        return HttpResponse.json<ApiError>(
          { code: 'internal_error', message: 'Внутренняя ошибка сервера' },
          { status: 500 },
        )
      }),
    )
    renderApp('/admin/event-types')

    const modal = await openCreateModal()
    fireEvent.change(modal.getByRole('textbox', { name: 'Название' }), {
      target: { value: 'Консультация' },
    })
    fireEvent.change(modal.getByRole('textbox', { name: 'Описание' }), {
      target: { value: 'Обсудим задачу' },
    })
    fireEvent.click(modal.getByRole('button', { name: 'Сохранить' }))

    expect(
      await screen.findByText('Не удалось сохранить. Попробуйте ещё раз.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: 'Новый тип события' }),
    ).toBeInTheDocument()
    expect(modal.getByRole('textbox', { name: 'Название' })).toHaveValue(
      'Консультация',
    )
    expect(modal.getByRole('textbox', { name: 'Описание' })).toHaveValue(
      'Обсудим задачу',
    )
    expect(attempts).toBe(1)
  })

  it.each([
    ['пустое название', '   ', 'Обязательное поле'],
    ['длинное название', 'а'.repeat(101), 'Не больше 100 символов'],
  ])('%s не отправляется', async (_case, value, message) => {
    server.use(handleListAdminEventTypes({ body: [] }))
    renderApp('/admin/event-types')

    const modal = await openCreateModal()
    const title = modal.getByRole('textbox', { name: 'Название' })
    fireEvent.change(title, { target: { value } })
    fireEvent.click(modal.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(title).toHaveAccessibleDescription(message))
  })

  it('описание длиннее 1000 символов не отправляется', async () => {
    server.use(handleListAdminEventTypes({ body: [] }))
    renderApp('/admin/event-types')

    const modal = await openCreateModal()
    fireEvent.change(modal.getByRole('textbox', { name: 'Название' }), {
      target: { value: 'Консультация' },
    })
    const description = modal.getByRole('textbox', { name: 'Описание' })
    fireEvent.change(description, { target: { value: 'а'.repeat(1001) } })
    fireEvent.click(modal.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(description).toHaveAccessibleDescription(
        'Не больше 1000 символов',
      ),
    )
  })
})
