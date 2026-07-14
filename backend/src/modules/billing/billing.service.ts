import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '../../../generated/prisma'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import {
  BillingGridQueryDto,
  PublishBillingSheetDto,
  UpdateBillingSheetDto,
  UpdateChargeConceptDto,
  UpdateChargeLinesDto,
} from './dto/billing.dto'
import { ChargeConceptType } from '../../../generated/prisma'

export const DEFAULT_CHARGE_CONCEPTS: Array<{
  code: string
  name: string
  type: ChargeConceptType
  sortOrder: number
}> = [
  { code: 'ADMIN', name: 'Administración y Conserje', type: 'FIXED', sortOrder: 1 },
  { code: 'CLEAN', name: 'Limpieza', type: 'FIXED', sortOrder: 2 },
  { code: 'WATER', name: 'Agua recibo', type: 'VARIABLE', sortOrder: 3 },
  { code: 'LIGHT', name: 'Luz común', type: 'FIXED', sortOrder: 4 },
  { code: 'ELEV', name: 'Mant. Ascensor', type: 'FIXED', sortOrder: 5 },
  { code: 'EXTRA', name: 'Bolsa extraordinarios', type: 'FIXED', sortOrder: 6 },
  { code: 'FINE', name: 'Multa', type: 'VARIABLE', sortOrder: 7 },
  { code: 'DEBT', name: 'Deuda pendiente', type: 'VARIABLE', sortOrder: 8 },
]

