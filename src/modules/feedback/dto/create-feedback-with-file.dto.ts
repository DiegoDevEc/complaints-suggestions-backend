import { ApiProperty } from '@nestjs/swagger';
import { CreateFeedbackDto } from './create-feedback.dto';

export class CreateFeedbackWithFileDto extends CreateFeedbackDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    nullable: true,
  })
  attachment?: unknown;
}
