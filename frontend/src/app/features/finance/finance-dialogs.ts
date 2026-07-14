import { Component, inject, OnInit, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatSelectModule } from '@angular/material/select'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatNativeDateModule } from '@angular/material/core'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatRadioModule } from '@angular/material/radio'
import { FormsModule } from '@angular/forms'

import type { Condominium, Unit, UnitPendingFees } from '../../core/models/domain.models'
import { FinanceApiService } from '../../core/services/finance-api.service'
import { StructureApiService } from '../../core/services/structure-api.service'
import { StorageApiService } from '../../core/services/storage-api.service'
import { NotifyService } from '../../core/services/notify.service'
import { PeriodMonthFieldComponent } from '../../shared/components/period-month-field/period-month-field.component'
import { dateToIsoDate, periodFromDate } from '../../shared/utils/unit-location'
import { environment } from '../../../environments/environment'

function defaultDueDate () {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 5)
}

function ownerLabel (unit: Unit) {
  const owner = unit.ownerships?.[0]?.owner
  if (!owner) return 'Sin propietario'
  if (owner.type === 'LEGAL') return owner.legalName?.trim() || '—'
  return `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || '—'
}

@Component({
  selector: 'app-payment-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule,
  ],
  template: `
    <h2 mat-dialog-title>Registrar pago</h2>
    <mat-dialog-content class="payment-dialog">
      <p class="payment-dialog__intro">
        Busca el departamento, elige la deuda a pagar e indica el monto.
      </p>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Buscar departamento</mat-label>
        <mat-icon matPrefix fontSet="material-icons-round">search</mat-icon>
        <input
          matInput
          [(ngModel)]="unitSearch"
          [ngModelOptions]="{ standalone: true }"
          (ngModelChange)="onUnitSearch()"
          placeholder="Código D-003, propietario..."
          [disabled]="!!selectedUnit()"
        />
        @if (selectedUnit()) {
          <button mat-icon-button matSuffix type="button" (click)="clearUnit()" aria-label="Cambiar departamento">
            <mat-icon fontSet="material-icons-round">close</mat-icon>
          </button>
        }
      </mat-form-field>

      @if (!selectedUnit() && filteredUnits().length) {
        <div class="unit-results">
          @for (unit of filteredUnits(); track unit.id) {
            <button type="button" class="unit-result" (click)="selectUnit(unit)">
              <strong>{{ unit.code }}</strong>
              <span>{{ ownerLabel(unit) }}</span>
            </button>
          }
        </div>
      }

      @if (selectedUnit(); as unit) {
        <div class="selected-unit">
          <div>
            <span class="selected-unit__label">Departamento</span>
            <strong>{{ unit.code }}</strong>
            @if (pendingFees()?.owner; as owner) {
              <span class="selected-unit__owner">{{ owner.name }}</span>
            }
          </div>
          @if (pendingFees()) {
            <span class="selected-unit__debt">
              Deuda total S/ {{ formatMoney(pendingFees()!.totalDebt) }}
            </span>
          }
        </div>
      }

      @if (loadingDebts()) {
        <div class="payment-dialog__loading">
          <mat-spinner diameter="32"></mat-spinner>
        </div>
      } @else if (selectedUnit() && pendingFees()) {
        @if (pendingFees()!.items.length) {
          <div class="debt-section">
            <h3>¿A qué deuda aplica este pago?</h3>
            <mat-radio-group
              [ngModel]="selectedFeeId()"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="selectFee($event)"
              class="debt-list"
            >
              @for (fee of pendingFees()!.items; track fee.id) {
                <mat-radio-button [value]="fee.id" class="debt-card">
                  <div class="debt-card__body">
                    <div class="debt-card__main">
                      <strong>{{ fee.periodLabel }}</strong>
                      <span class="debt-card__period">{{ fee.period }}</span>
                    </div>
                    <div class="debt-card__amounts">
                      <span>Cuota S/ {{ formatMoney(fee.amount) }}</span>
                      <span>Pagado S/ {{ formatMoney(fee.paid) }}</span>
                      <strong>Saldo S/ {{ formatMoney(fee.balance) }}</strong>
                    </div>
                    <div class="debt-card__meta">
                      Vence {{ formatDate(fee.dueDate) }} · {{ feeStatusLabel(fee.status) }}
                    </div>
                  </div>
                </mat-radio-button>
              }
            </mat-radio-group>
          </div>
        } @else {
          <p class="payment-dialog__empty">Este departamento no tiene deudas pendientes.</p>
        }
      }

      @if (selectedFee(); as fee) {
        <div class="payment-target">
          <mat-icon fontSet="material-icons-round">link</mat-icon>
          <span>
            El pago se aplicará a <strong>{{ selectedUnit()?.code }} · {{ fee.periodLabel }}</strong>
            (saldo S/ {{ formatMoney(fee.balance) }})
          </span>
        </div>

        <form [formGroup]="form" class="payment-form">
          <mat-form-field appearance="outline">
            <mat-label>Monto a pagar</mat-label>
            <span matTextPrefix>S/&nbsp;</span>
            <input matInput type="number" formControlName="amount" />
            <mat-hint>Máximo S/ {{ formatMoney(fee.balance) }}</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Método</mat-label>
            <mat-select formControlName="method">
              <mat-option value="TRANSFER">Transferencia</mat-option>
              <mat-option value="CASH">Efectivo</mat-option>
              <mat-option value="CHECK">Cheque</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Referencia</mat-label>
            <input matInput formControlName="reference" placeholder="Nº operación, voucher..." />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fecha de pago</mat-label>
            <input matInput [matDatepicker]="payPicker" formControlName="paymentDate" readonly (click)="payPicker.open()" />
            <mat-datepicker-toggle matIconSuffix [for]="payPicker"></mat-datepicker-toggle>
            <mat-datepicker #payPicker></mat-datepicker>
          </mat-form-field>

          <div class="receipt-section">
            <span class="receipt-section__label">Comprobante de pago</span>
            <div class="receipt-actions">
              <button mat-stroked-button type="button" (click)="cameraInput.click()" [disabled]="uploadingReceipt()">
                <mat-icon fontSet="material-icons-round">photo_camera</mat-icon>
                Tomar foto
              </button>
              <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="uploadingReceipt()">
                <mat-icon fontSet="material-icons-round">upload</mat-icon>
                Subir imagen
              </button>
              @if (form.value.attachmentUrl) {
                <button mat-button type="button" (click)="clearReceipt()">Quitar</button>
              }
            </div>
            <input
              #cameraInput
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              (change)="onReceiptFile($event)"
            />
            <input
              #fileInput
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf"
              hidden
              (change)="onReceiptFile($event)"
            />
            @if (uploadingReceipt()) {
              <div class="receipt-uploading">
                <mat-spinner diameter="24"></mat-spinner>
                <span>Subiendo comprobante...</span>
              </div>
            }
            @if (receiptPreviewUrl(); as preview) {
              <div class="receipt-preview">
                @if (receiptIsPdf()) {
                  <div class="receipt-preview__pdf">
                    <mat-icon fontSet="material-icons-round">picture_as_pdf</mat-icon>
                    <span>PDF adjunto</span>
                    <a [href]="preview" target="_blank" rel="noopener">Ver archivo</a>
                  </div>
                } @else {
                  <img [src]="preview" alt="Vista previa del comprobante" />
                }
              </div>
            } @else if (!uploadingReceipt()) {
              <p class="receipt-hint">Opcional: foto del voucher, transferencia o recibo en efectivo.</p>
            }
          </div>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || !selectedFeeId() || uploadingReceipt()"
        (click)="submit()"
      >
        Registrar pago
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .payment-dialog { min-width: min(560px, 92vw); max-width: 620px; }
    .payment-dialog__intro { margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.45; }
    .w-full { width: 100%; }
    .unit-results {
      display: grid;
      gap: 8px;
      max-height: 180px;
      overflow: auto;
      margin-bottom: 12px;
      padding: 4px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
    }
    .unit-result {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      text-align: left;
    }
    .unit-result:hover { border-color: #93c5fd; background: #eff6ff; }
    .unit-result strong { color: #0f172a; }
    .unit-result span { font-size: 12px; color: #64748b; }
    .selected-unit {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 14px;
      margin-bottom: 12px;
      border-radius: 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .selected-unit__label { display: block; font-size: 11px; color: #64748b; }
    .selected-unit__owner { display: block; font-size: 12px; color: #475569; margin-top: 2px; }
    .selected-unit__debt { font-size: 13px; font-weight: 700; color: #b91c1c; align-self: center; }
    .payment-dialog__loading { display: flex; justify-content: center; padding: 24px; }
    .payment-dialog__empty {
      margin: 0 0 12px;
      padding: 16px;
      text-align: center;
      border-radius: 10px;
      background: #f8fafc;
      color: #64748b;
      font-size: 13px;
    }
    .debt-section h3 { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #0f172a; }
    .debt-list { display: grid; gap: 10px; width: 100%; }
    .debt-card {
      width: 100%;
      margin: 0;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
    }
    .debt-card.mat-mdc-radio-checked { border-color: #2563eb; background: #f8fbff; }
    .debt-card__body { display: grid; gap: 6px; margin-left: 8px; }
    .debt-card__main { display: flex; align-items: baseline; gap: 8px; }
    .debt-card__period { font-size: 11px; color: #94a3b8; }
    .debt-card__amounts {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 12px;
      color: #64748b;
    }
    .debt-card__amounts strong { color: #b91c1c; font-size: 14px; }
    .debt-card__meta { font-size: 11px; color: #94a3b8; }
    .payment-target {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      margin: 12px 0;
      border-radius: 10px;
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      font-size: 13px;
      color: #166534;
    }
    .payment-target mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .payment-form { display: grid; gap: 4px; }
    .receipt-section {
      margin-top: 8px;
      padding: 12px;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      background: #f8fafc;
    }
    .receipt-section__label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 10px;
    }
    .receipt-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .receipt-actions button mat-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .receipt-uploading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 12px;
      font-size: 13px;
      color: #64748b;
    }
    .receipt-hint {
      margin: 10px 0 0;
      font-size: 12px;
      color: #94a3b8;
    }
    .receipt-preview {
      margin-top: 12px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      background: #fff;
    }
    .receipt-preview img {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: contain;
      background: #0f172a;
    }
    .receipt-preview__pdf {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 14px;
      font-size: 13px;
      color: #475569;
    }
    .receipt-preview__pdf mat-icon { color: #dc2626; }
    .receipt-preview__pdf a { color: #2563eb; text-decoration: none; font-weight: 600; }
  `],
})
export class PaymentFormDialogComponent implements OnInit {
  readonly data = inject<{
    condominiumId: string
    preselectedUnitId?: string
    preselectedFeeId?: string
  }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<PaymentFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly financeApi = inject(FinanceApiService)
  private readonly structureApi = inject(StructureApiService)
  private readonly storage = inject(StorageApiService)
  private readonly notify = inject(NotifyService)

  readonly loadingDebts = signal(false)
  readonly uploadingReceipt = signal(false)
  readonly receiptPreviewUrl = signal<string | null>(null)
  readonly receiptIsPdf = signal(false)
  private localPreviewUrl: string | null = null
  readonly selectedUnit = signal<Unit | null>(null)
  readonly pendingFees = signal<UnitPendingFees | null>(null)
  readonly selectedFeeId = signal<string | null>(null)
  readonly units = signal<Unit[]>([])
  readonly filteredUnits = signal<Unit[]>([])
  readonly selectedFee = signal<UnitPendingFees['items'][number] | null>(null)
  unitSearch = ''

  readonly form = this.fb.group({
    maintenanceFeeId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    method: ['TRANSFER', Validators.required],
    reference: [''],
    attachmentUrl: [''],
    paymentDate: [new Date(), Validators.required],
  })

  readonly ownerLabel = ownerLabel

  ngOnInit () {
    this.structureApi.listUnits(this.data.condominiumId).subscribe({
      next: (r) => {
        this.units.set(r.data.filter((u) => u.type === 'APARTMENT'))
        if (this.data.preselectedUnitId) {
          const unit = r.data.find((u) => u.id === this.data.preselectedUnitId)
          if (unit) this.selectUnit(unit, this.data.preselectedFeeId)
        }
      },
    })
  }

  onUnitSearch () {
    const q = this.unitSearch.trim().toLowerCase()
    if (!q || this.selectedUnit()) {
      this.filteredUnits.set([])
      return
    }
    this.filteredUnits.set(
      this.units().filter((unit) => {
        const code = unit.code.toLowerCase()
        const owner = ownerLabel(unit).toLowerCase()
        return code.includes(q) || owner.includes(q)
      }).slice(0, 8),
    )
  }

  selectUnit (unit: Unit, feeId?: string) {
    this.selectedUnit.set(unit)
    this.unitSearch = unit.code
    this.filteredUnits.set([])
    this.selectedFeeId.set(null)
    this.selectedFee.set(null)
    this.pendingFees.set(null)
    this.form.reset({
      maintenanceFeeId: '',
      amount: 0,
      method: 'TRANSFER',
      reference: '',
      attachmentUrl: '',
      paymentDate: new Date(),
    })
    this.clearReceiptPreview()

    this.loadingDebts.set(true)
    this.financeApi.getUnitPendingFees(unit.id).subscribe({
      next: (debts) => {
        this.pendingFees.set(debts)
        this.loadingDebts.set(false)
        const pick = feeId && debts.items.some((i) => i.id === feeId)
          ? feeId
          : debts.items[0]?.id
        if (pick) this.selectFee(pick)
      },
      error: () => {
        this.loadingDebts.set(false)
        this.pendingFees.set(null)
      },
    })
  }

  clearUnit () {
    this.selectedUnit.set(null)
    this.pendingFees.set(null)
    this.selectedFeeId.set(null)
    this.selectedFee.set(null)
    this.unitSearch = ''
    this.filteredUnits.set([])
    this.form.reset({
      maintenanceFeeId: '',
      amount: 0,
      method: 'TRANSFER',
      reference: '',
      attachmentUrl: '',
      paymentDate: new Date(),
    })
    this.clearReceiptPreview()
  }

  clearReceipt () {
    this.form.patchValue({ attachmentUrl: '' })
    this.clearReceiptPreview()
  }

  clearReceiptPreview () {
    if (this.localPreviewUrl) {
      URL.revokeObjectURL(this.localPreviewUrl)
      this.localPreviewUrl = null
    }
    this.receiptPreviewUrl.set(null)
    this.receiptIsPdf.set(false)
  }

  onReceiptFile (ev: Event) {
    const input = ev.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      this.notify.error('Solo imágenes o PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      this.notify.error('El archivo no debe superar 10 MB')
      return
    }

    this.clearReceiptPreview()
    if (isImage) {
      this.localPreviewUrl = URL.createObjectURL(file)
      this.receiptPreviewUrl.set(this.localPreviewUrl)
      this.receiptIsPdf.set(false)
    }

    this.uploadingReceipt.set(true)
    this.storage.upload(file, 'payments').subscribe({
      next: (r) => {
        this.form.patchValue({ attachmentUrl: r.fileUrl })
        if (isPdf) {
          this.receiptPreviewUrl.set(`${environment.serverUrl}${r.fileUrl}`)
          this.receiptIsPdf.set(true)
        } else {
          this.receiptPreviewUrl.set(`${environment.serverUrl}${r.fileUrl}`)
        }
        this.uploadingReceipt.set(false)
        this.notify.success('Comprobante adjunto')
      },
      error: () => {
        this.uploadingReceipt.set(false)
        this.clearReceiptPreview()
        this.notify.error('Error al subir comprobante')
      },
    })
  }

  selectFee (feeId: string) {
    const fee = this.pendingFees()?.items.find((i) => i.id === feeId)
    if (!fee) return
    this.selectedFeeId.set(feeId)
    this.selectedFee.set(fee)
    this.form.patchValue({
      maintenanceFeeId: feeId,
      amount: fee.balance,
      reference: `Pago ${fee.periodLabel}`,
    })
    this.form.controls.amount.setValidators([
      Validators.required,
      Validators.min(0.01),
      Validators.max(fee.balance),
    ])
    this.form.controls.amount.updateValueAndValidity()
  }

  feeStatusLabel (status: string) {
    const map: Record<string, string> = {
      PENDING: 'Pendiente',
      PARTIAL: 'Parcial',
      OVERDUE: 'Vencido',
      PAID: 'Pagado',
    }
    return map[status] ?? status
  }

  formatMoney (value: number) {
    const n = Number(value)
    return Number.isFinite(n) ? n.toFixed(2) : '0.00'
  }

  formatDate (value: string) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('es-PE')
  }

  submit () {
    if (this.form.invalid || !this.selectedFeeId()) return
    const v = this.form.getRawValue()
    const d = v.paymentDate instanceof Date ? v.paymentDate : new Date()
    this.ref.close({
      maintenanceFeeId: v.maintenanceFeeId,
      amount: Number(v.amount),
      method: v.method,
      reference: v.reference,
      attachmentUrl: v.attachmentUrl || undefined,
      paymentDate: dateToIsoDate(d),
    })
  }
}

@Component({
  selector: 'app-generate-fees-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    PeriodMonthFieldComponent,
  ],
  template: `
    <h2 mat-dialog-title>Generar cuotas del periodo</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline"><mat-label>Edificio / Condominio</mat-label>
          <mat-select formControlName="condominiumId">
            @for (c of data.condominiums; track c.id) {
              <mat-option [value]="c.id">{{ c.code }} — {{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <app-period-month-field formControlName="period" label="Periodo (mes)" />
        <mat-form-field appearance="outline">
          <mat-label>Fecha de vencimiento</mat-label>
          <input matInput [matDatepicker]="duePicker" formControlName="dueDate" readonly (click)="duePicker.open()" />
          <mat-datepicker-toggle matIconSuffix [for]="duePicker"></mat-datepicker-toggle>
          <mat-datepicker #duePicker></mat-datepicker>
        </mat-form-field>
      </form>
      <p class="hint">
        Modo rápido: una cuota por unidad con el monto base configurado en Estructura.
      </p>
      <p class="hint hint--accent">
        Para conserje, agua, luz y demás conceptos use
        <strong>Finanzas → Cuadro mensual</strong>.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">Generar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { font-size: 12px; color: #64748b; margin: 8px 0 0; line-height: 1.45; }
    .hint--accent { color: #1d4ed8; }
  `],
})
export class GenerateFeesDialogComponent {
  readonly data = inject<{ condominiums: Condominium[] }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<GenerateFeesDialogComponent>)
  private readonly fb = inject(FormBuilder)

  readonly form = this.fb.nonNullable.group({
    condominiumId: [this.data.condominiums[0]?.id ?? '', Validators.required],
    period: [periodFromDate(new Date()), Validators.required],
    dueDate: [defaultDueDate(), Validators.required],
  })

  submit () {
    const v = this.form.getRawValue()
    const due = v.dueDate instanceof Date ? v.dueDate : new Date(v.dueDate)
    this.ref.close({
      condominiumId: v.condominiumId,
      period: v.period,
      dueDate: dateToIsoDate(due),
    })
  }
}
