import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ViewFeedbackDto {
  @ApiProperty()
  @IsString()
  caseNumber: string;
}
