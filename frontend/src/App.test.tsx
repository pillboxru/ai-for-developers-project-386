import { fireEvent, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

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
  it('главная рассказывает о сервисе и ведёт на страницу записи', () => {
    renderApp('/')

    const main = within(screen.getByRole('main'))
    expect(
      main.getByRole('heading', { level: 1, name: 'Календарь звонков' }),
    ).toBeInTheDocument()
    expect(main.getByRole('link', { name: /Записаться/ })).toHaveAttribute(
      'href',
      '/book',
    )
  })

  it('по кнопке «Записаться» открывается страница записи', async () => {
    renderApp('/')

    const main = within(screen.getByRole('main'))
    fireEvent.click(main.getByRole('link', { name: /Записаться/ }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Запись на звонок',
      }),
    ).toBeInTheDocument()
  })
})
