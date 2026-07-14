import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator'

import { UserStatus } from '../../../../generated/prisma'

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty()
  @IsString()
  firstName: string

  @ApiProperty()
  @IsString()
  lastName: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({ description: 'Código de rol: ADMIN, ADMINISTRADOR, RESIDENTE, etc.' })
  @IsString()
  roleCode: string

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string
}

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  code: string

  @ApiProperty()
  @IsString()
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[]
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[]
}

export class AssignUserRoleDto {
  @ApiProperty()
  @IsUUID()
  roleId: string
}
