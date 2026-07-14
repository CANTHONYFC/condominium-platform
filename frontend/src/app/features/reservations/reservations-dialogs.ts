import { Component, inject, OnInit, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatNativeDateModule } from '@angular/material/core'
import { forkJoin, map, switchMap } from 'rxjs'

import type { AvailabilitySlot, CommonArea } from '../../core/models/domain.models'
import type { ReservationsApiService } from '../../core/services/reservations-api.service'
import { NotifyService } from '../../core/services/notify.service'

@Component({
  selector: 'app-area-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  styles: ['.code-hint { font-size: 12px; color: #64748b; margin: 0 0 8px; }'],
  template: `
    <h2 mat-dialog-title>{{ data.area ? 'Editar' : 'Nueva' }} área común</h2>
    <mat-dialog-content>
      @if (data.area) {
        <p class="code-hint">Código: <strong>{{ data.area.code }}</strong></p>
      }
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="name" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Descripción</mat-label><textarea matInput formControlName="description"></textarea></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Capacidad</mat-label><input matInput type="number" formControlName="capacity" /></mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Máx. horas por reserva</mat-label>
          <input matInput type="number" formControlName="maxReservationHours" min="1" max="24" />
          <mat-hint>Duración máxima que un residente puede reservar</mat-hint>
        </mat-form-field>
      </form>
      @if (!data.area) {
        <p class="code-hint">Código autogenerado (ej. ZON-001).</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="ref.close(form.getRawValue())">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class AreaFormDialogComponent {
  readonly data = inject<{ area?: CommonArea }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<AreaFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  readonly form = this.fb.group({
    name: [this.data.area?.name ?? '', Validators.required],
    description: [this.data.area?.description ?? ''],
    capacity: [this.data.area?.capacity ?? null as number | null],
    maxReservationHours: [this.data.area?.maxReservationHours ?? 2, [Validators.required, Validators.min(1), Validators.max(24)]],
  })
}

@Component({
  selector: 'app-schedule-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Horario semanal</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline"><mat-label>Día</mat-label>
          <mat-select formControlName="dayOfWeek">
            <mat-option [value]="0">Domingo</mat-option>
            <mat-option [value]="1">Lunes</mat-option>
            <mat-option [value]="2">Martes</mat-option>
            <mat-option [value]="3">Miércoles</mat-option>
            <mat-option [value]="4">Jueves</mat-option>
            <mat-option [value]="5">Viernes</mat-option>
            <mat-option [value]="6">Sábado</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Inicio (HH:mm)</mat-label><input matInput formControlName="startTime" placeholder="08:00" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Fin (HH:mm)</mat-label><input matInput formControlName="endTime" placeholder="22:00" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Duración slot (min)</mat-label><input matInput type="number" formControlName="slotMinutes" /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="ref.close(form.getRawValue())">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class ScheduleFormDialogComponent {
  readonly ref = inject(MatDialogRef<ScheduleFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  readonly form = this.fb.nonNullable.group({
    dayOfWeek: [1, Validators.required],
    startTime: ['08:00', Validators.required],
    endTime: ['22:00', Validators.required],
    slotMinutes: [60, Validators.required],
  })
}

@Component({
  selector: 'app-block-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Bloqueo administrativo</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline"><mat-label>Inicio</mat-label><input matInput type="datetime-local" formControlName="startAt" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Fin</mat-label><input matInput type="datetime-local" formControlName="endAt" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Motivo</mat-label><input matInput formControlName="reason" /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class BlockFormDialogComponent {
  readonly ref = inject(MatDialogRef<BlockFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  readonly form = this.fb.nonNullable.group({
    startAt: ['', Validators.required],
    endAt: ['', Validators.required],
    reason: [''],
  })

  submit () {
    const v = this.form.getRawValue()
    this.ref.close({
      startAt: new Date(v.startAt).toISOString(),
      endAt: new Date(v.endAt).toISOString(),
      reason: v.reason,
    })
  }
}

@Component({
  selector: 'app-reservation-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  styles: [`
    .area-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .area-row__select { flex: 1; min-width: 0; }
    .area-row__add { margin-top: 4px; white-space: nowrap; }
    .inline-area {
      margin: 8px 0 12px;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
      background: #f8fbff;
    }
    .inline-area h3 {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 600;
      color: #1e3a8a;
    }
    .inline-area__hint {
      margin: 0 0 10px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.45;
    }
    .inline-area__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .slots-empty {
      margin: 0 0 8px;
      font-size: 12px;
      color: #b45309;
    }
    .slots-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 12px;
      font-size: 13px;
      color: #64748b;
    }
    .schedule-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      align-items: start;
    }
    .reservation-summary {
      margin: 0 0 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      font-size: 13px;
      color: #0c4a6e;
    }
    @media (max-width: 480px) {
      .schedule-row { grid-template-columns: 1fr; }
    }
    .slots-hint {
      margin: -4px 0 8px;
      font-size: 12px;
      color: #64748b;
    }
    .slot-option--blocked {
      color: #94a3b8;
    }
    .no-areas-hint {
      margin: 0 0 8px;
      font-size: 13px;
      color: #64748b;
    }
  `],
  template: `
    <h2 mat-dialog-title>Nueva reserva</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <div class="area-row">
          <mat-form-field appearance="outline" class="area-row__select">
            <mat-label>Área</mat-label>
            <mat-select formControlName="commonAreaId" (selectionChange)="loadSlots()">
              @if (!areas.length) {
                <mat-option disabled value="">Sin áreas registradas</mat-option>
              }
              @for (a of areas; track a.id) {
                <mat-option [value]="a.id">{{ a.code }} — {{ a.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button
            mat-stroked-button
            type="button"
            class="area-row__add"
            color="primary"
            (click)="toggleAreaForm()"
          >
            <mat-icon fontSet="material-icons-round">add</mat-icon>
            Agregar
          </button>
        </div>

        @if (!areas.length && !showAreaForm()) {
          <p class="no-areas-hint">No hay áreas comunes. Pulsa <strong>Agregar</strong> para registrar una.</p>
        }

        @if (showAreaForm()) {
          <div class="inline-area">
            <h3>Nueva área común</h3>
            <p class="inline-area__hint">
              Se creará con horario base Lun–Dom 08:00–22:00 (slots de 60 min). Luego podrás ajustarlo en la pestaña Áreas.
            </p>
            <form [formGroup]="areaForm" class="flex flex-col gap-1">
              <mat-form-field appearance="outline">
                <mat-label>Nombre</mat-label>
                <input matInput formControlName="name" placeholder="Salón de eventos, parrilla..." />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Descripción</mat-label>
                <textarea matInput rows="2" formControlName="description" placeholder="Ubicación, reglas de uso..."></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Capacidad (personas)</mat-label>
                <input matInput type="number" formControlName="capacity" min="1" />
              </mat-form-field>
            </form>
            <div class="inline-area__actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="areaForm.invalid || savingArea()"
                (click)="saveInlineArea()"
              >
                @if (savingArea()) {
                  Guardando...
                } @else {
                  Guardar área
                }
              </button>
              @if (areas.length) {
                <button mat-button type="button" (click)="showAreaForm.set(false)">Cancelar</button>
              }
            </div>
          </div>
        }

        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput [matDatepicker]="reservationDatePicker" formControlName="date" (dateChange)="loadSlots()" />
          <mat-datepicker-toggle matIconSuffix [for]="reservationDatePicker" />
          <mat-datepicker #reservationDatePicker />
        </mat-form-field>

        @if (loadingSlots()) {
          <div class="slots-loading"><mat-spinner diameter="28"></mat-spinner> Cargando horarios...</div>
        }

        <div class="schedule-row">
          <mat-form-field appearance="outline">
            <mat-label>Hora de inicio</mat-label>
            <mat-select formControlName="slotStart" (selectionChange)="onStartChange()" [disabled]="!slots.length || loadingSlots()">
              @for (s of slots; track s.startAt) {
                <mat-option [value]="s.startAt" [disabled]="!s.available">
                  {{ formatSlotTime(s.startAt) }}
                  @if (!s.available) {
                    ({{ slotReasonLabel(s.unavailableReason) }})
                  }
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          @if (endOptions().length) {
            <mat-form-field appearance="outline">
              <mat-label>Hora de fin</mat-label>
              <mat-select formControlName="slotEnd">
                @for (opt of endOptions(); track opt.endAt) {
                  <mat-option [value]="opt.endAt">
                    {{ formatSlotTime(opt.endAt) }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
        </div>
        @if (form.value.slotStart && form.value.slotEnd) {
          <p class="reservation-summary">
            Reservarás <strong>{{ reservationHours() }}</strong>
            {{ reservationHours() === 1 ? 'hora' : 'horas' }}
            ({{ formatSlotTime(form.value.slotStart) }} — {{ formatSlotTime(form.value.slotEnd) }}).
            Máximo {{ maxReservationHours() }} h en esta área.
          </p>
        } @else if (form.value.commonAreaId && form.value.date && slots.length) {
          <p class="slots-hint">Los horarios bloqueados no pueden usarse como inicio.</p>
        }
        @if (slotsMessage()) {
          <p class="slots-empty">{{ slotsMessage() }}</p>
        } @else if (form.value.commonAreaId && form.value.date && !loadingSlots() && slots.length && !hasAvailableSlots()) {
          <p class="slots-empty">No hay horarios libres para esta fecha. Prueba otra fecha o revisa bloqueos.</p>
        }
        <mat-form-field appearance="outline">
          <mat-label>Notas</mat-label>
          <input matInput formControlName="notes" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || savingArea() || !endOptions().length" (click)="submit()">Reservar</button>
    </mat-dialog-actions>
  `,
})
export class ReservationFormDialogComponent implements OnInit {
  readonly data = inject<{
    condominiumId: string
    areas: CommonArea[]
    api: ReservationsApiService
    prefillDate?: string
    prefillAreaId?: string
    onAreasChanged?: () => void
  }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<ReservationFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly notify = inject(NotifyService)

  areas: CommonArea[] = [...this.data.areas]
  slots: AvailabilitySlot[] = []
  slotMinutes = 60
  readonly maxReservationHours = signal(2)
  readonly endOptions = signal<{ endAt: string; hours: number }[]>([])
  readonly loadingSlots = signal(false)
  readonly slotsMessage = signal('')
  readonly showAreaForm = signal(!this.data.areas.length)
  readonly savingArea = signal(false)

  readonly areaForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    capacity: [null as number | null],
  })

  readonly form = this.fb.nonNullable.group({
    commonAreaId: [
      this.data.prefillAreaId ?? this.data.areas[0]?.id ?? '',
      Validators.required,
    ],
    date: [this.parsePrefillDate(), Validators.required],
    slotStart: ['', Validators.required],
    slotEnd: ['', Validators.required],
    notes: [''],
  })

  parsePrefillDate () {
    if (this.data.prefillDate) {
      const [y, m, d] = this.data.prefillDate.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), n.getDate())
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

  reservationHours () {
    const { slotStart, slotEnd } = this.form.getRawValue()
    if (!slotStart || !slotEnd) return 0
    return Math.round((new Date(slotEnd).getTime() - new Date(slotStart).getTime()) / 3600000)
  }

  ngOnInit () {
    if (this.areas.length) this.loadSlots()
  }

  hasAvailableSlots () {
    return this.slots.some((s) => s.available)
  }

  toggleAreaForm () {
    this.showAreaForm.update((v) => !v)
  }

  saveInlineArea () {
    if (this.areaForm.invalid) return
    const v = this.areaForm.getRawValue()
    this.savingArea.set(true)

    this.data.api.createArea(this.data.condominiumId, {
      name: (v.name ?? '').trim(),
      description: v.description?.trim() || undefined,
      capacity: v.capacity && v.capacity > 0 ? v.capacity : undefined,
    }).pipe(
      switchMap((area) => {
        const days = [0, 1, 2, 3, 4, 5, 6]
        return forkJoin(
          days.map((dayOfWeek) => this.data.api.saveSchedule(area.id, {
            dayOfWeek,
            startTime: '08:00',
            endTime: '22:00',
            slotMinutes: 60,
          })),
        ).pipe(map(() => area))
      }),
    ).subscribe({
      next: (area) => {
        this.areas = [...this.areas, area]
        this.form.patchValue({ commonAreaId: area.id, slotStart: '', slotEnd: '' })
        this.showAreaForm.set(false)
        this.areaForm.reset({ name: '', description: '', capacity: null })
        this.savingArea.set(false)
        this.data.onAreasChanged?.()
        this.notify.success(`Área ${area.code} creada`)
        this.loadSlots()
      },
      error: () => {
        this.savingArea.set(false)
        this.notify.error('No se pudo crear el área')
      },
    })
  }

  loadSlots () {
    const { commonAreaId, date } = this.form.getRawValue()
    if (!commonAreaId || !date) return
    this.loadingSlots.set(true)
    this.slotsMessage.set('')
    this.form.patchValue({ slotStart: '', slotEnd: '' })
    this.endOptions.set([])
    this.slots = []
    const dateIso = this.dateToIso(date)
    this.data.api.getAvailability(commonAreaId, dateIso).subscribe({
      next: (r) => {
        this.slots = r.slots ?? []
        this.slotMinutes = r.schedule?.slotMinutes ?? 60
        this.maxReservationHours.set(r.maxReservationHours ?? 2)
        if (r.message) this.slotsMessage.set(r.message)
        else if (!this.slots.length) {
          this.slotsMessage.set('No hay horario configurado para este día. Configúralo en la pestaña Horarios.')
        }
        const firstAvailable = this.slots.find((s) => s.available)
        if (firstAvailable) {
          this.form.patchValue({ slotStart: firstAvailable.startAt })
          this.onStartChange()
        }
        this.loadingSlots.set(false)
      },
      error: () => {
        this.loadingSlots.set(false)
        this.slotsMessage.set('No se pudieron cargar los horarios. Intenta de nuevo.')
        this.notify.error('Error al cargar horarios')
      },
    })
  }

  slotReasonLabel (reason?: AvailabilitySlot['unavailableReason']) {
    if (reason === 'RESERVED') return 'Reservado'
    if (reason === 'ADMIN_BLOCK') return 'Bloqueado'
    if (reason === 'MAINTENANCE') return 'Mantenimiento'
    return 'No disponible'
  }

  onStartChange () {
    const startAt = this.form.getRawValue().slotStart
    if (!startAt) {
      this.endOptions.set([])
      this.form.patchValue({ slotEnd: '' })
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
        const slot = this.slots[startIdx + i]
        if (!slot?.available) { ok = false; break }
      }
      if (!ok) break
      const lastSlot = this.slots[startIdx + needed - 1]
      if (!lastSlot) break
      options.push({ endAt: lastSlot.endAt, hours: h })
    }

    this.endOptions.set(options)
    const currentEnd = this.form.getRawValue().slotEnd
    const stillValid = options.some((o) => o.endAt === currentEnd)
    if (!stillValid && options.length) {
      this.form.patchValue({ slotEnd: options[options.length - 1].endAt })
    } else if (!options.length) {
      this.form.patchValue({ slotEnd: '' })
    }
  }

  submit () {
    const v = this.form.getRawValue()
    this.data.api.createReservation({
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
