import { Component, inject, OnInit } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'

import type { Condominium } from '../../core/models/domain.models'

export interface CondominiumFormData {
  item?: Condominium
  organizationType?: string
}

@Component({
  selector: 'app-condominium-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ dialogTitle() }}</h2>
    <mat-dialog-content class="dialog-form-wrap">
      @if (data.item) {
        <p class="code-hint">Código: <strong>{{ data.item.code }}</strong></p>
      }
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" autocomplete="off" />
          @if (form.controls.name.touched && form.controls.name.hasError('required')) {
            <mat-error>El nombre es obligatorio</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Dirección</mat-label>
          <input matInput formControlName="address" autocomplete="off" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Ciudad</mat-label>
          <input matInput formControlName="city" autocomplete="off" />
        </mat-form-field>
      </form>
      @if (!data.item) {
        <p class="code-hint">El código se asignará automáticamente (ej. COND-001).</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: ['.code-hint { font-size: 12px; color: #64748b; margin: 0 0 12px; }'],
})
export class CondominiumFormDialogComponent implements OnInit {
  readonly data = inject<CondominiumFormData>(MAT_DIALOG_DATA)
  private readonly ref = inject(MatDialogRef<CondominiumFormDialogComponent>)
  private readonly fb = inject(FormBuilder)

  dialogTitle () {
    const editing = !!this.data.item
    switch (this.data.organizationType) {
      case 'BUILDING':
        return editing ? 'Editar edificio' : 'Nuevo edificio'
      case 'CONDOMINIUM':
        return editing ? 'Editar condominio' : 'Nuevo condominio'
      default:
        return editing ? 'Editar edificio / condominio' : 'Nuevo edificio / condominio'
    }
  }

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: [''],
    city: [''],
  })

  ngOnInit () {
    if (this.data.item) {
      this.form.patchValue({
        name: this.data.item.name,
        address: this.data.item.address ?? '',
        city: this.data.item.city ?? '',
      })
    }
  }

  save () {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }
    this.ref.close(this.form.getRawValue())
  }
}

