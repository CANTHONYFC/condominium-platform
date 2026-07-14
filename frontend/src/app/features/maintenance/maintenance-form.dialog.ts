import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatSelectModule } from '@angular/material/select'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatNativeDateModule } from '@angular/material/core'
import { MatIconModule } from '@angular/material/icon'

import type { CommonArea, MaintenanceEvent } from '../../core/models/domain.models'
import { StorageApiService } from '../../core/services/storage-api.service'
import { NotifyService } from '../../core/services/notify.service'
import { ReservationsApiService } from '../../core/services/reservations-api.service'

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = (i % 2) * 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

function combineDateTime (date: Date, time: string) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

function endAfterStartValidator (): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const startDate = group.get('startDate')?.value as Date | null
    const startTime = group.get('startTime')?.value as string | undefined
    const endDate = group.get('endDate')?.value as Date | null
    const endTime = group.get('endTime')?.value as string | undefined
    if (!startDate || !endDate || !startTime || !endTime) return null
    const start = combineDateTime(startDate, startTime)
    const end = combineDateTime(endDate, endTime)
    return end > start ? null : { endBeforeStart: true }
  }
}

@Component({
  selector: 'app-maintenance-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  styles: [`
    .datetime-block { margin-bottom: 4px; }
    .datetime-block__label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 6px;
    }
    .datetime-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      align-items: start;
    }
    .datetime-error {
      margin: 0 0 8px;
      font-size: 12px;
      color: #dc2626;
    }
    @media (max-width: 480px) {
      .datetime-row { grid-template-columns: 1fr; }
    }
  `],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Editar' : 'Programar' }} mantenimiento</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline"><mat-label>Título</mat-label><input matInput formControlName="title" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Descripción</mat-label><textarea matInput formControlName="description"></textarea></mat-form-field>

        <div class="datetime-block">
          <span class="datetime-block__label">Inicio *</span>
          <div class="datetime-row">
            <mat-form-field appearance="outline">
              <mat-label>Fecha</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate" (dateChange)="onScheduleChange()" />
              <mat-datepicker-toggle matIconSuffix [for]="startPicker" />
              <mat-datepicker #startPicker />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Hora</mat-label>
              <mat-select formControlName="startTime" (selectionChange)="onScheduleChange()">
                @for (t of timeOptions; track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <div class="datetime-block">
          <span class="datetime-block__label">Fin *</span>
          <div class="datetime-row">
            <mat-form-field appearance="outline">
              <mat-label>Fecha</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate" (dateChange)="onScheduleChange()" />
              <mat-datepicker-toggle matIconSuffix [for]="endPicker" />
              <mat-datepicker #endPicker />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Hora</mat-label>
              <mat-select formControlName="endTime">
                @for (t of endTimeOptions(); track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>
        @if (form.hasError('endBeforeStart')) {
          <p class="datetime-error">La fecha y hora de fin deben ser posteriores al inicio.</p>
        }

        <mat-checkbox formControlName="affectsCommonArea" class="mb-2">
          Afecta área común (bloquea reservas en ese horario)
        </mat-checkbox>
        @if (form.controls.affectsCommonArea.value) {
          <mat-form-field appearance="outline">
            <mat-label>Área común</mat-label>
            <mat-select formControlName="commonAreaId">
              @for (a of areas(); track a.id) {
                <mat-option [value]="a.id">{{ a.name }} ({{ a.code }})</mat-option>
              }
            </mat-select>
            @if (!areas().length) {
              <mat-hint>No hay áreas comunes. Créelas en Reservas.</mat-hint>
            }
          </mat-form-field>
        }

        <mat-form-field appearance="outline"><mat-label>Proveedor</mat-label><input matInput formControlName="vendor" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Costo (S/)</mat-label><input matInput type="number" formControlName="cost" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Estado</mat-label>
          <mat-select formControlName="status">
            <mat-option value="SCHEDULED">Programado</mat-option>
            <mat-option value="IN_PROGRESS">En progreso</mat-option>
            <mat-option value="COMPLETED">Completado</mat-option>
            <mat-option value="CANCELLED">Cancelado</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="flex items-center gap-2">
          <button mat-stroked-button type="button" (click)="fileInput.click()">Subir PDF / informe</button>
          <input #fileInput type="file" accept=".pdf,image/*" hidden (change)="onFile($event)" />
          @if (form.value.attachmentUrl) { <span class="text-sm text-green-700">Archivo adjunto</span> }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class MaintenanceFormDialogComponent implements OnInit {
  readonly data = inject<{ item?: MaintenanceEvent; condominiumId: string; prefillDate?: Date }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<MaintenanceFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly storage = inject(StorageApiService)
  private readonly notify = inject(NotifyService)
  private readonly reservationsApi = inject(ReservationsApiService)

  readonly areas = signal<CommonArea[]>([])
  readonly timeOptions = TIME_OPTIONS
  readonly scheduleTick = signal(0)

  readonly endTimeOptions = computed(() => {
    this.scheduleTick()
    const startDate = this.form.controls.startDate.value
    const endDate = this.form.controls.endDate.value
    const startTime = this.form.controls.startTime.value
    if (!startDate || !endDate) return TIME_OPTIONS
    if (startDate.toDateString() !== endDate.toDateString()) return TIME_OPTIONS
    const filtered = TIME_OPTIONS.filter((t) => t > startTime)
    return filtered.length ? filtered : TIME_OPTIONS
  })

  readonly form = this.fb.nonNullable.group({
    title: [this.data.item?.title ?? '', Validators.required],
    description: [this.data.item?.description ?? ''],
    startDate: [this.parseDate(this.data.item?.startAt) ?? this.prefillDateOnly(), Validators.required],
    startTime: [this.parseTime(this.data.item?.startAt) ?? '09:00', Validators.required],
    endDate: [this.parseDate(this.data.item?.endAt) ?? this.prefillDateOnly(), Validators.required],
    endTime: [this.parseTime(this.data.item?.endAt) ?? '11:00', Validators.required],
    affectsCommonArea: [!!this.data.item?.commonAreaId],
    commonAreaId: [this.data.item?.commonAreaId ?? ''],
    vendor: [this.data.item?.vendor ?? ''],
    cost: [Number(this.data.item?.cost ?? 0)],
    status: [this.data.item?.status ?? 'SCHEDULED'],
    attachmentUrl: [this.data.item?.attachmentUrl ?? ''],
  }, { validators: endAfterStartValidator() })

  ngOnInit () {
    this.reservationsApi.listAreas(this.data.condominiumId).subscribe({
      next: (areas) => this.areas.set(areas),
    })
    this.form.controls.affectsCommonArea.valueChanges.subscribe((checked) => {
      const ctrl = this.form.controls.commonAreaId
      if (checked) {
        ctrl.setValidators(Validators.required)
      } else {
        ctrl.clearValidators()
        ctrl.setValue('')
      }
      ctrl.updateValueAndValidity()
    })
    if (this.form.controls.affectsCommonArea.value) {
      this.form.controls.commonAreaId.setValidators(Validators.required)
      this.form.controls.commonAreaId.updateValueAndValidity()
    }
  }

  onScheduleChange () {
    this.scheduleTick.update((n) => n + 1)
    const options = this.endTimeOptions()
    const endTime = this.form.controls.endTime.value
    if (!options.includes(endTime)) {
      this.form.patchValue({ endTime: options[0] ?? endTime })
    }
    this.form.updateValueAndValidity()
  }

  parseDate (iso?: string) {
    if (!iso) return null
    const d = new Date(iso)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  parseTime (iso?: string) {
    if (!iso) return '09:00'
    const d = new Date(iso)
    const h = String(d.getHours()).padStart(2, '0')
    const m = d.getMinutes() < 30 ? '00' : '30'
    return `${h}:${m}`
  }

  prefillDateOnly () {
    const d = this.data.prefillDate ? new Date(this.data.prefillDate) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  onFile (ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0]
    if (!file) return
    this.storage.upload(file, 'maintenance').subscribe({
      next: (r) => {
        this.form.patchValue({ attachmentUrl: r.fileUrl })
        this.notify.success('Archivo subido')
      },
      error: () => this.notify.error('Error al subir'),
    })
  }

  submit () {
    const v = this.form.getRawValue()
    this.ref.close({
      title: v.title,
      description: v.description,
      startAt: combineDateTime(v.startDate, v.startTime).toISOString(),
      endAt: combineDateTime(v.endDate, v.endTime).toISOString(),
      vendor: v.vendor,
      cost: v.cost,
      status: v.status,
      attachmentUrl: v.attachmentUrl,
      commonAreaId: v.affectsCommonArea ? v.commonAreaId : null,
    })
  }
}
