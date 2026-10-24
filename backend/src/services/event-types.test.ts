import { describe, expect, it } from 'vitest'
import { EventTypeRepository } from '../repositories/event-types.js'
import { EventTypeNotFoundError, EventTypeService } from './event-types.js'

function createService() {
  return new EventTypeService(new EventTypeRepository())
}

describe('EventTypeService', () => {
  it('созданный тип события виден владельцу и не скрыт', () => {
    const service = createService()

    const created = service.create({
      name: 'Консультация',
      description: 'Разбор вашего проекта',
      durationMinutes: 60,
    })

    expect(created).toMatchObject({
      name: 'Консультация',
      description: 'Разбор вашего проекта',
      durationMinutes: 60,
      hidden: false,
    })
    expect(service.listAll()).toEqual([created])
  })

  it('скрытый тип не виден гостю, но остаётся у владельца', () => {
    const service = createService()
    const call = service.create({
      name: 'Созвон',
      description: '',
      durationMinutes: 30,
    })
    const consultation = service.create({
      name: 'Консультация',
      description: '',
      durationMinutes: 60,
    })

    service.update(call.id, { hidden: true })

    expect(service.listVisible()).toEqual([consultation])
    expect(service.listAll()).toEqual([{ ...call, hidden: true }, consultation])
  })

  it('удалённый тип пропадает у владельца и гостя', () => {
    const service = createService()
    const call = service.create({
      name: 'Созвон',
      description: '',
      durationMinutes: 30,
    })

    service.delete(call.id)

    expect(service.listAll()).toEqual([])
    expect(service.listVisible()).toEqual([])
  })

  it('несуществующий тип нельзя изменить или удалить', () => {
    const service = createService()

    expect(() => service.update('missing', { hidden: true })).toThrow(
      EventTypeNotFoundError,
    )
    expect(() => service.delete('missing')).toThrow(EventTypeNotFoundError)
  })
})
