import { IsBoolean, IsOptional } from 'class-validator'

export class SendStatementsDto {
  @IsOptional()
  @IsBoolean()
  onlyMorosity?: boolean
}
