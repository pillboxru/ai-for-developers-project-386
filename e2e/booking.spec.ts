import { expect, test, type Page } from '@playwright/test'

async function fillBookingForm(
  page: Page,
  guest: { name: string; email: string; comment: string },
) {
  await page.getByRole('textbox', { name: /^Имя/ }).fill(guest.name)
  await page.getByRole('textbox', { name: /^Email/ }).fill(guest.email)
  await page.getByRole('textbox', { name: 'Комментарий' }).fill(guest.comment)
}

test('два гостя бронируют один слот: первый записан, второй видит отказ и не теряет данные', async ({
  browser,
  page,
  request,
}) => {
  const created = await request.post('/api/admin/event-types', {
    data: {
      title: `Гонка за слот ${Date.now()}`,
      durationMinutes: 30,
      slotStepMinutes: 30,
      hidden: false,
    },
  })
  expect(created.ok()).toBe(true)
  const eventType: { id: string } = await created.json()
  // Время сервера не фиксируется: берём первый свободный слот, который он
  // сейчас вычисляет (бронирования других сценариев уже учтены)
  const slotsResponse = await request.get(
    `/api/event-types/${eventType.id}/slots`,
  )
  const { slots }: { slots: { start: string }[] } = await slotsResponse.json()
  expect(slots.length).toBeGreaterThan(0)
  const slotUrl = `/book/${eventType.id}?slot=${slots[0].start}`

  // Второй гость — в отдельном контексте браузера, как на другом устройстве
  const secondContext = await browser.newContext()
  const second = await secondContext.newPage()
  await page.goto(slotUrl)
  await second.goto(slotUrl)

  await fillBookingForm(page, {
    name: 'Первый гость',
    email: 'first@example.com',
    comment: 'Успел первым',
  })
  const secondGuest = {
    name: 'Второй гость',
    email: 'second@example.com',
    comment: 'Опоздал на секунду',
  }
  await fillBookingForm(second, secondGuest)

  await page.getByRole('button', { name: 'Забронировать' }).click()
  await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()

  await second.getByRole('button', { name: 'Забронировать' }).click()
  await expect(second.getByRole('alert')).toContainText(
    'Это время уже недоступно. Выберите другое.',
  )
  await expect(second).not.toHaveURL(/slot=/)

  // Новый слот — и форма второго гостя с его данными
  await second.getByRole('group').first().getByRole('button').first().click()
  await expect(second.getByRole('textbox', { name: /^Имя/ })).toHaveValue(
    secondGuest.name,
  )
  await expect(second.getByRole('textbox', { name: /^Email/ })).toHaveValue(
    secondGuest.email,
  )
  await expect(
    second.getByRole('textbox', { name: 'Комментарий' }),
  ).toHaveValue(secondGuest.comment)

  await secondContext.close()
})
