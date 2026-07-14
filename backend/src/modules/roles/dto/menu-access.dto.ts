import { ArrayNotEmpty, IsArray, IsString } from 'class-validator'

export class UpdateMenuAccessDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  menuKeys: string[]
}
