import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

// Ответы API по адресу: App сам ходит в /api/health, страницы — в свои API
function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        Response.json(url === '/api/health' ? { status: 'ok' } : []),
      ),
    ),
  )
}

function renderApp(path: string) {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  )
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('показывает заголовок и статус бекенда', async () => {
    stubApi()

    renderApp('/')

    expect(
      screen.getByRole('heading', { name: 'Запись на звонок' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('ok')).toBeInTheDocument()
  })

  it('на /owner открывает страницу владельца', async () => {
    stubApi()

    renderApp('/owner')

    expect(
      await screen.findByRole('heading', { name: 'Типы событий' }),
    ).toBeInTheDocument()
  })
})
