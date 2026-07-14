import { Component, forwardRef, Input, ViewChild } from '@angular/core'
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu'
import { MatSelectModule } from '@angular/material/select'

const MONTHS = [
  { value: 1, short: 'Ene', label: 'Enero' },
  { value: 2, short: 'Feb', label: 'Febrero' },
  { value: 3, short: 'Mar', label: 'Marzo' },
  { value: 4, short: 'Abr', label: 'Abril' },
  { value: 5, short: 'May', label: 'Mayo' },
  { value: 6, short: 'Jun', label: 'Junio' },
  { value: 7, short: 'Jul', label: 'Julio' },
  { value: 8, short: 'Ago', label: 'Agosto' },
  { value: 9, short: 'Sep', label: 'Septiembre' },
  { value: 10, short: 'Oct', label: 'Octubre' },
  { value: 11, short: 'Nov', label: 'Noviembre' },
  { value: 12, short: 'Dic', label: 'Diciembre' },
] as const

@Component({
  selector: 'app-period-month-field',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PeriodMonthFieldComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field [appearance]="appearance" [class]="fieldClass">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        readonly
        [value]="displayLabel"
        (click)="openMenu()"
      />
      <button
        mat-icon-button
        matSuffix
        type="button"
        [matMenuTriggerFor]="periodMenu"
        #menuTrigger="matMenuTrigger"
        (click)="$event.stopPropagation()"
      >
        <mat-icon fontSet="material-icons-round">calendar_month</mat-icon>
      </button>
    </mat-form-field>

    <mat-menu #periodMenu="matMenu" class="period-picker-menu">
      <div class="period-picker" (click)="$event.stopPropagation()">
        <div class="period-picker__year">
          <span class="period-picker__year-label">Año</span>
          <mat-form-field appearance="outline" class="period-picker__year-select" subscriptSizing="dynamic">
            <mat-select [(ngModel)]="pickerYear" (ngModelChange)="onYearChange($event)">
              @for (y of years; track y) {
                <mat-option [value]="y">{{ y }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="period-picker__months">
          @for (m of months; track m.value) {
            <button
              type="button"
              class="month-badge"
              [class.month-badge--selected]="isSelectedMonth(m.value)"
              (click)="selectMonth(m.value)"
            >
              {{ m.short }}
            </button>
          }
        </div>
      </div>
    </mat-menu>
  `,
  styleUrl: './period-month-field.component.scss',
})
export class PeriodMonthFieldComponent implements ControlValueAccessor {
  @Input() label = 'Periodo'
  @Input() appearance: 'outline' | 'fill' = 'outline'
  @Input() fieldClass = ''

  @ViewChild('menuTrigger') menuTrigger?: MatMenuTrigger

  readonly months = MONTHS
  readonly years = this.buildYears()

  pickerYear = new Date().getFullYear()
  selectedMonth: number | null = null
  periodValue = ''

  private onChange: (v: string) => void = () => {}
  private onTouched: () => void = () => {}

  get displayLabel () {
    if (!this.periodValue) return ''
    const [y, m] = this.periodValue.split('-').map(Number)
    const month = this.months.find((item) => item.value === m)
    return `${month?.label ?? m} ${y}`
  }

  writeValue (period: string): void {
    this.periodValue = period ?? ''
    if (period) {
      const [y, m] = period.split('-').map(Number)
      this.pickerYear = y
      this.selectedMonth = m
    } else {
      this.selectedMonth = null
    }
  }

  registerOnChange (fn: (v: string) => void): void {
    this.onChange = fn
  }

  registerOnTouched (fn: () => void): void {
    this.onTouched = fn
  }

  openMenu () {
    this.menuTrigger?.openMenu()
  }

  isSelectedMonth (month: number) {
    if (!this.periodValue) return false
    const [y, m] = this.periodValue.split('-').map(Number)
    return y === this.pickerYear && m === month
  }

  onYearChange (year: number) {
    this.pickerYear = year
    if (this.selectedMonth) {
      this.emitPeriod(this.selectedMonth)
    }
  }

  selectMonth (month: number) {
    this.selectedMonth = month
    this.emitPeriod(month)
    this.menuTrigger?.closeMenu()
  }

  private emitPeriod (month: number) {
    this.periodValue = `${this.pickerYear}-${String(month).padStart(2, '0')}`
    this.onChange(this.periodValue)
    this.onTouched()
  }

  private buildYears () {
    const current = new Date().getFullYear()
    const start = current - 8
    const end = current + 4
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
}
