import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { forkJoin, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatChipsModule } from '@angular/material/chips'

import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import { MaintenanceApiService } from '../../core/services/maintenance-api.service'
import { ReservationsApiService } from '../../core/services/reservations-api.service'
import { NotifyService } from '../../core/services/notify.service'
import { MonthCalendarComponent } from '../../shared/components/month-calendar/month-calendar.component'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'
import { monthRangeIso, type MonthCalendarEvent } from '../../shared/components/month-calendar/month-calendar.utils'
import type { CommonArea, Condominium, MaintenanceEvent, Paginated, Reservation } from '../../core/models/domain.models'
import {
  AreaFormDialogComponent,
  BlockFormDialogComponent,
  ReservationFormDialogComponent,
  ScheduleFormDialogComponent,
} from './reservations-dialogs'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const emptyMaintenancePage: Paginated<MaintenanceEvent> = {
  data: [],
  meta: { total: 0, page: 1, limit: 200, totalPages: 0 },
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MonthCalendarComponent,
    PageHeadingComponent,
  ],
  templateUrl: './reservations.component.html',
  styleUrl: './reservations.component.scss',
})
export class ReservationsComponent implements OnInit {
  private readonly condosApi = inject(CondominiumsApiService)
  private readonly api = inject(ReservationsApiService)
  private readonly maintenanceApi = inject(MaintenanceApiService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly condominiums = signal<Condominium[]>([])
  readonly areas = signal<CommonArea[]>([])
  readonly reservations = signal<Reservation[]>([])
  readonly calendarEvents = signal<MonthCalendarEvent[]>([])

  selectedCondoId = ''
  selectedAreaId = ''
  calendarAreaFilterId = ''
  calendarYear = new Date().getFullYear()
  calendarMonth = new Date().getMonth()
  private calendarLoadSeq = 0
  readonly days = DAYS

  readonly calendarLegend = computed(() => [
    { color: 'blue', label: 'Reserva confirmada' },
    { color: 'red', label: 'Bloqueo / mantenimiento' },
    { color: 'orange', label: 'Reserva pendiente' },
  ])

  ngOnInit () {
    this.condosApi.list({ limit: 100 }).subscribe({
      next: (r) => {
        this.condominiums.set(r.data)
        this.loadReservations()
        this.loadCalendarEvents()
        if (r.data.length) {
          this.selectedCondoId = ''
          this.loadAreas()
        }
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  readonly isAllCondos = () => !this.selectedCondoId

  private reservationParams () {
    const { from, to } = monthRangeIso(this.calendarYear, this.calendarMonth)
    const params: Record<string, string | number> = { from, to, limit: 200 }
    if (this.selectedCondoId) params['condominiumId'] = this.selectedCondoId
    if (this.calendarAreaFilterId) params['commonAreaId'] = this.calendarAreaFilterId
    return params
  }

  onCondoChange () {
    this.selectedAreaId = ''
    this.calendarAreaFilterId = ''
    this.loadAreas()
    this.loadReservations()
    this.loadCalendarEvents()
  }

  onCalendarAreaFilterChange () {
    this.loadReservations()
    this.loadCalendarEvents()
  }

  onCalendarMonthChange (ev: { year: number; month: number }) {
    this.calendarYear = ev.year
    this.calendarMonth = ev.month
    this.loadReservations()
    this.loadCalendarEvents()
  }

  loadAreas () {
    const condos = this.condominiums()
    if (!condos.length) {
      this.areas.set([])
      return
    }
    const condoIds = this.selectedCondoId
      ? [this.selectedCondoId]
      : condos.map((c) => c.id)

    forkJoin(condoIds.map((id) => this.api.listAreas(id))).subscribe({
      next: (lists) => {
        const merged = lists.flat()
        this.areas.set(merged)
        if (merged.length && !this.selectedAreaId) this.selectedAreaId = merged[0].id
        this.loadCalendarEvents()
      },
      error: () => this.notify.error('Error al cargar áreas comunes'),
    })
  }

  loadReservations () {
    this.api.listReservations(this.reservationParams()).subscribe({
      next: (r) => this.reservations.set(r.data),
      error: (e) => {
        const msg = e?.error?.message
        this.notify.error(typeof msg === 'string' ? msg : 'Error al cargar reservas')
      },
    })
  }

  loadCalendarEvents () {
    const seq = ++this.calendarLoadSeq
    const params = this.reservationParams()
    const maintenanceParams: Record<string, string | number> = {
      type: 'MAINTENANCE',
      from: params['from'] as string,
      to: params['to'] as string,
      limit: 100,
    }
    if (this.selectedCondoId) maintenanceParams['condominiumId'] = this.selectedCondoId

    forkJoin({
      reservations: this.api.listReservations(params),
      maintenance: this.maintenanceApi.list(maintenanceParams).pipe(
        catchError(() => of(emptyMaintenancePage)),
      ),
    }).subscribe({
      next: ({ reservations: r, maintenance: m }) => {
        if (seq !== this.calendarLoadSeq) return
        const events: MonthCalendarEvent[] = []
        for (const res of r.data) {
          if (res.status === 'CANCELLED') continue
          if (this.calendarAreaFilterId && res.commonAreaId !== this.calendarAreaFilterId) continue
          const condo = this.condominiums().find((c) => c.id === res.condominiumId)
          const areaLabel = res.commonArea?.name ?? 'Reserva'
          const label = this.isAllCondos() && condo
            ? `${condo.code}: ${areaLabel}`
            : areaLabel
          events.push({
            id: res.id,
            date: res.startAt,
            label,
            sublabel: `${new Date(res.startAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
            detail: this.reservationDetail(res, areaLabel),
            color: res.status === 'CONFIRMED' ? 'blue' : 'orange',
          })
        }
        for (const area of this.areas()) {
          if (this.calendarAreaFilterId && area.id !== this.calendarAreaFilterId) continue
          for (const block of area.blocks ?? []) {
            if (!this.blockInMonth(block.startAt)) continue
            const start = new Date(block.startAt)
            const end = new Date(block.endAt)
            const fmt = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
            events.push({
              id: `block-${block.id}`,
              date: block.startAt,
              label: `Bloqueo: ${this.areaLabel(area)}`,
              sublabel: block.reason ?? 'Administración',
              color: 'red',
              detail: {
                title: `Bloqueo: ${area.name}`,
                subtitle: `${start.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmt(start)} — ${fmt(end)}`,
                statusLabel: 'Bloqueado',
                note: block.reason ?? 'Bloqueo administrativo del área común.',
              },
            })
          }
        }
        for (const item of m.data) {
          if (!item.commonAreaId) continue
          if (item.status === 'CANCELLED') continue
          if (this.calendarAreaFilterId && item.commonAreaId !== this.calendarAreaFilterId) continue
          events.push(this.maintenanceCalendarEvent(item))
        }
        this.calendarEvents.set(events)
        this.reservations.set(r.data)
      },
      error: (e) => {
        if (seq !== this.calendarLoadSeq) return
        const msg = e?.error?.message
        this.notify.error(typeof msg === 'string' ? msg : 'Error al cargar el calendario')
      },
    })
  }

  private blockInMonth (iso: string) {
    const d = new Date(iso)
    return d.getFullYear() === this.calendarYear && d.getMonth() === this.calendarMonth
  }

  private maintenanceCalendarEvent (item: MaintenanceEvent): MonthCalendarEvent {
    const start = new Date(item.startAt)
    const end = new Date(item.endAt)
    const fmt = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    const areaName = item.commonArea?.name ?? 'Área común'
    const condo = this.condominiums().find((c) => c.id === item.condominiumId)
    const label = this.isAllCondos() && condo
      ? `${condo.code}: Mant. ${areaName}`
      : `Mant.: ${areaName}`

    return {
      id: `maintenance-${item.id}`,
      date: item.startAt,
      endDate: item.endAt,
      label,
      sublabel: `${fmt(start)} — ${fmt(end)}`,
      color: 'red',
      detail: {
        title: item.title,
        subtitle: `${start.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmt(start)} — ${fmt(end)}`,
        statusLabel: 'Mantenimiento',
        note: [
          areaName,
          item.vendor ? `Proveedor: ${item.vendor}` : null,
          item.description || null,
        ].filter(Boolean).join(' · '),
      },
    }
  }

  onCalendarDayClick (date: Date) {
    this.openReservationForm(date)
  }

  selectedArea () {
    return this.areas().find((a) => a.id === this.selectedAreaId) ?? null
  }

  openAreaForm (area?: CommonArea) {
    const ref = this.dialog.open(AreaFormDialogComponent, {
      width: '440px',
      data: { area },
    })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      const req = area
        ? this.api.updateArea(area.id, v)
        : this.api.createArea(this.selectedCondoId, v)
      req.subscribe({
        next: () => { this.notify.success('Área guardada'); this.loadAreas() },
        error: () => this.notify.error('Error'),
      })
    })
  }

  openScheduleForm () {
    const area = this.selectedArea()
    if (!area) return
    const ref = this.dialog.open(ScheduleFormDialogComponent, { width: '440px' })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      this.api.saveSchedule(area.id, v).subscribe({
        next: () => { this.notify.success('Horario guardado'); this.loadAreas() },
        error: () => this.notify.error('Error'),
      })
    })
  }

  removeSchedule (dayOfWeek: number) {
    const area = this.selectedArea()
    if (!area) return
    this.api.removeSchedule(area.id, dayOfWeek).subscribe({
      next: () => { this.notify.success('Horario eliminado'); this.loadAreas() },
    })
  }

  openBlockForm () {
    const area = this.selectedArea()
    if (!area) return
    const ref = this.dialog.open(BlockFormDialogComponent, { width: '440px' })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      this.api.createBlock(area.id, v).subscribe({
        next: () => { this.notify.success('Bloqueo registrado'); this.loadAreas(); this.loadCalendarEvents() },
        error: () => this.notify.error('Error'),
      })
    })
  }

  removeBlock (blockId: string) {
    const area = this.selectedArea()
    if (!area) return
    this.api.removeBlock(area.id, blockId).subscribe({
      next: () => { this.notify.success('Bloqueo eliminado'); this.loadAreas(); this.loadCalendarEvents() },
    })
  }

  openReservationForm (prefillDate?: Date) {
    if (!this.selectedCondoId) {
      this.notify.error('Selecciona un condominio para crear una reserva')
      return
    }
    const ref = this.dialog.open(ReservationFormDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      data: {
        condominiumId: this.selectedCondoId,
        areas: this.areas(),
        api: this.api,
        prefillDate: prefillDate?.toISOString().split('T')[0],
        prefillAreaId: this.calendarAreaFilterId || undefined,
        onAreasChanged: () => this.loadAreas(),
      },
    })
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.loadReservations()
        this.loadCalendarEvents()
      }
    })
  }

  cancelReservation (id: string) {
    this.api.cancelReservation(id).subscribe({
      next: () => {
        this.notify.success('Reserva cancelada')
        this.loadReservations()
        this.loadCalendarEvents()
      },
    })
  }

  dayName (d: number) {
    return DAYS[d] ?? String(d)
  }

  reservationCols () {
    return this.isAllCondos()
      ? ['condo', 'area', 'start', 'end', 'status', 'actions']
      : ['area', 'start', 'end', 'status', 'actions']
  }

  condoLabel (condominiumId: string) {
    const c = this.condominiums().find((x) => x.id === condominiumId)
    return c ? `${c.code} — ${c.name}` : condominiumId
  }

  areaLabel (area: CommonArea) {
    if (!this.isAllCondos()) return `${area.code} — ${area.name}`
    const condo = this.condominiums().find((c) => c.id === area.condominiumId)
    const prefix = condo ? `${condo.code}: ` : ''
    return `${prefix}${area.code} — ${area.name}`
  }

  reservationDetail (res: Reservation, areaLabel: string) {
    const start = new Date(res.startAt)
    const end = new Date(res.endAt)
    const fmt = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    const dateFmt = start.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
    const b = res.bookedBy
    const statusLabel = res.status === 'CONFIRMED'
      ? 'Confirmada'
      : res.status === 'PENDING'
        ? 'Pendiente'
        : res.status === 'CANCELLED'
          ? 'Cancelada'
          : res.status

    return {
      title: areaLabel,
      subtitle: `${dateFmt} · ${fmt(start)} — ${fmt(end)}`,
      statusLabel,
      contactName: b?.name ?? undefined,
      contactRole: b?.role ?? undefined,
      unitCode: b?.unitCode ?? undefined,
      email: b?.email ?? undefined,
      phone: b?.phone ?? undefined,
      note: !b?.name && !b?.email && !b?.phone ? 'Sin datos de contacto registrados' : undefined,
    }
  }
}
