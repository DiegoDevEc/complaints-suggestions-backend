import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
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
}
