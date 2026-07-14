import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'

import { CurrentUser, Public, type JwtPayload } from '../../common/decorators/auth.decorator'
import { AuthService } from './auth.service'
import { LoginDto, RefreshTokenDto, SwitchTenantDto } from './dto/login.dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor (private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión (email y contraseña)' })
  login (@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, dto.tenantId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })
  }

  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar de empresa sin volver a ingresar credenciales' })
  switchTenant (
    @Body() dto: SwitchTenantDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.authService.switchTenant(user.email, dto.tenantId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })
  }

  @Get('me')
  @ApiOperation({ summary: 'Perfil y permisos de la sesión actual' })
  me (@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub, user.tenantId)
  }

  @Get('available-tenants')
  @ApiOperation({ summary: 'Empresas accesibles con el email de la sesión actual' })
  availableTenants (@CurrentUser() user: JwtPayload) {
    return this.authService.listAvailableTenants(user.email)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  refresh (@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout (@Body() dto: RefreshTokenDto, @Req() req: Request & { user: { sub: string } }) {
    await this.authService.logout(req.user.sub, dto.refreshToken)
  }
}
