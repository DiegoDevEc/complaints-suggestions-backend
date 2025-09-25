import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['ACT', 'INA', 'BLO'], default: 'ACT' })
  @IsOptional()
  @IsIn(['ACT', 'INA', 'BLO'])
  status?: 'ACT' | 'INA' | 'BLO';

  @ApiProperty({ type: [String], required: false, default: [] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  permissions?: string[];
}
