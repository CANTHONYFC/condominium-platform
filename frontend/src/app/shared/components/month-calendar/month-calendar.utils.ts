export interface MonthCalendarEventDetail {
  title: string
  subtitle?: string
  statusLabel?: string
  contactName?: string
  contactRole?: string
  unitCode?: string
  email?: string
  phone?: string
  note?: string
}

export interface MonthCalendarEvent {
  id: string
  date: string
  endDate?: string
  label: string
  sublabel?: string
  detail?: MonthCalendarEventDetail
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray'
}

export interface MonthCalendarCell {
  key: string
  day: number | null
  date: Date | null
  isToday: boolean
  isCurrentMonth: boolean
  events: MonthCalendarEvent[]
}

export function buildMonthGrid (year: number, month: number, events: MonthCalendarEvent[]): MonthCalendarCell[] {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startPad = (first.getDay() + 6) % 7 // Monday = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const byDay = new Map<number, MonthCalendarEvent[]>()
  for (const ev of events) {
    const start = new Date(ev.date)
    const end = new Date(ev.endDate ?? ev.date)
    start.setHours(12, 0, 0, 0)
    end.setHours(12, 0, 0, 0)
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      if (cursor.getFullYear() !== year || cursor.getMonth() !== month) continue
      const day = cursor.getDate()
      const bucket = byDay.get(day) ?? []
      if (!bucket.some((item) => item.id === ev.id)) bucket.push(ev)
      byDay.set(day, bucket)
    }
  }

  const cells: MonthCalendarCell[] = []
  for (let i = 0; i < startPad; i++) {
    cells.push({ key: `pad-${i}`, day: null, date: null, isToday: false, isCurrentMonth: false, events: [] })
  }
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day)
    cells.push({
      key: `${year}-${month}-${day}`,
      day,
      date,
      isToday: date.getTime() === today.getTime(),
      isCurrentMonth: true,
      events: byDay.get(day) ?? [],
    })
  }
  let pad = 0
  while (cells.length % 7 !== 0) {
    cells.push({ key: `pad-end-${pad++}`, day: null, date: null, isToday: false, isCurrentMonth: false, events: [] })
  }
  return cells
}

export function monthRangeIso (year: number, month: number) {
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
