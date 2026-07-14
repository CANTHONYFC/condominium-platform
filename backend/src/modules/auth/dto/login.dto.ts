import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'admin@empresa.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string

  @ApiPropertyOptional({ description: 'Empresa a ingresar cuando el usuario tiene varias cuentas' })
  @IsOptional()
  @IsUUID()
  tenantId?: string
}

export class SwitchTenantDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  tenantId: string
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string
}
