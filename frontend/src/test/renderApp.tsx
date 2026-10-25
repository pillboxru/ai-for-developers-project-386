import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation, type Location } from 'react-router'
import App from '../App.tsx'
import { theme } from '../theme.ts'

interface RenderAppOptions {
  // Только для тестов политики повторов: они берут клиент фабрикой
  // приложения (createQueryClient), остальные — клиент без повторов
  queryClient?: QueryClient
}

function LocationSpy({ onLocation }: { onLocation: (l: Location) => void }) {
  onLocation(useLocation())
  return null
}

// Своё приложение на каждый тест: кеш запросов не переходит между тестами,
// а без повторов ошибка API видна сразу, без ожидания повторного запроса
export function renderApp(path = '/', options: RenderAppOptions = {}) {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

  let location: Location | null = null
  const result = render(
    // env="test" выключает анимации и порталы: выпадающий список Select и
    // модалка видны сразу после действия
    <MantineProvider theme={theme} env="test">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <App />
          <LocationSpy onLocation={(next) => (location = next)} />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  )

  // Адрес, на котором приложение сейчас: в MemoryRouter его не видно иначе
  function currentLocation() {
    if (location === null) {
      throw new Error('Приложение ещё не отрисовано')
    }
    return location
  }

  return { ...result, currentLocation }
}
