import { Component, inject, OnInit } from '@angular/core'

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'

import { MatFormFieldModule } from '@angular/material/form-field'

import { MatInputModule } from '@angular/material/input'

import { MatButtonModule } from '@angular/material/button'

import { MatSelectModule } from '@angular/material/select'



import type { Floor, Tower, Unit } from '../../../core/models/domain.models'

import {
  normalizeUnitCodePrefix,
  previewBuildingFull,
  previewBuildingOnExistingFloors,
  previewCondominiumFull,
} from './structure-preview'



@Component({

  selector: 'app-tower-form-dialog',

  standalone: true,

  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],

  template: `

    <h2 mat-dialog-title>{{ data.item ? 'Editar torre' : 'Nueva torre' }}</h2>

    <mat-dialog-content>

      @if (data.item) {

        <p class="code-hint">Código: <strong>{{ data.item.code }}</strong></p>

      }

      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">

        <mat-form-field appearance="outline"><mat-label>Nombre</mat-label><input matInput formControlName="name" /></mat-form-field>

        <mat-form-field appearance="outline"><mat-label>Cantidad de pisos</mat-label><input matInput type="number" formControlName="floorsCount" /></mat-form-field>

      </form>

      @if (!data.item) {

        <p class="code-hint">Código autogenerado (ej. TOR-001).</p>

      }

    </mat-dialog-content>

    <mat-dialog-actions align="end">

      <button mat-button mat-dialog-close>Cancelar</button>

      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="ref.close(form.getRawValue())">Guardar</button>

    </mat-dialog-actions>

  `,

  styles: ['.code-hint { font-size: 12px; color: #64748b; margin: 0 0 8px; }'],

})

export class TowerFormDialogComponent implements OnInit {

  readonly data = inject<{ item?: Tower }>(MAT_DIALOG_DATA)

  readonly ref = inject(MatDialogRef<TowerFormDialogComponent>)

  private readonly fb = inject(FormBuilder)

  readonly form = this.fb.nonNullable.group({

    name: ['', Validators.required],

    floorsCount: [0],

  })

  ngOnInit () {

    if (this.data.item) {

      this.form.patchValue({

        name: this.data.item.name,

        floorsCount: this.data.item.floorsCount ?? 0,

      })

    }

  }

}



@Component({

  selector: 'app-floor-form-dialog',

  standalone: true,

  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule],

  template: `

    <h2 mat-dialog-title>{{ data.item ? 'Editar piso' : 'Nuevo piso' }}</h2>

    <mat-dialog-content>

      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">

        <mat-form-field appearance="outline"><mat-label>Número de piso</mat-label><input matInput type="number" formControlName="number" /></mat-form-field>

        <mat-form-field appearance="outline"><mat-label>Nombre (opcional)</mat-label><input matInput formControlName="name" /></mat-form-field>

        <mat-form-field appearance="outline"><mat-label>Torre</mat-label>

          <mat-select formControlName="towerId">

            <mat-option [value]="null">Sin torre</mat-option>

            @for (t of data.towers; track t.id) {

              <mat-option [value]="t.id">{{ t.code }} — {{ t.name }}</mat-option>

            }

          </mat-select>

        </mat-form-field>

      </form>

    </mat-dialog-content>

    <mat-dialog-actions align="end">

      <button mat-button mat-dialog-close>Cancelar</button>

      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="ref.close(form.getRawValue())">Guardar</button>

    </mat-dialog-actions>

  `,

})

export class FloorFormDialogComponent implements OnInit {

  readonly data = inject<{ item?: Floor; towers: Tower[] }>(MAT_DIALOG_DATA)

  readonly ref = inject(MatDialogRef<FloorFormDialogComponent>)

  private readonly fb = inject(FormBuilder)

  readonly form = this.fb.group({

    number: [1, Validators.required],

    name: [''],

    towerId: [null as string | null],

  })

  ngOnInit () {

    if (this.data.item) {

      this.form.patchValue({

        number: this.data.item.number,

        name: this.data.item.name ?? '',

        towerId: this.data.item.towerId ?? null,

      })

    }

  }

}



