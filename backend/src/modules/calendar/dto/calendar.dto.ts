import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { MaintenanceStatus } from '../../../../generated/prisma'
import { PaginationQueryDto } from '../../../common/dto/pagination.dto'

export class CalendarEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: 100, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  override limit?: number = 100

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  condominiumId?: string

  @ApiPropertyOptional({ example: 'MAINTENANCE' })
  @IsOptional()
  @IsString()
  type?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string
}

export class CreateCalendarEventDto {
  @IsString()
  condominiumId: string

  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsString()
  startAt: string

  @IsString()
  endAt: string

  @IsOptional()
  @IsBoolean()
  allDay?: boolean

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsString()
  vendor?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsOptional()
  @IsString()
  attachmentUrl?: string

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus

  @IsOptional()
  @IsString()
  commonAreaId?: string | null
}

export class UpdateCalendarEventDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  startAt?: string

  @IsOptional()
  @IsString()
  endAt?: string

  @IsOptional()
  @IsBoolean()
  allDay?: boolean

  @IsOptional()
  @IsString()
  vendor?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsOptional()
  @IsString()
  attachmentUrl?: string

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus

  @IsOptional()
  @IsString()
  commonAreaId?: string | null
}
