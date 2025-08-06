import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback } from '../../public/feedback/schemas/feedback.schema';
import { FeedbackStatus } from '../../public/feedback/feedback-status.enum';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<Feedback>,
  ) {}

  async updateStatus(id: string, status: FeedbackStatus): Promise<Feedback> {
    return this.feedbackModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  async cancel(id: string): Promise<Feedback> {
    return this.updateStatus(id, FeedbackStatus.CANCEL);
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Record<string, any> = {},
  ): Promise<{ data: Feedback[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const query = this.feedbackModel.find(filters).skip(skip).limit(limit);
    const [data, total] = await Promise.all([
      query.exec(),
      this.feedbackModel.countDocuments(filters).exec(),
    ]);
    return { data, total, page, limit };
  }
}
