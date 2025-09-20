import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback } from '../../modules/feedback/schemas/feedback.schema';
import { log } from 'console';

export interface DashboardSummaryResponseDto {
  totalFeedbacks: number;
  feedbacksByStatus: { _id: string; count: number }[];
  feedbacksByType: { _id: string; count: number }[];
  topCompanies: { _id: string; count: number }[];
  feedbacksLast7Days: { _id: string; count: number }[];
  resolutionRate: number;
  avgResolutionTime: number;
  averageFeedbacksPerUser: number;
  typeDistribution: { type: string; count: number; percentage: number }[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<Feedback>,
  ) {}

  async getSummary(): Promise<DashboardSummaryResponseDto> {
    const totalFeedbacks = await this.feedbackModel.countDocuments();

    const feedbacksByStatus = await this.feedbackModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const feedbacksByType = await this.feedbackModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const topCompanies = await this.feedbackModel.aggregate([
      { $match: { 'company.id': { $exists: true, $ne: null } } },
      { $group: { _id: '$company.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const feedbacksLast7Days = await this.feedbackModel.aggregate([
      { $match: { dateRegister: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateRegister' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 🚀 NUEVAS MÉTRICAS

    // 1. % de resolución
    const closedCount = await this.feedbackModel.countDocuments({ status: 'RESOLVED' });
    const resolutionRate = totalFeedbacks > 0 ? closedCount / totalFeedbacks : 0;

    // 2. Tiempo promedio de resolución (en días)
    const resolutionTimes = await this.feedbackModel.aggregate([
      { $match: { status: 'RESOLVED', dateClosed: { $exists: true } } },
      {
        $project: {
          diffDays: {
            $divide: [
              { $subtract: ['$dateClosed', '$dateRegister'] },
              1000 * 60 * 60 * 24, // ms → días
            ],
          },
        },
      },
      { $group: { _id: null, avgDays: { $avg: '$diffDays' } } },
    ]);
    const avgResolutionTime = resolutionTimes[0]?.avgDays || 0;

    // 3. Promedio de feedbacks por usuario (email)
    const avgFeedbacksPerUser = await this.feedbackModel.aggregate([
      { $group: { _id: '$email', count: { $sum: 1 } } },
      { $group: { _id: null, avg: { $avg: '$count' } } },
    ]);
    const averageFeedbacksPerUser = avgFeedbacksPerUser[0]?.avg || 0;

    // 4. Distribución porcentual de tipos
    const typeDistribution = feedbacksByType.map((t) => ({
      type: t._id,
      count: t.count,
      percentage: totalFeedbacks > 0 ? (t.count / totalFeedbacks) * 100 : 0,
    }));

    return {
      totalFeedbacks,
      feedbacksByStatus,
      feedbacksByType,
      topCompanies,
      feedbacksLast7Days,
      resolutionRate,
      avgResolutionTime,
      averageFeedbacksPerUser,
      typeDistribution,
    };
  }

  getFeedbacksGeo(): Promise<{ latitude: number; longitude: number }[]> {
    return this.feedbackModel.find(
      { latitude: { $exists: true }, longitude: { $exists: true } },
      { latitude: 1, longitude: 1, _id: 0 }
    ).exec();
  }
}