@Component({

  selector: 'app-unit-form-dialog',

  standalone: true,

  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule],

  template: `

    <h2 mat-dialog-title>{{ data.item ? 'Editar unidad' : 'Nueva unidad' }}</h2>

    <mat-dialog-content>

      @if (data.item) {

        <p class="code-hint">Código: <strong>{{ data.item.code }}</strong></p>

      }

      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">

        <mat-form-field appearance="outline"><mat-label>Tipo</mat-label>

          <mat-select formControlName="type">

            <mat-option value="APARTMENT">Departamento</mat-option>

            <mat-option value="PARKING">Cochera</mat-option>

            <mat-option value="STORAGE">Depósito</mat-option>

          </mat-select>

        </mat-form-field>

        <mat-form-field appearance="outline"><mat-label>Piso</mat-label>

          <mat-select formControlName="floorId">

            <mat-option [value]="null">Sin piso</mat-option>

            @for (f of data.floors; track f.id) {

              <mat-option [value]="f.id">Piso {{ f.number }} {{ f.name ? '(' + f.name + ')' : '' }}</mat-option>

            }

          </mat-select>

        </mat-form-field>

        <mat-form-field appearance="outline"><mat-label>Cuota mantenimiento</mat-label><input matInput type="number" formControlName="maintenanceFee" /></mat-form-field>

        <mat-form-field appearance="outline"><mat-label>Área m²</mat-label><input matInput type="number" formControlName="area" /></mat-form-field>

        @if (data.item) {

          <mat-form-field appearance="outline"><mat-label>Estado ocupación</mat-label>

            <mat-select formControlName="occupancyStatus">

              <mat-option value="VACANT">Vacante</mat-option>

              <mat-option value="OCCUPIED">Ocupado</mat-option>

              <mat-option value="UNDER_MAINTENANCE">En mantenimiento</mat-option>

            </mat-select>

          </mat-form-field>

        }

      </form>

      @if (!data.item) {

        <p class="code-hint">Código autogenerado (ej. {{ data.unitCodePrefix ?? 'D' }}-015).</p>

      }

    </mat-dialog-content>

    <mat-dialog-actions align="end">

      <button mat-button mat-dialog-close>Cancelar</button>

      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="ref.close(form.getRawValue())">Guardar</button>

    </mat-dialog-actions>

  `,

  styles: ['.code-hint { font-size: 12px; color: #64748b; margin: 0 0 8px; }'],

})

export class UnitFormDialogComponent implements OnInit {

  readonly data = inject<{ item?: Unit; floors: Floor[]; defaultFloorId?: string | null; unitCodePrefix?: string }>(MAT_DIALOG_DATA)

  readonly ref = inject(MatDialogRef<UnitFormDialogComponent>)

  private readonly fb = inject(FormBuilder)

  readonly form = this.fb.group({

    type: ['APARTMENT' as Unit['type'], Validators.required],

    floorId: [null as string | null],

    maintenanceFee: [0],

    area: [null as number | null],

    occupancyStatus: ['VACANT' as Unit['occupancyStatus']],

  })

  ngOnInit () {

    if (this.data.item) {

      this.form.patchValue({

        type: this.data.item.type,

        floorId: this.data.item.floorId ?? null,

        maintenanceFee: Number(this.data.item.maintenanceFee),

        area: this.data.item.area ?? null,

        occupancyStatus: this.data.item.occupancyStatus,

      })

    } else if (this.data.defaultFloorId) {

      this.form.patchValue({ floorId: this.data.defaultFloorId })

    }

  }

}

export interface StructureGeneratorData {
  mode: 'BUILDING' | 'CONDOMINIUM'
  hasExisting: boolean
  generationScope: 'FULL' | 'UNITS_ONLY'
  floors: Floor[]
  unitCodePrefix: string
}

export interface StructureGeneratorResult {
  type: 'FULL' | 'UNITS_ONLY'
  payload: Record<string, unknown>
}

