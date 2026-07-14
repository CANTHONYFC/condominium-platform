import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { AccountStatement, MaintenanceFee, MorosityReport, Paginated, Payment, UnitAccountSummary, UnitPendingFees } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly api = inject(ApiService)

  listFees (params?: Record<string, string | number>) {
    return this.api.get<Paginated<MaintenanceFee>>('/finance/fees', params)
  }

  createFee (condominiumId: string, body: { unitId: string; period: string; amount: number; dueDate: string }) {
    return this.api.post<MaintenanceFee>(`/finance/condominiums/${condominiumId}/fees`, body)
  }

  generateFees (body: { condominiumId: string; period: string; dueDate: string }) {
    return this.api.post<{ created: number }>('/finance/fees/generate', body)
  }

  listPayments (params?: Record<string, string | number>) {
    return this.api.get<Paginated<Payment>>('/finance/payments', params)
  }

  registerPayment (body: {
    maintenanceFeeId?: string
    amount: number
    method: string
    reference?: string
    notes?: string
    attachmentUrl?: string
    paymentDate?: string
  }) {
    return this.api.post<Payment>('/finance/payments', body)
  }

  getStatement (unitId: string, fromPeriod?: string, toPeriod?: string) {
    return this.api.get<AccountStatement>(`/finance/units/${unitId}/statement`, {
      fromPeriod: fromPeriod ?? '',
      toPeriod: toPeriod ?? '',
    })
  }

  getStatementPdf (unitId: string, mode: 'latest' | 'history' = 'latest') {
    return this.api.get<{ fileUrl: string; mode: string }>(`/finance/units/${unitId}/statement/pdf`, { mode })
  }

  listAccountSummaries (condominiumId: string, params?: { search?: string; limit?: number }) {
    return this.api.get<Paginated<UnitAccountSummary>>(
      `/finance/condominiums/${condominiumId}/account-summaries`,
      { limit: params?.limit ?? 100, search: params?.search ?? '' },
    )
  }

  getMorosity (condominiumId: string) {
    return this.api.get<MorosityReport>(`/finance/condominiums/${condominiumId}/morosity`)
  }

  getUnitPendingFees (unitId: string) {
    return this.api.get<UnitPendingFees>(`/finance/units/${unitId}/pending-fees`)
  }
}