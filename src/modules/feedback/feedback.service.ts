import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackResponseDto } from './dto/feedback-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Feedback } from './schemas/feedback.schema';
import { Model } from 'mongoose';

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

  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<Feedback>,
  ) {}

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

    const feedbackModel = new this.feedbackModel({
      ...dto,
      caseNumber: this.makeCaseNumber(),
      attachment: attachment
        ? {
            url: attachment.url,
            mimeType: attachment.mimeType,
            size: attachment.size,
            originalName: attachment.originalName,
          }
        : null,
    });

    void feedbackModel.save();
    return feedback;
  }

  private makeCaseNumber(): string {
    const y = new Date().getFullYear().toString().slice(-2);
    const m = String(new Date().getMonth() + 1).padStart(2, '0');
    const d = String(new Date().getDate()).padStart(2, '0');
    const n = ((Math.random() * 1e6) | 0).toString().padStart(6, '0');
    return `FB-${y}${m}${d}-${n}`;
  }

  async feedbackByCode(caseNumber: string): Promise<Feedback> {
    const feedbackByCode = await this.feedbackModel
      .findOne({ caseNumber: caseNumber })
      .exec();

    if (!feedbackByCode) {
      throw new NotFoundException(`Feedback with ID ${caseNumber} not found`);
    }
    return feedbackByCode;
  }
}
