import { Injectable } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'

@Injectable()
export class VehiclesService {
  constructor (private readonly prisma: PrismaService) {}

  async findAll (tenantId: string, query: PaginationQueryDto) {
    const { page, limit } = getPaginationParams(query)
    return buildPaginatedResult([], 0, page, limit)
  }
}
