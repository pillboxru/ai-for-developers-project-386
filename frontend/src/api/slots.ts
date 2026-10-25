import { listSlotsOptions } from './generated/@tanstack/react-query.gen.ts'

// Окно записи и слоты типа события на всё окно, моменты в UTC. По дням
// гостя их раскладывает фронтенд: пояс гостя сервер не знает
export const slotsQuery = (eventTypeId: string) =>
  listSlotsOptions({ path: { eventTypeId } })
