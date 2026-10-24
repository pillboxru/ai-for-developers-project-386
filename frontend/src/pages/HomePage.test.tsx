import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage.tsx'

describe('HomePage', () => {
  it('рассказывает о сервисе и ведёт на страницу бронирования', () => {
    render(
      <MantineProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </MantineProvider>,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Запишитесь на звонок в удобное время',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Как это работает' }),
    ).toBeInTheDocument()

    const bookLinks = screen.getAllByRole('link', { name: 'Записаться' })
    expect(bookLinks).toHaveLength(2)
    for (const link of bookLinks) {
      expect(link).toHaveAttribute('href', '/book')
    }
  })
})
