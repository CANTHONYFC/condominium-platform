import { Component, inject, OnInit, signal } from '@angular/core'
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatTableModule } from '@angular/material/table'
import { MatTabsModule } from '@angular/material/tabs'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatButtonModule } from '@angular/material/button'

import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import { ReportsApiService, type IncomeExpenseReport } from '../../core/services/reports-api.service'
import { expenseCategoryLabel } from '../../core/constants/expense-categories'
import { NotifyService } from '../../core/services/notify.service'
import type { Condominium } from '../../core/models/domain.models'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    PageHeadingComponent,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly condosApi = inject(CondominiumsApiService)
  private readonly api = inject(ReportsApiService)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly report = signal<IncomeExpenseReport | null>(null)
  readonly condominiums = signal<Condominium[]>([])

  selectedCondoId = ''
  filterFrom = ''
  filterTo = ''

  readonly categoryLabel = expenseCategoryLabel

  ngOnInit () {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    this.filterFrom = start.toISOString().split('T')[0]
    this.filterTo = now.toISOString().split('T')[0]

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
    this.loading.set(true)
    this.api.incomeExpense({
      condominiumId: this.selectedCondoId,
      from: this.filterFrom ? new Date(this.filterFrom).toISOString() : undefined,
      to: this.filterTo ? new Date(this.filterTo + 'T23:59:59').toISOString() : undefined,
    }).subscribe({
      next: (r) => {
        this.report.set(r)
        this.loading.set(false)
      },
      error: () => {
        this.notify.error('Error al cargar reporte')
        this.loading.set(false)
      },
    })
  }
}
