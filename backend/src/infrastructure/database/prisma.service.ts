import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { PrismaClient } from '../../../generated/prisma'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool

  constructor (private readonly config: ConfigService) {
    const connectionString = config.get<string>('database.url')
    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    super({ adapter })
    this.pool = pool
  }

  async onModuleInit () {
    await this.$connect()
  }

  async onModuleDestroy () {
    await this.$disconnect()
    await this.pool.end()
  }

  /** Excluye registros con soft delete */
  withoutDeleted<T extends { deletedAt?: Date | null }> (where: T = {} as T) {
    return { ...where, deletedAt: null }
  }
}
