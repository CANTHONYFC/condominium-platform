import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { BillingGrid } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly api = inject(ApiService)

  getGrid (condominiumId: string, period: string) {
    return this.api.get<BillingGrid>('/billing/grid', { condominiumId, period })
  }

  updateConceptType (conceptId: string, type: 'FIXED' | 'VARIABLE') {
    return this.api.patch<{ id: string; type: string }>(
      `/billing/concepts/${conceptId}/type`,
      { type },
    )
  }

  updateSheet (sheetId: string, body: {
    label?: string
    dueDate?: string
    fixedPools?: Record<string, number>
  }) {
    return this.api.patch<{ id: string }>(`/billing/sheets/${sheetId}`, body)
  }

  updateLines (sheetId: string, lines: Array<{
    unitId: string
    chargeConceptId: string
    amount: number
    isManualOverride?: boolean
  }>) {
    return this.api.patch<{ updated: number }>(`/billing/sheets/${sheetId}/lines`, { lines })
  }

  recalculate (sheetId: string) {
    return this.api.post<{ recalculated: number; unitCount: number }>(
      `/billing/sheets/${sheetId}/recalculate`,
      {},
    )
  }

  publish (sheetId: string, dueDate?: string) {
    return this.api.post<{ published: boolean; fees: number; totalAmount: number }>(
      `/billing/sheets/${sheetId}/publish`,
      { dueDate },
    )
  }
}
