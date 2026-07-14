import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

import { PaginationQueryDto } from '../../../common/dto/pagination.dto'

export class ReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: 100, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  override limit?: number = 100

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  condominiumId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  commonAreaId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string
}
