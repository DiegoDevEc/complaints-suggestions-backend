import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus } from '../../../modules/feedback/feedback-status.enum';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FeedbacksByCompanyQueryDto {
  @ApiPropertyOptional({ description: 'Fecha inicial para filtrar el registro', type: String, format: 'date-time' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha final para filtrar el registro', type: String, format: 'date-time' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ enum: FeedbackStatus, description: 'Estado del feedback a filtrar' })
  @IsOptional()
  @IsEnum(FeedbackStatus, { message: 'status debe ser un FeedbackStatus válido' })
  status?: FeedbackStatus;
}
