import type { PrismaService } from '../../infrastructure/database/prisma.service'

type CorrelativeScope =
  | { entity: 'condominium'; tenantId: string; prefix: 'COND' }
  | { entity: 'tower'; condominiumId: string; prefix: 'TOR' }
  | { entity: 'block'; condominiumId: string; prefix: 'BLQ' }
  | { entity: 'unit'; condominiumId: string; prefix: 'UND' }
  | { entity: 'commonArea'; condominiumId: string; prefix: 'ZON' }

export async function nextCorrelativeCode (
  prisma: PrismaService,
  scope: CorrelativeScope,
  padding = 3,
): Promise<string> {
  const codes = await loadCodes(prisma, scope)
  const re = new RegExp(`^${scope.prefix}-(\\d+)$`, 'i')

  const max = codes.reduce((highest, code) => {
    const match = code.match(re)
    if (!match) return highest
    return Math.max(highest, parseInt(match[1], 10))
  }, 0)

  const next = max > 0 ? max + 1 : codes.length + 1
  return `${scope.prefix}-${String(next).padStart(padding, '0')}`
}

async function loadCodes (prisma: PrismaService, scope: CorrelativeScope): Promise<string[]> {
  switch (scope.entity) {
    case 'condominium':
      return (await prisma.condominium.findMany({
        where: { tenantId: scope.tenantId },
        select: { code: true },
      })).map((row) => row.code)
    case 'tower':
      return (await prisma.tower.findMany({
        where: { condominiumId: scope.condominiumId },
        select: { code: true },
      })).map((row) => row.code)
    case 'block':
      return (await prisma.block.findMany({
        where: { condominiumId: scope.condominiumId },
        select: { code: true },
      })).map((row) => row.code)
    case 'unit':
      return (await prisma.unit.findMany({
        where: { condominiumId: scope.condominiumId },
        select: { code: true },
      })).map((row) => row.code)
    case 'commonArea':
      return (await prisma.commonArea.findMany({
        where: { condominiumId: scope.condominiumId },
        select: { code: true },
      })).map((row) => row.code)
  }
}

export const DEFAULT_UNIT_CODE_PREFIX = 'D'

export function normalizeUnitCodePrefix (prefix?: string): string {
  const p = (prefix ?? DEFAULT_UNIT_CODE_PREFIX).trim().toUpperCase()
  return /^[A-Z]{1,4}$/.test(p) ? p : DEFAULT_UNIT_CODE_PREFIX
}

export function formatDepartmentCode (sequence: number, prefix = DEFAULT_UNIT_CODE_PREFIX): string {
  return `${normalizeUnitCodePrefix(prefix)}-${String(sequence).padStart(3, '0')}`
}

function departmentCodeRegex (prefix: string): RegExp {
  return new RegExp(`^${normalizeUnitCodePrefix(prefix)}-(\\d+)$`, 'i')
}

export async function nextDepartmentCounter (
  prisma: Pick<PrismaService, 'unit'>,
  condominiumId: string,
  prefix = DEFAULT_UNIT_CODE_PREFIX,
): Promise<number> {
  const normalized = normalizeUnitCodePrefix(prefix)
  const units = await prisma.unit.findMany({
    where: { condominiumId },
    select: { code: true },
  })
  const re = departmentCodeRegex(normalized)
  const max = units.reduce((highest, unit) => {
    const match = unit.code.match(re)
    if (!match) return highest
    return Math.max(highest, parseInt(match[1], 10))
  }, 0)
  return max + 1
}

export async function nextDepartmentCode (
  prisma: PrismaService,
  condominiumId: string,
  prefix = DEFAULT_UNIT_CODE_PREFIX,
): Promise<string> {
  const next = await nextDepartmentCounter(prisma, condominiumId, prefix)
  return formatDepartmentCode(next, prefix)
}
