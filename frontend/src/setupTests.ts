import '@testing-library/jest-dom/vitest'
import { notifications } from '@mantine/notifications'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './test/server.ts'

// Запрос без хендлера валит тест: иначе он молча уйдёт в сеть или повиснет
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  // Хранилище уведомлений общее на модуль: без очистки уведомление одного
  // теста всплывёт в следующем
  notifications.clean()
})

afterAll(() => server.close())

// jsdom не реализует эти API, а Mantine их использует
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver

// Combobox (Select) прокручивает список к выбранному варианту
window.HTMLElement.prototype.scrollIntoView = () => {}

// Textarea с autosize подписывается на загрузку шрифтов
Object.defineProperty(document, 'fonts', {
  value: {
    addEventListener: () => {},
    removeEventListener: () => {},
  },
})
