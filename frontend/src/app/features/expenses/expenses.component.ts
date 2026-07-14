import { Component, inject, OnInit, signal } from '@angular/core'
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatTableModule } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatDialog } from '@angular/material/dialog'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import { ExpensesApiService } from '../../core/services/expenses-api.service'
import { NotifyService } from '../../core/services/notify.service'
import type { Condominium, Expense } from '../../core/models/domain.models'
import { expenseCategoryLabel } from '../../core/constants/expense-categories'
import { ExpenseFormDialogComponent } from './expense-form.dialog'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'
import { environment } from '../../../environments/environment'

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    PageHeadingComponent,
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class ExpensesComponent implements OnInit {
  private readonly condosApi = inject(CondominiumsApiService)
  private readonly api = inject(ExpensesApiService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly items = signal<Expense[]>([])
  readonly condominiums = signal<Condominium[]>([])
  readonly summary = signal({ total: 0, totalAmount: 0 })

  selectedCondoId = ''
  serverUrl = environment.serverUrl
  readonly categoryLabel = expenseCategoryLabel

  isFromMaintenance (item: Expense) {
    return !!item.calendarEventId
  }

  ngOnInit () {
    this.condosApi.list({ limit: 100 }).subscribe({
      next: (r) => {
        this.condominiums.set(r.data)
        if (r.data.length) {
          this.selectedCondoId = r.data[0].id
          this.load()
        }
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  load () {
    if (!this.selectedCondoId) return
    this.api.list({ condominiumId: this.selectedCondoId, limit: 100 }).subscribe({
      next: (r) => this.items.set(r.data),
    })
    this.api.summary(this.selectedCondoId).subscribe({
      next: (s) => this.summary.set(s),
    })
  }

  openForm (item?: Expense) {
    if (item && this.isFromMaintenance(item)) {
      this.notify.error('Este gasto proviene de un mantenimiento. Edítalo desde Mantenimiento.')
      return
    }
    const ref = this.dialog.open(ExpenseFormDialogComponent, {
      width: '480px',
      data: { item, condominiumId: this.selectedCondoId },
    })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      const req = item ? this.api.update(item.id, v) : this.api.create({ ...v, condominiumId: this.selectedCondoId })
      req.subscribe({
        next: () => { this.notify.success('Gasto registrado'); this.load() },
        error: () => this.notify.error('Error'),
      })
    })
  }

  remove (item: Expense) {
    if (this.isFromMaintenance(item)) {
      this.notify.error('Este gasto proviene de un mantenimiento. Elimínalo desde Mantenimiento.')
      return
    }
    this.api.remove(item.id).subscribe({
      next: () => { this.notify.success('Eliminado'); this.load() },
    })
  }
}
