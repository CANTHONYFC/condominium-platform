import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable, tap } from 'rxjs'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { AuditAction } from '../../../generated/prisma'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor (private readonly prisma: PrismaService) {}

  intercept (context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const method = request.method
    const user = request.user
    const entity = request.route?.path?.split('/').filter(Boolean)[2]

    const actionMap: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    }

    const action = actionMap[method]
    if (!action || !user?.tenantId || !entity) {
      return next.handle()
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              userId: user.sub,
              entity,
              entityId: request.params?.id ?? responseBody?.data?.id ?? 'unknown',
              action,
              newValues: method !== 'DELETE' ? responseBody : undefined,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            },
          })
        } catch {
          // Audit must not break business flow
        }
      }),
    )
  }
}
