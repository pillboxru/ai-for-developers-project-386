import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import OwnerEventTypesPage from './OwnerEventTypesPage.tsx'

const consultation = {
  id: '1',
  name: 'Консультация',
  description: 'Разбор вашего проекта',
  durationMinutes: 60,
  hidden: false,
}

const hiddenCall = {
  id: '2',
  name: 'Созвон',
  description: '',
  durationMinutes: 30,
  hidden: true,
}

function requestBody(fetchMock: Mock<typeof fetch>, call: number) {
  const [, init] = fetchMock.mock.calls[call]
  return JSON.parse(String(init?.body))
}

function renderPage() {
  render(
    // env="test" отключает анимации и порталы модального окна
    <MantineProvider env="test">
      <OwnerEventTypesPage />
    </MantineProvider>,
  )
}

describe('OwnerEventTypesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('показывает все типы, скрытые помечены', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json([consultation, hiddenCall]))
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    const consultationRow = await screen.findByRole('row', {
      name: /Консультация/,
    })
    const callRow = screen.getByRole('row', { name: /Созвон/ })
    expect(within(consultationRow).getByText('60 мин')).toBeInTheDocument()
    expect(within(consultationRow).queryByText('Скрыт')).toBeNull()
    expect(within(callRow).getByText('Скрыт')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/owner/event-types',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('владелец создаёт тип события', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json(consultation, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Добавить тип' }),
    )
    await user.type(screen.getByLabelText('Название'), 'Консультация')
    await user.type(screen.getByLabelText('Описание'), 'Разбор вашего проекта')
    await user.clear(screen.getByLabelText('Длительность, мин'))
    await user.type(screen.getByLabelText('Длительность, мин'), '60')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(
      await screen.findByRole('row', { name: /Консультация/ }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/owner/event-types',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(requestBody(fetchMock, 1)).toEqual({
      name: 'Консультация',
      description: 'Разбор вашего проекта',
      durationMinutes: 60,
    })
  })

  it('не отправляет тип без названия и с неверной длительностью', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([]))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Добавить тип' }),
    )
    await user.clear(screen.getByLabelText('Длительность, мин'))
    await user.type(screen.getByLabelText('Длительность, мин'), '20')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Укажите название')).toBeInTheDocument()
    expect(
      screen.getByText('От 15 до 240 минут, кратно 15'),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('владелец скрывает и показывает тип', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([consultation]))
      .mockResolvedValueOnce(Response.json({ ...consultation, hidden: true }))
      .mockResolvedValueOnce(Response.json(consultation))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    const row = await screen.findByRole('row', { name: /Консультация/ })
    await user.click(within(row).getByRole('button', { name: 'Скрыть' }))

    expect(await within(row).findByText('Скрыт')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/owner/event-types/1',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(requestBody(fetchMock, 1)).toEqual({ hidden: true })

    await user.click(within(row).getByRole('button', { name: 'Показать' }))

    expect(
      await within(row).findByRole('button', { name: 'Скрыть' }),
    ).toBeInTheDocument()
    expect(within(row).queryByText('Скрыт')).toBeNull()
    expect(requestBody(fetchMock, 2)).toEqual({ hidden: false })
  })

  it('владелец редактирует тип в форме с текущими значениями', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([consultation]))
      .mockResolvedValueOnce(
        Response.json({ ...consultation, name: 'Разбор кода' }),
      )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    const row = await screen.findByRole('row', { name: /Консультация/ })
    await user.click(within(row).getByRole('button', { name: 'Изменить' }))
    expect(screen.getByLabelText('Описание')).toHaveValue(
      'Разбор вашего проекта',
    )
    expect(screen.getByLabelText('Длительность, мин')).toHaveValue('60')
    await user.clear(screen.getByLabelText('Название'))
    await user.type(screen.getByLabelText('Название'), 'Разбор кода')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(
      await screen.findByRole('row', { name: /Разбор кода/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Консультация/ })).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/owner/event-types/1',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(requestBody(fetchMock, 1)).toEqual({
      name: 'Разбор кода',
      description: 'Разбор вашего проекта',
      durationMinutes: 60,
    })
  })

  it('владелец удаляет тип', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([consultation]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    const row = await screen.findByRole('row', { name: /Консультация/ })
    await user.click(within(row).getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(row).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/owner/event-types/1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('сообщает, если действие с типом не удалось', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([consultation]))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    const row = await screen.findByRole('row', { name: /Консультация/ })
    await user.click(within(row).getByRole('button', { name: 'Удалить' }))

    expect(
      await screen.findByText('Не удалось изменить тип события'),
    ).toBeInTheDocument()
    expect(row).toBeInTheDocument()
  })
})
