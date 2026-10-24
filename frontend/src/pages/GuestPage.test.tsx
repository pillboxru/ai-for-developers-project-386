import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GuestPage from './GuestPage.tsx'

function renderPage() {
  render(
    <MantineProvider>
      <GuestPage />
    </MantineProvider>,
  )
}

describe('GuestPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('показывает типы событий с описанием и длительностью', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json([
        {
          id: '1',
          name: 'Консультация',
          description: 'Разбор вашего проекта',
          durationMinutes: 60,
          hidden: false,
        },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    expect(await screen.findByText('Консультация')).toBeInTheDocument()
    expect(screen.getByText('Разбор вашего проекта')).toBeInTheDocument()
    expect(screen.getByText('60 мин')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/event-types',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('сообщает, если типов событий нет', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(Response.json([])),
    )

    renderPage()

    expect(
      await screen.findByText(
        'Владелец пока не добавил ни одного типа события',
      ),
    ).toBeInTheDocument()
  })
})
