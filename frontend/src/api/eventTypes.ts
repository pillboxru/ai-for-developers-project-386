import type { QueryClient } from '@tanstack/react-query'
import {
  createEventTypeMutation,
  getEventTypeOptions,
  listAdminEventTypesOptions,
  listAdminEventTypesQueryKey,
  listEventTypesOptions,
  listEventTypesQueryKey,
} from './generated/@tanstack/react-query.gen.ts'

// Все типы событий владельца, включая скрытые, в порядке создания
export const adminEventTypesQuery = () => listAdminEventTypesOptions()

// Видимые гостю типы в порядке создания
export const eventTypesQuery = () => listEventTypesOptions()

// Тип, на который записывается гость. Скрытый отвечает 404, как несуществующий
export const eventTypeQuery = (eventTypeId: string) =>
  getEventTypeOptions({ path: { eventTypeId } })

export const createEventTypeMutationOptions = () => createEventTypeMutation()

// После любого изменения типа событий: перечитываются списки владельца и гостя
export function invalidateEventTypes(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: listAdminEventTypesQueryKey() }),
    queryClient.invalidateQueries({ queryKey: listEventTypesQueryKey() }),
  ])
}
