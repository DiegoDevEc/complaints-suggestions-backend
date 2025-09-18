import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback } from '../../modules/feedback/schemas/feedback.schema';
import type { FeedbackStatusHistoryEntry } from '../../modules/feedback/schemas/feedback.schema';
import { FeedbackStatus } from '../../modules/feedback/feedback-status.enum';
import { JwtUserPayload } from '../../auth/interfaces/jwt-user-payload.interface';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<Feedback>,
  ) {}

  async updateStatus(
    id: string,
    status: FeedbackStatus,
    user: JwtUserPayload,
    note?: string,
  ): Promise<Feedback> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    feedback.status = status;

    if (!feedback.statusHistory) {
      feedback.statusHistory = [];
    }
    const historyEntry: FeedbackStatusHistoryEntry = {
      status,
      changedAt: new Date(),
      changedBy: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        lastname: user.lastname,
        phone: user.phone,
      },
    };

    if (note !== undefined) {
      historyEntry.note = note;
    }
    feedback.statusHistory.push(historyEntry);
    await feedback.save();

    return feedback;
  }

  async cancel(id: string, user: JwtUserPayload): Promise<Feedback> {
    return this.updateStatus(id, FeedbackStatus.CANCEL, user);
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Record<string, unknown> = {},
  ): Promise<{ data: Feedback[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const mongoFilters: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'string') {
        mongoFilters[key] = { $regex: value, $options: 'i' };
      } else {
        mongoFilters[key] = value;
      }
    }

    const query = this.feedbackModel.find(mongoFilters).skip(skip).limit(limit);

    const [data, total] = await Promise.all([
      query.exec(),
      this.feedbackModel.countDocuments(mongoFilters).exec(),
    ]);

    return { data, total, page, limit };
  }
}
