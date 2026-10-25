import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './errors.ts'

// Повторять стоит сбой, который может пройти сам: сеть или ошибку сервера.
// Статуса в брошенной ошибке нет, есть только тело: наш сервер на любой 5xx
// отвечает internal_error, остальные коды ApiError — ответы 4xx. Ошибка без
// тела ApiError — это сеть (TypeError из fetch) или ответ не от нашего сервера
function isTransientError(error: unknown) {
  return isApiError(error) ? error.code === 'internal_error' : true
}

// Клиент приложения. Тесты берут его только для проверки этой политики,
// остальным тестам нужен клиент без повторов (test/renderApp.tsx)
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < 1 && isTransientError(error),
        // Данные меняет только тот, кто на них смотрит, и экран перечитывает
        // их сам после действия: лишние запросы по фокусу и сети не нужны
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      // Повтор действия мог бы создать бронирование или тип второй раз
      mutations: { retry: false },
    },
  })
}
