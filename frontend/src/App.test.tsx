import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

function renderAt(path: string) {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  )
}

describe('App', () => {
  it.each([
    ['/', 'Запишитесь на звонок в удобное время'],
    ['/book', 'Запись'],
    ['/owner', 'Страница владельца'],
  ])('по адресу %s показывает страницу «%s»', (path, heading) => {
    renderAt(path)

    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it('шапка ведёт на главную страницу и на страницу владельца', () => {
    renderAt('/book')

    expect(
      screen.getByRole('link', { name: 'Запись на звонок' }),
    ).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Для владельца' })).toHaveAttribute(
      'href',
      '/owner',
    )
  })
})
