import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

export const PERMISSIONS_KEY = 'permissions'
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.user?.tenantId
  },
)

export interface JwtPayload {
  sub: string
  email: string
  tenantId: string
  permissions: string[]
}

export interface AuthenticatedUser extends JwtPayload {
  id: string
}
