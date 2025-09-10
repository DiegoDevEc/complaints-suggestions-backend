import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackResponseDto } from './dto/feedback-response.dto';

export interface AttachmentMeta {
  url: string;
  mimeType: string;
  size: number;
  originalName: string;
  filename: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly feedbacks: FeedbackResponseDto[] = [];

  createFeedback(
    dto: CreateFeedbackDto,
    attachment?: AttachmentMeta,
  ): FeedbackResponseDto {
    this.logger.log('Creating feedback');
    const feedback: FeedbackResponseDto = {
      id: randomUUID(),
      ...dto,
      attachment: attachment
        ? {
            url: attachment.url,
            mimeType: attachment.mimeType,
            size: attachment.size,
            originalName: attachment.originalName,
          }
        : null,
      createdAt: new Date().toISOString(),
    };
    this.feedbacks.push({ ...feedback });
    this.logger.log(`Feedback created: ${feedback.id}`);
    return feedback;
  }
}
