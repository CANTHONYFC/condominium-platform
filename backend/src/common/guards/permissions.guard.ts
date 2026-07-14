import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { PERMISSIONS_KEY } from '../decorators/auth.decorator'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor (private reflector: Reflector) {}

  canActivate (context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required?.length) return true

    const { user } = context.switchToHttp().getRequest()
    const userPermissions: string[] = user?.permissions ?? []
    const hasPermission = required.every((p) => userPermissions.includes(p))

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return true
  }
}
