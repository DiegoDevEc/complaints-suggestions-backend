import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback } from '../../public/feedback/schemas/feedback.schema';
import { FeedbackStatus } from '../../public/feedback/feedback-status.enum';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<Feedback>,
  ) { }

  async updateStatus(id: string, status: FeedbackStatus): Promise<Feedback> {
    const updated = await this.feedbackModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    return updated;
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

    // Construir filtros dinámicos con expresiones regulares (búsqueda parcial)
    const mongoFilters: Record<string, any> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'string') {
        mongoFilters[key] = { $regex: value, $options: 'i' }; // Insensible a mayúsculas
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
