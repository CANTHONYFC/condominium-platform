import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { Expense, Paginated } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class ExpensesApiService {
  private readonly api = inject(ApiService)

  list (params?: Record<string, string | number>) {
    return this.api.get<Paginated<Expense>>('/expenses', params)
  }

  summary (condominiumId: string, from?: string, to?: string) {
    return this.api.get<{ total: number; totalAmount: number }>('/expenses/summary', {
      condominiumId,
      from: from ?? '',
      to: to ?? '',
    })
  }

  create (body: {
    condominiumId: string
    category: string
    amount: number
    description?: string
    vendor?: string
    receiptNumber?: string
    attachmentUrl?: string
    transactionDate?: string
  }) {
    return this.api.post<Expense>('/expenses', body)
  }

  update (id: string, body: Partial<Expense & { amount: number; transactionDate: string }>) {
    return this.api.patch<Expense>(`/expenses/${id}`, body)
  }

  remove (id: string) {
    return this.api.delete(`/expenses/${id}`)
  }
}
