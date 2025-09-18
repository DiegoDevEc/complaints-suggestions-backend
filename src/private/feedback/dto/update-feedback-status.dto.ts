import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FeedbackStatus } from '../../../modules/feedback/feedback-status.enum';

export class UpdateFeedbackStatusDto {
  @ApiProperty({ enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;

  @ApiPropertyOptional({
    description: 'Optional note describing the status change',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
