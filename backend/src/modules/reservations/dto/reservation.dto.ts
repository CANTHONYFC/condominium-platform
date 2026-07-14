import { IsEnum, IsOptional, IsString } from 'class-validator'

import { ReservationStatus } from '../../../../generated/prisma'

export class CreateReservationDto {
  @IsString()
  condominiumId: string

  @IsString()
  commonAreaId: string

  @IsOptional()
  @IsString()
  unitId?: string

  @IsOptional()
  @IsString()
  residentId?: string

  @IsString()
  startAt: string

  @IsString()
  endAt: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateReservationDto {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus

  @IsOptional()
  @IsString()
  startAt?: string

  @IsOptional()
  @IsString()
  endAt?: string

  @IsOptional()
  @IsString()
  notes?: string
}
