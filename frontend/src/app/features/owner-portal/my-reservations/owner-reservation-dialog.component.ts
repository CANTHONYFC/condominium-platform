import { Component, inject, OnInit, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatNativeDateModule } from '@angular/material/core'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import type { PortalApiService } from '../../../core/services/portal-api.service'
import type { ReservationsApiService } from '../../../core/services/reservations-api.service'
import { NotifyService } from '../../../core/services/notify.service'
import type { AvailabilitySlot, CommonArea } from '../../../core/models/domain.models'

@Component({
  selector: 'app-owner-reservation-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Nueva reserva</h2>
    <mat-dialog-content>
      <p class="dialog-hint">Unidad {{ data.unitCode }}</p>
      @if (loadingAreas()) {
        <div class="loading-center"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Área común</mat-label>
            <mat-select formControlName="commonAreaId" (selectionChange)="loadSlots()">
              @for (a of areas; track a.id) {
                <mat-option [value]="a.id">{{ a.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Fecha</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" (dateChange)="loadSlots()" />
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
          @if (loadingSlots()) {
            <div class="loading-center"><mat-spinner diameter="28"></mat-spinner></div>
          } @else if (slots.length) {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Hora inicio</mat-label>
              <mat-select formControlName="slotStart" (selectionChange)="onStartChange()">
                @for (s of slots; track s.startAt) {
                  @if (s.available) {
                    <mat-option [value]="s.startAt">{{ formatSlotTime(s.startAt) }}</mat-option>
                  }
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Hora fin</mat-label>
              <mat-select formControlName="slotEnd">
                @for (o of endOptions(); track o.endAt) {
                  <mat-option [value]="o.endAt">{{ formatSlotTime(o.endAt) }} ({{ o.hours }} h)</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Notas</mat-label>
            <input matInput formControlName="notes" />
          </mat-form-field>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || loadingAreas()" (click)="submit()">Reservar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-hint { margin: 0 0 12px; color: #94a3b8; font-size: 13px; }
    .dialog-form { display: flex; flex-direction: column; gap: 4px; min-width: 360px; }
    .w-full { width: 100%; }
  `],
})
export class OwnerReservationDialogComponent implements OnInit {
  readonly data = inject<{
    condominiumId: string
    unitCode: string
    portalApi: PortalApiService
    reservationsApi: ReservationsApiService
    prefillDate?: Date
    prefillAreaId?: string
  }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<OwnerReservationDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly notify = inject(NotifyService)

  areas: CommonArea[] = []
  slots: AvailabilitySlot[] = []
  slotMinutes = 60
  readonly maxReservationHours = signal(2)
  readonly endOptions = signal<{ endAt: string; hours: number }[]>([])
  readonly loadingAreas = signal(true)
  readonly loadingSlots = signal(false)

  readonly form = this.fb.nonNullable.group({
    commonAreaId: [
      this.data.prefillAreaId ?? '',
      Validators.required,
    ],
    date: [this.parsePrefillDate(), Validators.required],
    slotStart: ['', Validators.required],
    slotEnd: ['', Validators.required],
    notes: [''],
  })

  parsePrefillDate () {
    if (this.data.prefillDate) {
      const d = this.data.prefillDate
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), n.getDate())
  }

  ngOnInit () {
    this.data.reservationsApi.listAreas(this.data.condominiumId).subscribe({
      next: (areas) => {
        this.areas = areas
        if (areas.length && !this.form.getRawValue().commonAreaId) {
          this.form.patchValue({ commonAreaId: areas[0].id })
        }
        this.loadSlots()
        this.loadingAreas.set(false)
      },
      error: () => {
        this.loadingAreas.set(false)
        this.notify.error('No se pudieron cargar las áreas')
      },
    })
  }

  dateToIso (date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  formatSlotTime (iso: string) {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  loadSlots () {
    const { commonAreaId, date } = this.form.getRawValue()
    if (!commonAreaId || !date) return
    this.loadingSlots.set(true)
    this.form.patchValue({ slotStart: '', slotEnd: '' })
    this.endOptions.set([])
    this.slots = []
    this.data.reservationsApi.getAvailability(commonAreaId, this.dateToIso(date)).subscribe({
      next: (r) => {
        this.slots = r.slots ?? []
        this.slotMinutes = r.schedule?.slotMinutes ?? 60
        this.maxReservationHours.set(r.maxReservationHours ?? 2)
        const first = this.slots.find((s) => s.available)
        if (first) {
          this.form.patchValue({ slotStart: first.startAt })
          this.onStartChange()
        }
        this.loadingSlots.set(false)
      },
      error: () => {
        this.loadingSlots.set(false)
        this.notify.error('Error al cargar horarios')
      },
    })
  }

  onStartChange () {
    const startAt = this.form.getRawValue().slotStart
    if (!startAt) {
      this.endOptions.set([])
      return
    }
    const startIdx = this.slots.findIndex((s) => s.startAt === startAt)
    if (startIdx < 0) return
    const slotsPerHour = 60 / this.slotMinutes
    const maxH = this.maxReservationHours()
    const options: { endAt: string; hours: number }[] = []
    for (let h = 1; h <= maxH; h++) {
      const needed = h * slotsPerHour
      let ok = true
      for (let i = 0; i < needed; i++) {
        if (!this.slots[startIdx + i]?.available) { ok = false; break }
      }
      if (!ok) break
      const lastSlot = this.slots[startIdx + needed - 1]
      if (!lastSlot) break
      options.push({ endAt: lastSlot.endAt, hours: h })
    }
    this.endOptions.set(options)
    if (options.length) this.form.patchValue({ slotEnd: options[0].endAt })
  }

  submit () {
    const v = this.form.getRawValue()
    this.data.portalApi.createMyReservation({
      condominiumId: this.data.condominiumId,
      commonAreaId: v.commonAreaId,
      startAt: v.slotStart,
      endAt: v.slotEnd,
      notes: v.notes,
    }).subscribe({
      next: () => { this.notify.success('Reserva creada'); this.ref.close(true) },
      error: () => this.notify.error('Horario no disponible'),
    })
  }
}
