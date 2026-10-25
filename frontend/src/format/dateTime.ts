// Гость видит время по поясу браузера. Дни и часы считаются через Intl
// с явным поясом: локальные методы Date зависят от пояса процесса

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// Дата момента в поясе как 'YYYY-MM-DD' — в таком виде даты принимает
// DatePicker. Локаль en-CA выбрана ради порядка год-месяц-день
export function dateKeyIn(instant: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant))
}

// Час по часам пояса, 0–23
export function hourIn(instant: string, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(instant)),
  )
}

// «09:00»: 24 часа в любой локали браузера
export function formatTime(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instant))
}

// «пт, 24 октября» для даты 'YYYY-MM-DD'. Полдень UTC и пояс UTC: дата
// не сдвигается ни в каком поясе
export function formatDateKey(dateKey: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateKey}T12:00:00Z`))
}
