import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty({ type: [String], required: false, default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
