import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import type { JwtPayload } from '../../common/decorators/auth.decorator'
import { resolveUserMenuAccess } from '../../common/constants/menu-access'
import { PortalContextService } from '../../common/services/portal-context.service'

type UserWithRoles = {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    tenantId: string
    passwordHash: string
    tenant: {
      id: string
      code: string
      name: string
      organizationType: string
    }
    userRoles: {
      role: {
        code: string
        menuAccess: unknown
        rolePermissions: { permission: { code: string } }[]
      }
    }[]
  }
  permissions: string[]
  menuAccess: string[]
  roleCodes: string[]
  roleNames: string[]
}

export interface TenantOption {
  tenantId: string
  tenantCode: string
  tenantName: string
  organizationType: string
  userId: string
}

export interface LoginResult {
  requiresTenantSelection?: boolean
  tenants?: TenantOption[]
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
    tenantId: string
    permissions: string[]
    menuAccess: string[]
    roleCodes: string[]
    roleNames: string[]
    tenant: {
      id: string
      code: string
      name: string
      organizationType: string
    }
  }
  availableTenants?: TenantOption[]
  accessToken?: string
  refreshToken?: string
}

@Injectable()
export class AuthService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly portalContext: PortalContextService,
  ) {}

  async login (email: string, password: string, tenantId: string | undefined, meta: LoginMeta): Promise<LoginResult> {
    const matches = await this.findMatchingAccounts(email, password)

    if (matches.length === 0) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!tenantId) {
      if (matches.length === 1) {
        return this.completeLogin(matches[0], matches, meta)
      }

      return {
        requiresTenantSelection: true,
        tenants: matches.map((m) => this.toTenantOption(m)),
      }
    }

    const selected = matches.find((m) => m.user.tenantId === tenantId)
    if (!selected) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return this.completeLogin(selected, matches, meta)
  }

  async switchTenant (email: string, tenantId: string, meta: LoginMeta): Promise<LoginResult> {
    const user = await this.loadUserWithPermissions({
      email,
      tenantId,
      deletedAt: null,
      status: 'ACTIVE',
    })

    if (!user) {
      throw new ForbiddenException('No tienes acceso a esta empresa')
    }

    const matches = await this.findActiveAccountsByEmail(email)
    const match = matches.find((m) => m.user.tenantId === tenantId)
    if (!match) {
      throw new ForbiddenException('No tienes acceso a esta empresa')
    }

    return this.completeLogin(match, matches, meta)
  }

  async listAvailableTenants (email: string): Promise<TenantOption[]> {
    const matches = await this.findActiveAccountsByEmail(email)
    return matches.map((m) => this.toTenantOption(m))
  }

  async getProfile (userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null, status: 'ACTIVE' },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })
    if (!user) throw new ForbiddenException('User not found')

    let portal = null
    const isPortalRole = user.userRoles.some((ur) =>
      ['PROPIETARIO', 'RESIDENTE'].includes(ur.role.code),
    )
    if (isPortalRole) {
      try {
        portal = await this.portalContext.resolve(userId, tenantId)
      } catch {
        portal = null
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      permissions: this.extractPermissions(user),
      menuAccess: this.extractMenuAccess(user),
      roleCodes: this.extractRoleCodes(user),
      roleNames: this.extractRoleNames(user),
      portal,
      tenant: {
        id: user.tenant.id,
        code: user.tenant.code,
        name: user.tenant.name,
        organizationType: user.tenant.organizationType,
      },
    }
  }

  private async findMatchingAccounts (email: string, password: string) {
    const candidates = await this.findActiveAccountsByEmail(email)
    const matches: UserWithRoles[] = []

    for (const candidate of candidates) {
      const valid = await bcrypt.compare(password, candidate.user.passwordHash)
      if (valid) matches.push(candidate)
    }

    return matches
  }

  private async findActiveAccountsByEmail (email: string) {
    const users = await this.prisma.user.findMany({
      where: {
        email,
        deletedAt: null,
        status: 'ACTIVE',
        tenant: { deletedAt: null, isActive: true },
      },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })

    return users.map((user) => ({
      user,
      permissions: this.extractPermissions(user),
      menuAccess: this.extractMenuAccess(user),
      roleCodes: this.extractRoleCodes(user),
      roleNames: this.extractRoleNames(user),
    }))
  }

  private async loadUserWithPermissions (where: {
    email: string
    tenantId: string
    deletedAt: null
    status: 'ACTIVE'
  }) {
    const user = await this.prisma.user.findFirst({
      where: {
        ...where,
        tenant: { deletedAt: null, isActive: true },
      },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })

    if (!user) return null

    return {
      user,
      permissions: this.extractPermissions(user),
      menuAccess: this.extractMenuAccess(user),
      roleCodes: this.extractRoleCodes(user),
      roleNames: this.extractRoleNames(user),
    }
  }

  private extractRoleCodes (user: {
    userRoles: { role: { code: string } }[]
  }) {
    return user.userRoles.map((ur) => ur.role.code)
  }

  private extractRoleNames (user: {
    userRoles: { role: { name: string } }[]
  }) {
    return user.userRoles.map((ur) => ur.role.name)
  }

  private extractMenuAccess (user: {
    userRoles: { role: { code: string; menuAccess: unknown } }[]
  }) {
    return resolveUserMenuAccess(
      user.userRoles.map((ur) => ({
        code: ur.role.code,
        menuAccess: ur.role.menuAccess,
      })),
    )
  }

  private extractPermissions (user: {
    userRoles: { role: { rolePermissions: { permission: { code: string } }[] } }[]
  }) {
    return [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ] as string[]
  }

  private toTenantOption (match: UserWithRoles): TenantOption {
    return {
      tenantId: match.user.tenantId,
      tenantCode: match.user.tenant.code,
      tenantName: match.user.tenant.name,
      organizationType: match.user.tenant.organizationType,
      userId: match.user.id,
    }
  }

  private async completeLogin (
    selected: UserWithRoles,
    allMatches: UserWithRoles[],
    meta: LoginMeta,
  ): Promise<LoginResult> {
    const { user, permissions, menuAccess, roleCodes, roleNames } = selected

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      permissions,
    }

    const tokens = await this.generateTokens(payload)
    await this.createSession(user.id, tokens.refreshToken, meta)

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    await this.prisma.accessLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        success: true,
      },
    })

    const availableTenants = allMatches.map((m) => this.toTenantOption(m))

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        permissions,
        menuAccess,
        roleCodes,
        roleNames,
        tenant: {
          id: user.tenant.id,
          code: user.tenant.code,
          name: user.tenant.name,
          organizationType: user.tenant.organizationType,
        },
      },
      availableTenants,
      ...tokens,
    }
  }

  async refresh (refreshToken: string, meta: LoginMeta) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    const user = session.user
    if (user.deletedAt || user.status !== 'ACTIVE') {
      throw new ForbiddenException('User inactive')
    }

    const permissions = this.extractPermissions(user)

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      permissions,
    }

    const tokens = await this.generateTokens(payload)

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    })

    await this.createSession(user.id, tokens.refreshToken, meta)

    return tokens
  }

  async logout (userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.userSession.updateMany({
        where: { userId, refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    } else {
      await this.prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }

    await this.prisma.accessLog.create({
      data: { userId, action: 'LOGOUT', success: true },
    })
  }

  private async generateTokens (payload: JwtPayload) {
    const accessExpires = this.config.get<string>('jwt.accessExpiresIn') ?? '15m'
    const refreshExpires = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d'

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload },
        {
          secret: this.config.getOrThrow<string>('jwt.accessSecret'),
          expiresIn: accessExpires as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      ),
      this.jwtService.signAsync(
        { ...payload },
        {
          secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
          expiresIn: refreshExpires as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      ),
    ])

    return { accessToken, refreshToken }
  }

  private async createSession (
    userId: string,
    refreshToken: string,
    meta: LoginMeta,
  ) {
    const expiresIn = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d'
    const days = parseInt(expiresIn.replace('d', ''), 10) || 7
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    await this.prisma.userSession.create({
      data: {
        userId,
        refreshToken,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt,
      },
    })
  }
}

export interface LoginMeta {
  ipAddress?: string
  userAgent?: string
}
