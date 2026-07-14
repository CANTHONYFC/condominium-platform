import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatSelectModule } from '@angular/material/select'

import { StructureApiService } from '../../core/services/structure-api.service'
import type { Condominium, Owner } from '../../core/models/domain.models'
import { UnitPickerComponent } from './unit-picker.component'

export interface OwnerFormDialogData {
  item?: Owner
  organizationType: string
  condominiums: Condominium[]
}

@Component({
  selector: 'app-owner-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    UnitPickerComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Editar propietario' : 'Nuevo propietario' }}</h2>
    <mat-dialog-content class="owner-dialog-content">
      <form [formGroup]="form" [class.owner-dialog-grid]="!data.item" class="owner-dialog-form">
        <div class="owner-dialog-col owner-dialog-col--data">
          <div class="col-title">Datos del propietario</div>
          <mat-form-field appearance="outline"><mat-label>Tipo</mat-label>
            <mat-select formControlName="type">
              <mat-option value="NATURAL">Persona natural</mat-option>
              <mat-option value="LEGAL">Persona jurídica</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Tipo documento</mat-label><input matInput formControlName="documentType" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>N° documento</mat-label><input matInput formControlName="documentNumber" /></mat-form-field>
          @if (form.value.type === 'NATURAL') {
            <mat-form-field appearance="outline"><mat-label>Nombres</mat-label><input matInput formControlName="firstName" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Apellidos</mat-label><input matInput formControlName="lastName" /></mat-form-field>
          } @else {
            <mat-form-field appearance="outline"><mat-label>Razón social</mat-label><input matInput formControlName="legalName" /></mat-form-field>
          }
          <mat-form-field appearance="outline"><mat-label>Email (usuario de acceso)</mat-label><input matInput type="email" formControlName="email" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Teléfono</mat-label><input matInput formControlName="phone" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Dirección</mat-label><input matInput formControlName="address" /></mat-form-field>

          @if (!data.item) {
            <mat-form-field appearance="outline">
              <mat-label>Contraseña del portal</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
              <mat-hint>Mínimo 8 caracteres. Login con el correo indicado.</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Confirmar contraseña</mat-label>
              <input matInput type="password" formControlName="passwordConfirm" autocomplete="new-password" />
            </mat-form-field>
          }
        </div>

        @if (!data.item) {
          <div class="owner-dialog-col owner-dialog-col--units">
            <div class="col-title">
              {{ structureMode() === 'BUILDING' ? 'Asignar departamento' : 'Seleccionar domicilio' }}
            </div>
            <p class="section-hint">
              @if (structureMode() === 'BUILDING') {
                Elige el departamento vacante por piso. El propietario ingresará con su correo y contraseña.
              } @else {
                Navega por piso y elige un domicilio disponible. Solo se muestran los vacantes.
              }
            </p>

            @if (showCondoSelect()) {
              <mat-form-field appearance="outline">
                <mat-label>{{ structureMode() === 'BUILDING' ? 'Edificio' : 'Condominio' }}</mat-label>
                <mat-select formControlName="condominiumId" (selectionChange)="onCondoChange()">
                  @for (c of data.condominiums; track c.id) {
                    <mat-option [value]="c.id">{{ c.code }} — {{ c.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            @if (selectedCondoId()) {
              <app-unit-picker
                [condominiumId]="selectedCondoId()!"
                [mode]="structureMode()"
                [(unitId)]="selectedUnitId"
              />
            }
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!canSave()" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .owner-dialog-content {
      min-width: 320px;
      max-height: 75vh;
      overflow: auto;
    }
    .owner-dialog-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
    }
    .owner-dialog-grid {
      display: grid;
      grid-template-columns: minmax(300px, 1fr) minmax(360px, 1.1fr);
      gap: 28px;
      align-items: start;
      min-width: 880px;
    }
    .owner-dialog-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .owner-dialog-col--units {
      border-left: 1px solid #e2e8f0;
      padding-left: 28px;
    }
    .col-title {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .section-hint {
      margin: 0 0 12px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.45;
    }
  `],
})
export class OwnerFormDialogComponent implements OnInit {
  readonly data = inject<OwnerFormDialogData>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<OwnerFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly structureApi = inject(StructureApiService)

  readonly selectedUnitId = signal<string | null>(null)
  readonly structureMode = signal<'BUILDING' | 'CONDOMINIUM'>('BUILDING')

  readonly form = this.fb.nonNullable.group({
    type: ['NATURAL' as Owner['type'], Validators.required],
    documentType: ['DNI', Validators.required],
    documentNumber: ['', Validators.required],
    firstName: [''],
    lastName: [''],
    legalName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: [''],
    condominiumId: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    passwordConfirm: ['', Validators.required],
  })

  readonly showCondoSelect = computed(() => this.data.condominiums.length > 1)

  readonly selectedCondoId = computed(() => {
    if (this.data.item) return null
    if (this.data.condominiums.length === 1) return this.data.condominiums[0].id
    return this.form.controls.condominiumId.value || null
  })

  ngOnInit () {
    if (this.data.item) {
      this.form.patchValue(this.data.item as never)
      this.form.controls.password.disable()
      this.form.controls.passwordConfirm.disable()
      this.form.controls.condominiumId.disable()
      return
    }

    if (this.data.condominiums.length === 1) {
      this.loadStructureMode(this.data.condominiums[0].id)
      return
    }

    if (this.data.condominiums.length) {
      this.form.patchValue({ condominiumId: this.data.condominiums[0].id })
      this.loadStructureMode(this.data.condominiums[0].id)
    }
  }

  onCondoChange () {
    const id = this.form.controls.condominiumId.value
    if (id) this.loadStructureMode(id)
    this.selectedUnitId.set(null)
  }

  canSave () {
    if (this.form.invalid) return false
    if (this.data.item) return true
    const password = this.form.controls.password.value
    const confirm = this.form.controls.passwordConfirm.value
    if (password !== confirm) return false
    return !!this.selectedUnitId()
  }

  save () {
    if (!this.canSave()) return
    const raw = this.form.getRawValue()
    const payload: Record<string, unknown> = {
      type: raw.type,
      documentType: raw.documentType,
      documentNumber: raw.documentNumber,
      firstName: raw.firstName,
      lastName: raw.lastName,
      legalName: raw.legalName,
      email: raw.email,
      phone: raw.phone,
      address: raw.address,
    }

    if (!this.data.item) {
      payload['unitId'] = this.selectedUnitId()
      payload['password'] = raw.password
      payload['createPortalAccess'] = true
    }

    this.ref.close(payload)
  }

  private loadStructureMode (condoId: string) {
    if (this.data.organizationType === 'BUILDING') {
      this.structureMode.set('BUILDING')
      return
    }
    if (this.data.organizationType === 'CONDOMINIUM') {
      this.structureMode.set('CONDOMINIUM')
      return
    }
    this.structureApi.getStructureMode(condoId).subscribe({
      next: (m) => this.structureMode.set(m.mode),
      error: () => this.structureMode.set('CONDOMINIUM'),
    })
  }
}

@Component({
  selector: 'app-assign-ownership-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    UnitPickerComponent,
  ],
  template: `
    <h2 mat-dialog-title>Asignar unidad</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        @if (data.condominiums.length > 1) {
          <mat-form-field appearance="outline"><mat-label>Edificio / Condominio</mat-label>
            <mat-select formControlName="condominiumId" (selectionChange)="onCondoChange()">
              @for (c of data.condominiums; track c.id) {
                <mat-option [value]="c.id">{{ c.code }} — {{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        @if (selectedCondoId()) {
          <app-unit-picker
            [condominiumId]="selectedCondoId()!"
            [mode]="structureMode()"
            [(unitId)]="selectedUnitId"
          />
        }
        <mat-form-field appearance="outline"><mat-label>% copropiedad</mat-label><input matInput type="number" formControlName="sharePercent" /></mat-form-field>
        @if (data.showPassword) {
          <mat-form-field appearance="outline">
            <mat-label>Contraseña del portal</mat-label>
            <input matInput type="password" formControlName="password" />
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!canSubmit()" (click)="submit()">Asignar</button>
    </mat-dialog-actions>
  `,
})
export class AssignOwnershipDialogComponent implements OnInit {
  readonly data = inject<{ condominiums: Condominium[]; showPassword?: boolean; organizationType?: string }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<AssignOwnershipDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly structureApi = inject(StructureApiService)

  readonly selectedUnitId = signal<string | null>(null)
  readonly structureMode = signal<'BUILDING' | 'CONDOMINIUM'>('BUILDING')

  readonly form = this.fb.nonNullable.group({
    condominiumId: ['', Validators.required],
    sharePercent: [100],
    password: [''],
  })

  readonly selectedCondoId = computed(() => {
    if (this.data.condominiums.length === 1) return this.data.condominiums[0].id
    return this.form.controls.condominiumId.value || null
  })

  ngOnInit () {
    if (this.data.condominiums.length) {
      this.form.patchValue({ condominiumId: this.data.condominiums[0].id })
      this.loadStructureMode(this.data.condominiums[0].id)
    }
    if (!this.data.showPassword) {
      this.form.controls.password.disable()
    } else {
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)])
    }
  }

  onCondoChange () {
    const id = this.form.controls.condominiumId.value
    if (id) this.loadStructureMode(id)
    this.selectedUnitId.set(null)
  }

  canSubmit () {
    if (!this.selectedUnitId()) return false
    if (this.data.showPassword && this.form.controls.password.invalid) return false
    return true
  }

  submit () {
    if (!this.canSubmit()) return
    const { sharePercent, password } = this.form.getRawValue()
    this.ref.close({
      unitId: this.selectedUnitId(),
      sharePercent,
      isPrimary: true,
      ...(password ? { password } : {}),
    })
  }

  private loadStructureMode (condoId: string) {
    const org = this.data.organizationType
    if (org === 'BUILDING') { this.structureMode.set('BUILDING'); return }
    if (org === 'CONDOMINIUM') { this.structureMode.set('CONDOMINIUM'); return }
    this.structureApi.getStructureMode(condoId).subscribe({
      next: (m) => this.structureMode.set(m.mode),
      error: () => this.structureMode.set('CONDOMINIUM'),
    })
  }
}

@Component({
  selector: 'app-owner-document-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Agregar documento</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline"><mat-label>Categoría</mat-label><input matInput formControlName="category" placeholder="Contrato, DNI..." /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Título</mat-label><input matInput formControlName="title" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>URL del archivo</mat-label><input matInput formControlName="fileUrl" placeholder="https://..." /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="ref.close(form.getRawValue())">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class OwnerDocumentDialogComponent {
  readonly ref = inject(MatDialogRef<OwnerDocumentDialogComponent>)
  private readonly fb = inject(FormBuilder)
  readonly form = this.fb.nonNullable.group({
    category: ['GENERAL', Validators.required],
    title: ['', Validators.required],
    fileUrl: ['', Validators.required],
  })
}
