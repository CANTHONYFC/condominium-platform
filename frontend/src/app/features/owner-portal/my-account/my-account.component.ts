import { Component, inject, OnInit, signal } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import { MatTableModule } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { PortalApiService } from '../../../core/services/portal-api.service'
import { FinanceApiService } from '../../../core/services/finance-api.service'
import { NotifyService } from '../../../core/services/notify.service'
import type { AccountStatement } from '../../../core/models/domain.models'
import { environment } from '../../../../environments/environment'
import { PageHeadingComponent } from '../../../shared/components/page-heading/page-heading.component'

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [
    DecimalPipe,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeadingComponent,
  ],
  templateUrl: './my-account.component.html',
  styleUrl: './my-account.component.scss',
})
export class MyAccountComponent implements OnInit {
  private readonly portalApi = inject(PortalApiService)
  private readonly financeApi = inject(FinanceApiService)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly statement = signal<AccountStatement | null>(null)
  readonly unitCode = signal('')
  readonly feeCols = ['period', 'concepts', 'amount', 'paid', 'balance', 'status']

  ngOnInit () {
    this.portalApi.getMyStatement().subscribe({
      next: (s) => {
        this.statement.set(s)
        this.unitCode.set(s.context.unitCode)
        this.loading.set(false)
      },
      error: () => {
        this.notify.error('Error al cargar tu estado de cuenta')
        this.loading.set(false)
      },
    })
  }

  formatConcepts (fee: AccountStatement['fees'][number]) {
    return fee.concepts?.map((c) => `${c.name}: S/ ${c.amount.toFixed(2)}`).join(' · ') || '—'
  }

  statusClass (status: string) {
    if (status === 'PAID') return 'badge badge--green'
    if (status === 'OVERDUE') return 'badge badge--red'
    if (status === 'PARTIAL') return 'badge badge--orange'
    return 'badge badge--gray'
  }

  downloadPdf (mode: 'latest' | 'history') {
    const unitId = this.statement()?.unit.id
    if (!unitId) return
    this.financeApi.getStatementPdf(unitId, mode).subscribe({
      next: (r) => window.open(`${environment.serverUrl}${r.fileUrl}`, '_blank'),
      error: () => this.notify.error('No se pudo generar el PDF'),
    })
  }
}
