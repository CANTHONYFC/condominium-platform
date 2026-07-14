import { Prisma, PrismaClient } from '../../../generated/prisma'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import {
  buildPaginatedResult,
  getPaginationParams,
  PaginatedResult,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto'

type PrismaDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>
  findFirst: (args?: unknown) => Promise<unknown>
  count: (args?: unknown) => Promise<number>
  create: (args: unknown) => Promise<unknown>
  update: (args: unknown) => Promise<unknown>
}

export abstract class BaseRepository {
  constructor (protected readonly prisma: PrismaService) {}

  protected getDelegate (model: Uncapitalize<Prisma.ModelName>): PrismaDelegate {
    return (this.prisma as PrismaClient)[model] as unknown as PrismaDelegate
  }

  async findPaginated<T>(
    model: Uncapitalize<Prisma.ModelName>,
    tenantId: string,
    query: PaginationQueryDto,
    extraWhere: Record<string, unknown> = {},
  ): Promise<PaginatedResult<T>> {
    const delegate = this.getDelegate(model)
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      deletedAt: null,
      ...extraWhere,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const orderBy = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'desc' }
      : { createdAt: 'desc' as const }

    const [data, total] = await Promise.all([
      delegate.findMany({ where, skip, take: limit, orderBy }) as Promise<T[]>,
      delegate.count({ where }),
    ])

    return buildPaginatedResult(data, total, page, limit)
  }

  async softDelete (model: Uncapitalize<Prisma.ModelName>, tenantId: string, id: string) {
    const delegate = this.getDelegate(model)
    return delegate.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    })
  }
}
