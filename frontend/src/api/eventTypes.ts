import type { QueryClient } from '@tanstack/react-query'
import {
  createEventTypeMutation,
  listAdminEventTypesOptions,
  listAdminEventTypesQueryKey,
} from './generated/@tanstack/react-query.gen.ts'

// Все типы событий владельца, включая скрытые, в порядке создания
export const adminEventTypesQuery = () => listAdminEventTypesOptions()

export const createEventTypeMutationOptions = () => createEventTypeMutation()

// После любого изменения типа событий: список владельца перечитывается
export function invalidateEventTypes(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: listAdminEventTypesQueryKey(),
  })
}