@Component({
  selector: 'app-structure-generator-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ dialogTitle() }}</h2>
    <mat-dialog-content>
      @if (data.mode === 'BUILDING') {
        @if (data.generationScope === 'UNITS_ONLY') {
          <p class="hint">
            Edificio: se crearán departamentos en los <strong>{{ data.floors.length }} pisos</strong> existentes,
            con estado <strong>Vacante</strong>.
          </p>
        } @else {
          <p class="hint">
            Edificio de departamentos: se crearán pisos y unidades con estado <strong>Vacante</strong>.
          </p>
        }
      } @else if (data.generationScope === 'UNITS_ONLY') {
        <p class="hint">
          Se crearán domicilios en los <strong>{{ data.floors.length }} pisos</strong> existentes.
        </p>
      } @else {
        <p class="hint">Condominio: se crearán torres, pisos y domicilios con estado <strong>Vacante</strong>.</p>
      }

      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        @if (data.generationScope === 'FULL' && data.mode === 'BUILDING') {
          <mat-form-field appearance="outline">
            <mat-label>Cantidad de pisos</mat-label>
            <input matInput type="number" formControlName="floorsCount" min="1" />
          </mat-form-field>
        }
        @if (data.generationScope === 'FULL' && data.mode === 'CONDOMINIUM') {
          <mat-form-field appearance="outline">
            <mat-label>Número de torres</mat-label>
            <input matInput type="number" formControlName="towersCount" min="1" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Pisos por torre</mat-label>
            <input matInput type="number" formControlName="floorsPerTower" min="1" />
          </mat-form-field>
        }
        <mat-form-field appearance="outline">
          <mat-label>{{ unitsPerFloorLabel() }}</mat-label>
          <input matInput type="number" formControlName="unitsPerFloor" min="1" />
        </mat-form-field>
        @if (data.mode === 'BUILDING') {
          <mat-form-field appearance="outline">
            <mat-label>Prefijo de código</mat-label>
            <input matInput formControlName="unitCodePrefix" maxlength="4" />
            <mat-hint>Ej: D, L, A — genera {{ prefixPreview() }}-001, {{ prefixPreview() }}-002…</mat-hint>
          </mat-form-field>
        }
      </form>

      @if (data.hasExisting && data.generationScope === 'FULL') {
        <p class="warn">Ya hay estructura registrada. Al generar se reemplazará por completo.</p>
      }
      @if (summary()) {
        <p class="preview">{{ summary() }}</p>
      }
      @if (floorPreviews().length) {
        <div class="floor-preview">
          <strong>Detalle por piso</strong>
          @for (row of floorPreviews(); track row.label) {
            <div class="floor-preview__row">
              <span class="floor-preview__label">{{ row.label }}</span>
              <span class="floor-preview__codes">{{ row.codes.join(', ') }}</span>
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Generar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { font-size: 13px; color: #475569; line-height: 1.45; margin: 0 0 12px; }
    .warn { font-size: 12px; color: #b45309; margin-top: 12px; }
    .preview { font-size: 13px; color: #1d4ed8; margin-top: 12px; font-weight: 500; }
    .floor-preview {
      margin-top: 16px;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      max-height: 220px;
      overflow-y: auto;
      font-size: 12px;
    }
    .floor-preview__row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .floor-preview__row:last-child { border-bottom: 0; }
    .floor-preview__label { font-weight: 600; color: #334155; }
    .floor-preview__codes { color: #475569; line-height: 1.4; }
  `],
})
export class StructureGeneratorDialogComponent implements OnInit {
  readonly data = inject<StructureGeneratorData>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<StructureGeneratorDialogComponent, StructureGeneratorResult>)
  private readonly fb = inject(FormBuilder)

  readonly form = this.fb.nonNullable.group({
    floorsCount: [5, [Validators.required, Validators.min(1), Validators.max(100)]],
    unitsPerFloor: [4, [Validators.required, Validators.min(1), Validators.max(50)]],
    towersCount: [2, [Validators.required, Validators.min(1), Validators.max(30)]],
    floorsPerTower: [8, [Validators.required, Validators.min(1), Validators.max(100)]],
    unitCodePrefix: [this.data.unitCodePrefix, [Validators.required, Validators.pattern(/^[A-Za-z]{1,4}$/)]],
  })

  ngOnInit () {
    if (this.data.mode !== 'BUILDING') {
      this.form.controls.unitCodePrefix.disable()
    }
    if (this.data.generationScope === 'UNITS_ONLY') {
      this.form.controls.floorsCount.disable()
      this.form.controls.towersCount.disable()
      this.form.controls.floorsPerTower.disable()
      return
    }
    if (this.data.mode === 'BUILDING') {
      this.form.controls.towersCount.disable()
      this.form.controls.floorsPerTower.disable()
      return
    }
    this.form.controls.floorsCount.disable()
  }

  dialogTitle () {
    if (this.data.generationScope === 'UNITS_ONLY') {
      return this.data.mode === 'BUILDING' ? 'Generar departamentos' : 'Generar domicilios'
    }
    return 'Generar estructura'
  }

  unitsPerFloorLabel () {
    if (this.data.mode === 'BUILDING') return 'Departamentos por piso'
    return 'Domicilios por piso'
  }

  prefixPreview () {
    return normalizeUnitCodePrefix(this.form.controls.unitCodePrefix.value)
  }

  summary () {
    const v = this.form.getRawValue()
    const prefix = this.data.mode === 'BUILDING' ? normalizeUnitCodePrefix(v.unitCodePrefix) : 'D'
    const rows = this.floorPreviews()
    const total = rows.reduce((sum, row) => sum + row.codes.length, 0)
    if (!total) return ''

    if (this.data.generationScope === 'UNITS_ONLY') {
      return `${this.data.floors.length} pisos × ${v.unitsPerFloor} = ${total} ${this.data.mode === 'BUILDING' ? 'departamentos' : 'domicilios'}.`
    }

    if (this.data.mode === 'BUILDING') {
      return `Se crearán ${v.floorsCount} pisos y ${total} departamentos (${rows[0]?.codes[0]} … ${rows.at(-1)?.codes.at(-1)}).`
    }

    const floors = v.towersCount * v.floorsPerTower
    return `Se crearán ${v.towersCount} torres, ${floors} pisos y ${total} domicilios (${prefix}-001 …).`
  }

  floorPreviews () {
    const v = this.form.getRawValue()
    if (this.form.invalid) return []

    const prefix = this.data.mode === 'BUILDING' ? normalizeUnitCodePrefix(v.unitCodePrefix) : 'D'

    if (this.data.generationScope === 'UNITS_ONLY') {
      return previewBuildingOnExistingFloors(this.data.floors, v.unitsPerFloor, prefix)
    }

    if (this.data.mode === 'BUILDING') {
      return previewBuildingFull(v.floorsCount, v.unitsPerFloor, prefix)
    }

    return previewCondominiumFull(v.towersCount, v.floorsPerTower, v.unitsPerFloor, prefix)
  }

  save () {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    const prefix = normalizeUnitCodePrefix(v.unitCodePrefix)

    if (this.data.generationScope === 'UNITS_ONLY') {
      this.ref.close({
        type: 'UNITS_ONLY',
        payload: {
          unitsPerFloor: v.unitsPerFloor,
          replaceExisting: false,
          ...(this.data.mode === 'BUILDING' ? { unitCodePrefix: prefix } : {}),
        },
      })
      return
    }

    const payload = this.data.mode === 'BUILDING'
      ? {
          floorsCount: v.floorsCount,
          unitsPerFloor: v.unitsPerFloor,
          unitCodePrefix: prefix,
          replaceExisting: this.data.hasExisting,
        }
      : {
          towersCount: v.towersCount,
          floorsPerTower: v.floorsPerTower,
          unitsPerFloor: v.unitsPerFloor,
          replaceExisting: this.data.hasExisting,
        }

    this.ref.close({ type: 'FULL', payload })
  }
}

