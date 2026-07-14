import { Component, inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'

import { EXPENSE_CATEGORIES } from '../../core/constants/expense-categories'
import type { Expense } from '../../core/models/domain.models'
import { StorageApiService } from '../../core/services/storage-api.service'
import { NotifyService } from '../../core/services/notify.service'

@Component({
  selector: 'app-expense-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Editar' : 'Nuevo' }} gasto</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="category">
            @for (c of categories; track c.value) {
              <mat-option [value]="c.value">{{ c.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Monto</mat-label><input matInput type="number" formControlName="amount" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Proveedor</mat-label><input matInput formControlName="vendor" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Descripción</mat-label><textarea matInput formControlName="description"></textarea></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Fecha</mat-label><input matInput type="date" formControlName="transactionDate" /></mat-form-field>
        <div class="flex items-center gap-2">
          <button mat-stroked-button type="button" (click)="fileInput.click()">Subir comprobante PDF</button>
          <input #fileInput type="file" accept=".pdf,image/*" hidden (change)="onFile($event)" />
          @if (form.value.attachmentUrl) { <span class="text-sm text-green-700">Archivo listo</span> }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="ref.close(form.getRawValue())">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class ExpenseFormDialogComponent {
  readonly categories = EXPENSE_CATEGORIES
  readonly data = inject<{ item?: Expense; condominiumId: string }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<ExpenseFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly storage = inject(StorageApiService)
  private readonly notify = inject(NotifyService)

  readonly form = this.fb.nonNullable.group({
    category: [this.data.item?.category ?? 'otros', Validators.required],
    amount: [Number(this.data.item?.amount ?? 0), [Validators.required, Validators.min(0.01)]],
    vendor: [this.data.item?.vendor ?? ''],
    description: [this.data.item?.description ?? ''],
    transactionDate: [
      this.data.item?.transactionDate
        ? this.data.item.transactionDate.split('T')[0]
        : new Date().toISOString().split('T')[0],
    ],
    attachmentUrl: [this.data.item?.attachmentUrl ?? ''],
  })

  onFile (ev: Event) {
    const input = ev.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    this.storage.upload(file, 'expenses').subscribe({
      next: (r) => {
        this.form.patchValue({ attachmentUrl: r.fileUrl })
        this.notify.success('Archivo subido')
      },
      error: () => this.notify.error('Error al subir'),
    })
  }
}
