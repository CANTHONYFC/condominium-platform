import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatDialog } from '@angular/material/dialog'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import { MaintenanceApiService } from '../../core/services/maintenance-api.service'
import { NotifyService } from '../../core/services/notify.service'
import { MonthCalendarComponent } from '../../shared/components/month-calendar/month-calendar.component'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'
import { monthRangeIso, type MonthCalendarEvent } from '../../shared/components/month-calendar/month-calendar.utils'
import type { Condominium, MaintenanceEvent } from '../../core/models/domain.models'
import { MaintenanceFormDialogComponent } from './maintenance-form.dialog'
import { environment } from '../../../environments/environment'

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MonthCalendarComponent,
    PageHeadingComponent,
  ],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.scss',
})
export class MaintenanceComponent implements OnInit {
  private readonly condosApi = inject(CondominiumsApiService)
  private readonly api = inject(MaintenanceApiService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly items = signal<MaintenanceEvent[]>([])
  readonly calendarEvents = signal<MonthCalendarEvent[]>([])
  readonly condominiums = signal<Condominium[]>([])
  readonly summary = signal({ total: 0, totalCost: 0, completed: 0 })

  selectedCondoId = ''
  calendarYear = new Date().getFullYear()
  calendarMonth = new Date().getMonth()
  serverUrl = environment.serverUrl

  readonly calendarLegend = computed(() => [
    { color: 'purple', label: 'Programado' },
    { color: 'orange', label: 'En progreso' },
    { color: 'green', label: 'Completado' },
    { color: 'red', label: 'Cancelado' },
  ])

  ngOnInit () {
    this.condosApi.list({ limit: 100 }).subscribe({
      next: (r) => {
        this.condominiums.set(r.data)
        if (r.data.length) {
          this.selectedCondoId = r.data[0].id
          this.load()
        }
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  onCalendarMonthChange (ev: { year: number; month: number }) {
    this.calendarYear = ev.year
    this.calendarMonth = ev.month
    this.load()
  }

  load () {
    if (!this.selectedCondoId) return
    const { from, to } = monthRangeIso(this.calendarYear, this.calendarMonth)
    this.api.list({
      condominiumId: this.selectedCondoId,
      type: 'MAINTENANCE',
      from,
      to,
      limit: 100,
    }).subscribe({
      next: (r) => {
        this.items.set(r.data)
        this.calendarEvents.set(r.data.map((m) => ({
          id: m.id,
          date: m.startAt,
          endDate: m.endAt,
          label: m.title,
          sublabel: this.eventSublabel(m),
          color: this.eventColor(m.status),
          detail: this.eventDetail(m),
        })))
      },
      error: () => this.notify.error('Error al cargar mantenimientos'),
    })
    this.api.summary(this.selectedCondoId, from, to).subscribe({
      next: (s) => this.summary.set(s),
    })
  }

  eventColor (status: string): MonthCalendarEvent['color'] {
    if (status === 'COMPLETED') return 'green'
    if (status === 'IN_PROGRESS') return 'orange'
    if (status === 'CANCELLED') return 'red'
    return 'purple'
  }

  eventDetail (m: MaintenanceEvent) {
    const start = new Date(m.startAt)
    const end = new Date(m.endAt)
    const fmt = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    const dateFmt = start.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
    const statusLabel = m.status === 'SCHEDULED'
      ? 'Programado'
      : m.status === 'IN_PROGRESS'
        ? 'En progreso'
        : m.status === 'COMPLETED'
          ? 'Completado'
          : m.status === 'CANCELLED'
            ? 'Cancelado'
            : m.status

    return {
      title: m.title,
      subtitle: `${dateFmt} · ${fmt(start)} — ${fmt(end)}`,
      statusLabel,
      note: [
        m.commonArea?.name ? `Área: ${m.commonArea.name}` : null,
        m.vendor ? `Proveedor: ${m.vendor}` : null,
        m.cost ? `Costo: S/ ${Number(m.cost).toFixed(2)}` : null,
        m.description || null,
      ].filter(Boolean).join(' · ') || undefined,
    }
  }

  eventSublabel (m: MaintenanceEvent) {
    const parts: string[] = []
    if (m.commonArea?.name) parts.push(m.commonArea.name)
    if (m.vendor) parts.push(m.vendor)
    if (m.cost) parts.push(`S/ ${Number(m.cost).toFixed(2)}`)
    return parts.length ? parts.join(' · ') : undefined
  }

  areaLabel (m: MaintenanceEvent) {
    return m.commonArea?.name ?? '—'
  }

  statusClass (s: string) {
    if (s === 'COMPLETED') return 'badge badge--green'
    if (s === 'IN_PROGRESS') return 'badge badge--orange'
    if (s === 'CANCELLED') return 'badge badge--red'
    return 'badge badge--gray'
  }

  openForm (item?: MaintenanceEvent, prefillDate?: Date) {
    const ref = this.dialog.open(MaintenanceFormDialogComponent, {
      width: '520px',
      data: { item, condominiumId: this.selectedCondoId, prefillDate },
    })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      const req = item ? this.api.update(item.id, v) : this.api.create({ ...v, condominiumId: this.selectedCondoId })
      req.subscribe({
        next: () => { this.notify.success('Mantenimiento guardado'); this.load() },
        error: () => this.notify.error('Error'),
      })
    })
  }

  onCalendarDayClick (date: Date) {
    this.openForm(undefined, date)
  }

  onCalendarEventClick (ev: MonthCalendarEvent) {
    const item = this.items().find((m) => m.id === ev.id)
    if (item) this.openForm(item)
  }

  remove (item: MaintenanceEvent) {
    this.api.remove(item.id).subscribe({
      next: () => { this.notify.success('Eliminado'); this.load() },
    })
  }
}
