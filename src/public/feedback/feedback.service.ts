import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './schemas/feedback.schema';
import { FeedbackType } from './feedback-type.enum';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<Feedback>,
  ) {}

  async create(data: CreateFeedbackDto): Promise<Feedback> {
    const caseNumber = await this.generateCaseNumber(data.type);
    const created = new this.feedbackModel({ ...data, caseNumber });
    return created.save();
  }

  private async generateCaseNumber(type: FeedbackType): Promise<string> {
    const count = await this.feedbackModel.countDocuments({ type }).exec();
    const next = (count + 1).toString().padStart(5, '0');
    const prefixMap: Record<FeedbackType, string> = {
      [FeedbackType.COMPLAINT]: 'COP',
      [FeedbackType.SUGGESTION]: 'SUG',
      [FeedbackType.COMPLIMENT]: 'COM',
    };
    return `${prefixMap[type]}-${next}`;
  }
}
