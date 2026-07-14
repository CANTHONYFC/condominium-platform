import { NgClass } from '@angular/common'
import { Component, computed, HostListener, input, output, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

import {
  buildMonthGrid,
  MONTH_NAMES,
  type MonthCalendarCell,
  type MonthCalendarEvent,
  WEEKDAY_LABELS,
} from './month-calendar.utils'

@Component({
  selector: 'app-month-calendar',
  standalone: true,
  imports: [NgClass, MatButtonModule, MatIconModule],
  templateUrl: './month-calendar.component.html',
  styleUrl: './month-calendar.component.scss',
})
export class MonthCalendarComponent {
  readonly year = input.required<number>()
  readonly month = input.required<number>()
  readonly events = input<MonthCalendarEvent[]>([])

  readonly monthChange = output<{ year: number; month: number }>()
  readonly eventClick = output<MonthCalendarEvent>()
  readonly dayClick = output<Date>()

  readonly weekdayLabels = WEEKDAY_LABELS

  readonly title = computed(() => `${MONTH_NAMES[this.month()]} ${this.year()}`)

  readonly cells = computed(() => buildMonthGrid(this.year(), this.month(), this.events()))

  cellTrack (cell: MonthCalendarCell) {
    if (!cell.date) return cell.key
    const ids = cell.events.map((e) => e.id).join('|')
    return `${cell.key}-${ids}`
  }

  readonly activeEvent = signal<MonthCalendarEvent | null>(null)
  readonly popoverX = signal(0)
  readonly popoverY = signal(0)

  private hideTimer?: ReturnType<typeof setTimeout>

  prevMonth () {
    this.hidePopover()
    let y = this.year()
    let m = this.month() - 1
    if (m < 0) { m = 11; y-- }
    this.monthChange.emit({ year: y, month: m })
  }

  nextMonth () {
    this.hidePopover()
    let y = this.year()
    let m = this.month() + 1
    if (m > 11) { m = 0; y++ }
    this.monthChange.emit({ year: y, month: m })
  }

  goToday () {
    this.hidePopover()
    const t = new Date()
    this.monthChange.emit({ year: t.getFullYear(), month: t.getMonth() })
  }

  onDayClick (date: Date | null) {
    this.hidePopover()
    if (date) this.dayClick.emit(date)
  }

  onEventClick (ev: MonthCalendarEvent, $event: Event) {
    $event.stopPropagation()
    this.eventClick.emit(ev)
  }

  onEventEnter (ev: MonthCalendarEvent, target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return
    clearTimeout(this.hideTimer)
    const anchor = target.getBoundingClientRect()
    const { left, top } = this.computePopoverPosition(anchor)
    this.popoverX.set(left)
    this.popoverY.set(top)
    this.activeEvent.set(ev)
  }

  private computePopoverPosition (anchor: DOMRect) {
    const gap = 12
    const margin = 12
    const width = 300
    const height = 300

    const placements = [
      { left: anchor.right + gap, top: anchor.top },
      { left: anchor.left, top: anchor.bottom + gap },
      { left: anchor.left - width - gap, top: anchor.top },
      { left: anchor.left, top: anchor.top - height - gap },
    ]

    const inViewport = (left: number, top: number) =>
      left >= margin
      && top >= margin
      && left + width <= window.innerWidth - margin
      && top + height <= window.innerHeight - margin

    const overlapsAnchor = (left: number, top: number) => !(
      left >= anchor.right + gap
      || left + width <= anchor.left - gap
      || top >= anchor.bottom + gap
      || top + height <= anchor.top - gap
    )

    const preferred = placements.find((p) => inViewport(p.left, p.top) && !overlapsAnchor(p.left, p.top))
    if (preferred) return preferred

    let left = anchor.right + gap
    let top = anchor.top

    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, anchor.left)
      top = anchor.bottom + gap
    }

    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - height - gap)
    }

    if (overlapsAnchor(left, top)) {
      top = anchor.bottom + gap
    }

    left = Math.min(Math.max(left, margin), window.innerWidth - width - margin)
    top = Math.min(Math.max(top, margin), window.innerHeight - height - margin)

    return { left, top }
  }

  onEventLeave () {
    this.scheduleHide()
  }

  onPopoverEnter () {
    clearTimeout(this.hideTimer)
  }

  onPopoverLeave () {
    this.scheduleHide()
  }

  hidePopover () {
    clearTimeout(this.hideTimer)
    this.activeEvent.set(null)
  }

  private scheduleHide () {
    clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => this.activeEvent.set(null), 120)
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange () {
    this.hidePopover()
  }

  statusClass (label?: string) {
    if (!label) return 'event-popover__status--gray'
    const v = label.toLowerCase()
    if (v.includes('confirm')) return 'event-popover__status--green'
    if (v.includes('pend')) return 'event-popover__status--orange'
    if (v.includes('cancel')) return 'event-popover__status--red'
    if (v.includes('bloqueo')) return 'event-popover__status--red'
    return 'event-popover__status--blue'
  }
}
