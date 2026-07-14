import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'

import { PortalApiService } from '../../../core/services/portal-api.service'
import { ReservationsApiService } from '../../../core/services/reservations-api.service'
import { NotifyService } from '../../../core/services/notify.service'
import type { CommonArea, Reservation } from '../../../core/models/domain.models'
import { MonthCalendarComponent } from '../../../shared/components/month-calendar/month-calendar.component'
import { monthRangeIso, type MonthCalendarEvent } from '../../../shared/components/month-calendar/month-calendar.utils'
import { OwnerReservationDialogComponent } from './owner-reservation-dialog.component'
import { PageHeadingComponent } from '../../../shared/components/page-heading/page-heading.component'

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MonthCalendarComponent,
    PageHeadingComponent,
  ],
  templateUrl: './my-reservations.component.html',
  styleUrl: './my-reservations.component.scss',
})
export class MyReservationsComponent implements OnInit {
  private readonly portalApi = inject(PortalApiService)
  private readonly reservationsApi = inject(ReservationsApiService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly calendarLoading = signal(false)
  readonly items = signal<Reservation[]>([])
  readonly areas = signal<CommonArea[]>([])
  readonly calendarEvents = signal<MonthCalendarEvent[]>([])

  calendarYear = new Date().getFullYear()
  calendarMonth = new Date().getMonth()
  calendarAreaFilterId = ''

  private condominiumId = ''
  readonly unitCode = signal('')
  readonly condominiumName = signal('')

  readonly calendarLegend = [
    { color: 'blue', label: 'Confirmada' },
    { color: 'orange', label: 'Pendiente' },
  ]

  readonly todayEvents = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return this.items()
      .filter((r) => {
        if (r.status === 'CANCELLED') return false
        const start = new Date(r.startAt)
        return start >= today && start < tomorrow
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  })

  readonly upcomingEvents = computed(() => {
    const tomorrow = new Date()
    tomorrow.setHours(0, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return this.items()
      .filter((r) => {
        if (r.status === 'CANCELLED') return false
        return new Date(r.startAt) >= tomorrow
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 6)
  })

  ngOnInit () {
    this.loadContext()
  }

  private loadContext () {
    this.loading.set(true)
    this.portalApi.listMyCommonAreas().subscribe({
      next: (r) => {
        this.condominiumId = r.context.condominiumId
        this.unitCode.set(r.context.unitCode)
        this.condominiumName.set(r.context.condominiumName)
        this.areas.set(r.areas)
        this.loadCalendarEvents()
        this.loading.set(false)
      },
      error: (e) => {
        const msg = e?.error?.message
        this.notify.error(
          typeof msg === 'string' ? msg : 'No se pudo vincular tu cuenta con un departamento',
        )
        this.loading.set(false)
      },
    })
  }

  loadCalendarEvents () {
    if (!this.condominiumId) return
    this.calendarLoading.set(true)
    const { from, to } = monthRangeIso(this.calendarYear, this.calendarMonth)
    this.portalApi.listMyReservations({ from, to, limit: 100 }).subscribe({
      next: (r) => {
        const events: MonthCalendarEvent[] = []
        for (const res of r.data) {
          if (res.status === 'CANCELLED') continue
          if (this.calendarAreaFilterId && res.commonAreaId !== this.calendarAreaFilterId) continue
          events.push({
            id: res.id,
            date: res.startAt,
            label: res.commonArea?.name ?? 'Reserva',
            sublabel: new Date(res.startAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
            color: res.status === 'CONFIRMED' ? 'blue' : 'orange',
          })
        }
        this.calendarEvents.set(events)
        this.items.set(r.data)
        this.calendarLoading.set(false)
      },
      error: (e) => {
        this.calendarLoading.set(false)
        const msg = e?.error?.message
        this.notify.error(typeof msg === 'string' ? msg : 'Error al cargar el calendario')
      },
    })
  }

  onCalendarMonthChange (ev: { year: number; month: number }) {
    this.calendarYear = ev.year
    this.calendarMonth = ev.month
    this.loadCalendarEvents()
  }

  onCalendarAreaFilterChange () {
    this.loadCalendarEvents()
  }

  onCalendarDayClick (date: Date) {
    this.openCreate(date)
  }

  openCreate (prefillDate?: Date) {
    if (!this.condominiumId) {
      this.notify.error('No se encontró tu unidad')
      return
    }
    const ref = this.dialog.open(OwnerReservationDialogComponent, {
      width: '520px',
      data: {
        condominiumId: this.condominiumId,
        unitCode: this.unitCode(),
        portalApi: this.portalApi,
        reservationsApi: this.reservationsApi,
        prefillDate,
        prefillAreaId: this.calendarAreaFilterId || undefined,
      },
    })
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadCalendarEvents()
    })
  }

  statusClass (status: string) {
    if (status === 'CONFIRMED') return 'badge badge--green'
    if (status === 'PENDING') return 'badge badge--orange'
    if (status === 'CANCELLED') return 'badge badge--gray'
    return 'badge badge--blue'
  }

  formatTimeRange (r: Reservation) {
    const start = new Date(r.startAt)
    const end = new Date(r.endAt)
    const fmt = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    return `${fmt(start)} — ${fmt(end)}`
  }
}
