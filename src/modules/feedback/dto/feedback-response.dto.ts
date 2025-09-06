import { ApiProperty } from '@nestjs/swagger';
import { CreateFeedbackDto } from './create-feedback.dto';

export class AttachmentDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  originalName: string;
}

export class FeedbackResponseDto extends CreateFeedbackDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: () => AttachmentDto, nullable: true })
  attachment: AttachmentDto | null;

  @ApiProperty()
  createdAt: string;
}