@Injectable()
export class BillingService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
  ) {}

  async ensureDefaultConcepts (tenantId: string, condominiumId: string) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    for (const concept of DEFAULT_CHARGE_CONCEPTS) {
      await this.prisma.chargeConcept.upsert({
        where: {
          condominiumId_code: { condominiumId, code: concept.code },
        },
        update: {},
        create: {
          tenantId,
          condominiumId,
          code: concept.code,
          name: concept.name,
          type: concept.type,
          sortOrder: concept.sortOrder,
        },
      })
    }
  }

  async getOrCreateGrid (tenantId: string, query: BillingGridQueryDto) {
    await this.ensureDefaultConcepts(tenantId, query.condominiumId)

    const units = await this.findOwnedApartmentUnits(tenantId, query.condominiumId)

    let sheet = await this.prisma.billingSheet.findUnique({
      where: {
        condominiumId_period: {
          condominiumId: query.condominiumId,
          period: query.period,
        },
      },
      include: { lines: true },
    })

    if (!sheet) {
      sheet = await this.prisma.billingSheet.create({
        data: {
          tenantId,
          condominiumId: query.condominiumId,
          period: query.period,
          label: this.formatPeriodLabel(query.period),
        },
        include: { lines: true },
      })
    }

    const concepts = await this.prisma.chargeConcept.findMany({
      where: {
        tenantId,
        condominiumId: query.condominiumId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    })

    await this.ensureLinesForUnits(tenantId, sheet.id, concepts, units)

    const refreshed = await this.prisma.billingSheet.findUniqueOrThrow({
      where: { id: sheet.id },
      include: {
        lines: {
          include: { chargeConcept: true },
        },
      },
    })

    const fixedPools = this.parseFixedPools(refreshed.fixedPools)
    const rows = units.map((unit) => {
      const owner = unit.ownerships[0]?.owner
      const ownerName = owner
        ? owner.type === 'LEGAL'
          ? owner.legalName ?? '—'
          : `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || '—'
        : '—'

      const cells: Record<string, {
        lineId: string
        amount: number
        isManualOverride: boolean
      }> = {}

      let rowTotal = 0
      for (const concept of concepts) {
        const line = refreshed.lines.find(
          (l) => l.unitId === unit.id && l.chargeConceptId === concept.id,
        )
        const amount = Number(line?.amount ?? 0)
        rowTotal += amount
        cells[concept.id] = {
          lineId: line?.id ?? '',
          amount,
          isManualOverride: line?.isManualOverride ?? false,
        }
      }

      return {
        unitId: unit.id,
        unitCode: unit.code,
        ownerName,
        cells,
        total: this.round2(rowTotal),
      }
    })

    const columnTotals: Record<string, number> = {}
    for (const concept of concepts) {
      columnTotals[concept.id] = this.round2(
        rows.reduce((s, r) => s + (r.cells[concept.id]?.amount ?? 0), 0),
      )
    }

    return {
      sheet: {
        id: refreshed.id,
        period: refreshed.period,
        label: refreshed.label,
        dueDate: refreshed.dueDate,
        status: refreshed.status,
        fixedPools,
      },
      concepts: concepts.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        type: c.type,
        sortOrder: c.sortOrder,
        poolAmount: c.type === 'FIXED' ? (fixedPools[c.id] ?? 0) : null,
      })),
      rows,
      columnTotals,
      grandTotal: this.round2(rows.reduce((s, r) => s + r.total, 0)),
    }
  }

  async updateSheet (
    tenantId: string,
    sheetId: string,
    dto: UpdateBillingSheetDto,
  ) {
    const sheet = await this.assertSheet(tenantId, sheetId)
    if (sheet.status === 'PUBLISHED') {
      throw new BadRequestException('El cuadro ya fue publicado')
    }

    const fixedPools = dto.fixedPools
      ? { ...this.parseFixedPools(sheet.fixedPools), ...dto.fixedPools }
      : undefined

    return this.prisma.billingSheet.update({
      where: { id: sheetId },
      data: {
        label: dto.label,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        fixedPools: fixedPools ?? undefined,
      },
    })
  }

  async updateConceptType (
    tenantId: string,
    conceptId: string,
    dto: UpdateChargeConceptDto,
  ) {
    const concept = await this.prisma.chargeConcept.findFirst({
      where: { id: conceptId, tenantId },
    })
    if (!concept) throw new NotFoundException('Concepto de cobro no encontrado')

    return this.prisma.chargeConcept.update({
      where: { id: conceptId },
      data: { type: dto.type },
    })
  }

  async updateLines (
    tenantId: string,
    sheetId: string,
    dto: UpdateChargeLinesDto,
  ) {
    const sheet = await this.assertSheet(tenantId, sheetId)
    if (sheet.status === 'PUBLISHED') {
      throw new BadRequestException('El cuadro ya fue publicado')
    }

    for (const line of dto.lines) {
      await this.prisma.chargeLine.updateMany({
        where: {
          tenantId,
          billingSheetId: sheetId,
          unitId: line.unitId,
          chargeConceptId: line.chargeConceptId,
        },
        data: {
          amount: line.amount,
          isManualOverride: line.isManualOverride ?? true,
        },
      })
    }

    return { updated: dto.lines.length }
  }

  async recalculate (tenantId: string, sheetId: string) {
    const sheet = await this.assertSheet(tenantId, sheetId)
    if (sheet.status === 'PUBLISHED') {
      throw new BadRequestException('El cuadro ya fue publicado')
    }

    const concepts = await this.prisma.chargeConcept.findMany({
      where: {
        tenantId,
        condominiumId: sheet.condominiumId,
        isActive: true,
        type: 'FIXED',
      },
    })

    const ownedUnits = await this.findOwnedApartmentUnits(tenantId, sheet.condominiumId)
    const vacantUnits = await this.findVacantApartmentUnits(tenantId, sheet.condominiumId)
    const unitCount = ownedUnits.length || 1
    const fixedPools = this.parseFixedPools(sheet.fixedPools)
    let updated = 0

    for (const concept of concepts) {
      for (const unit of vacantUnits) {
        await this.prisma.chargeLine.updateMany({
          where: {
            billingSheetId: sheetId,
            unitId: unit.id,
            chargeConceptId: concept.id,
          },
          data: { amount: 0, isManualOverride: false },
        })
      }
    }

    for (const concept of concepts) {
      const pool = fixedPools[concept.id] ?? 0
      const perUnit = this.round2(pool / unitCount)

      for (const unit of ownedUnits) {
        const existing = await this.prisma.chargeLine.findUnique({
          where: {
            billingSheetId_chargeConceptId_unitId: {
              billingSheetId: sheetId,
              chargeConceptId: concept.id,
              unitId: unit.id,
            },
          },
        })

        if (existing?.isManualOverride) continue

        await this.prisma.chargeLine.upsert({
          where: {
            billingSheetId_chargeConceptId_unitId: {
              billingSheetId: sheetId,
              chargeConceptId: concept.id,
              unitId: unit.id,
            },
          },
          update: { amount: perUnit },
          create: {
            tenantId,
            billingSheetId: sheetId,
            chargeConceptId: concept.id,
            unitId: unit.id,
            amount: perUnit,
          },
        })
        updated++
      }
    }

    return { recalculated: updated, unitCount }
  }

  async publish (
    tenantId: string,
    sheetId: string,
    dto: PublishBillingSheetDto,
  ) {
    const sheet = await this.assertSheet(tenantId, sheetId)
    if (sheet.status === 'PUBLISHED') {
      throw new BadRequestException('El cuadro ya fue publicado')
    }

    await this.recalculate(tenantId, sheetId)

    const lines = await this.prisma.chargeLine.findMany({
      where: { tenantId, billingSheetId: sheetId },
    })

    const unitTotals = new Map<string, number>()
    for (const line of lines) {
      const prev = unitTotals.get(line.unitId) ?? 0
      unitTotals.set(line.unitId, prev + Number(line.amount))
    }

    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : sheet.dueDate ?? this.defaultDueDate(sheet.period)

    const ownedUnitIds = new Set(
      (await this.findOwnedApartmentUnits(tenantId, sheet.condominiumId)).map((u) => u.id),
    )

    const feesCreated = []

    for (const [unitId, total] of unitTotals) {
      if (!ownedUnitIds.has(unitId)) continue
      const amount = this.round2(total)
      if (amount <= 0) continue

      let fee = await this.prisma.maintenanceFee.findFirst({
        where: {
          tenantId,
          unitId,
          period: sheet.period,
          deletedAt: null,
        },
      })

      if (fee) {
        fee = await this.prisma.maintenanceFee.update({
          where: { id: fee.id },
          data: { amount, dueDate },
        })
      } else {
        fee = await this.prisma.maintenanceFee.create({
          data: {
            tenantId,
            condominiumId: sheet.condominiumId,
            unitId,
            period: sheet.period,
            amount,
            dueDate,
          },
        })
      }

      await this.prisma.chargeLine.updateMany({
        where: { billingSheetId: sheetId, unitId },
        data: { maintenanceFeeId: fee.id },
      })

      feesCreated.push({ unitId, feeId: fee.id, amount })
    }

    await this.prisma.billingSheet.update({
      where: { id: sheetId },
      data: { status: 'PUBLISHED', dueDate },
    })

    return {
      published: true,
      fees: feesCreated.length,
      totalAmount: this.round2(
        feesCreated.reduce((s, f) => s + f.amount, 0),
      ),
    }
  }

  async getConceptLinesForFee (tenantId: string, maintenanceFeeId: string) {
    return this.prisma.chargeLine.findMany({
      where: { tenantId, maintenanceFeeId },
      include: { chargeConcept: { select: { code: true, name: true, type: true } } },
      orderBy: { chargeConcept: { sortOrder: 'asc' } },
    })
  }

  private async findOwnedApartmentUnits (tenantId: string, condominiumId: string) {
    return this.prisma.unit.findMany({
      where: this.ownedApartmentUnitsWhere(tenantId, condominiumId),
      orderBy: { code: 'asc' },
      include: {
        ownerships: {
          where: { deletedAt: null, isPrimary: true },
          include: { owner: true },
        },
      },
    })
  }

  private async findVacantApartmentUnits (tenantId: string, condominiumId: string) {
    return this.prisma.unit.findMany({
      where: {
        tenantId,
        condominiumId,
        deletedAt: null,
        type: 'APARTMENT',
        NOT: {
          ownerships: {
            some: { deletedAt: null, isPrimary: true },
          },
        },
      },
    })
  }

  private ownedApartmentUnitsWhere (tenantId: string, condominiumId: string) {
    return {
      tenantId,
      condominiumId,
      deletedAt: null,
      type: 'APARTMENT' as const,
      ownerships: {
        some: { deletedAt: null, isPrimary: true },
      },
    }
  }

  private async ensureLinesForUnits (
    tenantId: string,
    billingSheetId: string,
    concepts: Array<{ id: string }>,
    units: Array<{ id: string }>,
  ) {
    for (const unit of units) {
      for (const concept of concepts) {
        await this.prisma.chargeLine.upsert({
          where: {
            billingSheetId_chargeConceptId_unitId: {
              billingSheetId,
              chargeConceptId: concept.id,
              unitId: unit.id,
            },
          },
          update: {},
          create: {
            tenantId,
            billingSheetId,
            chargeConceptId: concept.id,
            unitId: unit.id,
            amount: 0,
          },
        })
      }
    }
  }

  private async assertSheet (tenantId: string, sheetId: string) {
    const sheet = await this.prisma.billingSheet.findFirst({
      where: { id: sheetId, tenantId },
    })
    if (!sheet) throw new NotFoundException('Cuadro de cobros no encontrado')
    return sheet
  }

  private parseFixedPools (value: Prisma.JsonValue): Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = Number(v) || 0
    }
    return out
  }

  private round2 (n: number) {
    return Math.round(n * 100) / 100
  }

  private formatPeriodLabel (period: string) {
    const [y, m] = period.split('-')
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    const idx = parseInt(m, 10) - 1
    return `${months[idx] ?? m} ${y.slice(2)}`
  }

  private defaultDueDate (period: string) {
    const [y, m] = period.split('-').map(Number)
    return new Date(y, m, 5)
  }
}
