import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { ExportFormatEnum, ExportModuleEnum } from './dto/export.dto'

export interface ExportJobPayload {
  jobId: string
  tenantId: string
  module: ExportModuleEnum
  format: ExportFormatEnum
  filters?: Record<string, unknown>
}

@Injectable()
export class ExportGeneratorService {
  constructor (private readonly prisma: PrismaService) {}

  async generate (payload: ExportJobPayload): Promise<string> {
    const data = await this.fetchData(payload)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'exports')
    fs.mkdirSync(uploadsDir, { recursive: true })

    const ext = payload.format === ExportFormatEnum.EXCEL ? 'xlsx' : 'pdf'
    const filename = `${payload.module}-${payload.tenantId.slice(0, 8)}-${Date.now()}.${ext}`
    const filePath = path.join(uploadsDir, filename)

    if (payload.format === ExportFormatEnum.EXCEL) {
      await this.writeExcel(filePath, payload.module, data)
    } else {
      await this.writePdf(filePath, payload.module, data)
    }

    return `/uploads/exports/${filename}`
  }

  private async fetchData (payload: ExportJobPayload): Promise<Record<string, unknown>[]> {
    const { tenantId, module, filters = {} } = payload

    switch (module) {
      case ExportModuleEnum.OWNERS:
        return this.prisma.owner.findMany({
          where: { tenantId, deletedAt: null },
          select: {
            type: true,
            documentType: true,
            documentNumber: true,
            firstName: true,
            lastName: true,
            legalName: true,
            email: true,
            phone: true,
            status: true,
          },
        }) as Promise<Record<string, unknown>[]>

      case ExportModuleEnum.RESIDENTS:
        return this.prisma.resident.findMany({
          where: {
            tenantId,
            deletedAt: null,
            ...(filters.unitId ? { unitId: filters.unitId as string } : {}),
          },
          include: { unit: { select: { code: true } } },
        }) as unknown as Promise<Record<string, unknown>[]>

      case ExportModuleEnum.UNITS:
        return this.prisma.unit.findMany({
          where: {
            tenantId,
            deletedAt: null,
            ...(filters.condominiumId
              ? { condominiumId: filters.condominiumId as string }
              : {}),
          },
          select: {
            code: true,
            type: true,
            area: true,
            occupancyStatus: true,
            maintenanceFee: true,
          },
        }) as Promise<Record<string, unknown>[]>

      case ExportModuleEnum.MAINTENANCE_FEES:
        return this.prisma.maintenanceFee.findMany({
          where: {
            tenantId,
            deletedAt: null,
            ...(filters.condominiumId
              ? { condominiumId: filters.condominiumId as string }
              : {}),
          },
          include: { unit: { select: { code: true } } },
        }) as unknown as Promise<Record<string, unknown>[]>

      case ExportModuleEnum.PAYMENTS:
        return this.prisma.payment.findMany({
          where: { tenantId, deletedAt: null },
          include: {
            maintenanceFee: { include: { unit: { select: { code: true } } } },
          },
        }) as unknown as Promise<Record<string, unknown>[]>

      case ExportModuleEnum.MOROSITY: {
        const fees = await this.prisma.maintenanceFee.findMany({
          where: {
            tenantId,
            deletedAt: null,
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            ...(filters.condominiumId
              ? { condominiumId: filters.condominiumId as string }
              : {}),
          },
          include: { unit: { select: { code: true } } },
        })
        return fees.map((f) => ({
          unitCode: f.unit.code,
          period: f.period,
          amount: Number(f.amount),
          paid: Number(f.paidAmount),
          balance: Number(f.amount) - Number(f.paidAmount),
          status: f.status,
          dueDate: f.dueDate,
        })) as Record<string, unknown>[]
      }

      default:
        return []
    }
  }

  private async writeExcel (
    filePath: string,
    module: ExportModuleEnum,
    rows: Record<string, unknown>[],
  ) {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(module)
    if (!rows.length) {
      sheet.addRow(['Sin datos'])
      await workbook.xlsx.writeFile(filePath)
      return
    }

    const flatRows = rows.map((r) => this.flattenRow(r))
    const headers = [...new Set(flatRows.flatMap((r) => Object.keys(r)))]
    sheet.addRow(headers)
    for (const row of flatRows) {
      sheet.addRow(headers.map((h) => row[h] ?? ''))
    }
    sheet.getRow(1).font = { bold: true }
    await workbook.xlsx.writeFile(filePath)
  }

  private async writePdf (
    filePath: string,
    module: ExportModuleEnum,
    rows: Record<string, unknown>[],
  ) {
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' })
      const stream = fs.createWriteStream(filePath)
      doc.pipe(stream)

      doc.fontSize(16).text(`Reporte: ${module}`, { align: 'center' })
      doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-PE')}`)
      doc.moveDown()

      if (!rows.length) {
        doc.text('Sin datos')
      } else {
        const flatRows = rows.map((r) => this.flattenRow(r))
        for (const row of flatRows.slice(0, 200)) {
          const line = Object.entries(row)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')
          doc.fontSize(8).text(line)
          doc.moveDown(0.3)
        }
        if (rows.length > 200) {
          doc.text(`... y ${rows.length - 200} registros más`)
        }
      }

      doc.end()
      stream.on('finish', () => resolve())
      stream.on('error', reject)
    })
  }

  private flattenRow (row: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        Object.assign(result, this.flattenRow(value as Record<string, unknown>, fullKey))
      } else if (value instanceof Date) {
        result[fullKey] = value.toISOString().split('T')[0]
      } else {
        result[fullKey] = value
      }
    }
    return result
  }
}
