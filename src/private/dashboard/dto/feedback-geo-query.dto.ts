import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { FeedbackType } from '../../../modules/feedback/feedback-type.enum';
import { FeedbackStatus } from '../../../modules/feedback/feedback-status.enum';

export class FeedbackGeoQueryDto {
  @ApiPropertyOptional({ enum: FeedbackType, description: 'Tipo de feedback' })
  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;

  @ApiPropertyOptional({
    enum: FeedbackStatus,
    description: 'Estado del feedback',
  })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;
}
