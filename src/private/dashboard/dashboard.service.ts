import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Feedback } from '../../modules/feedback/schemas/feedback.schema';
import { JwtUserPayload } from '../../auth/interfaces/jwt-user-payload.interface';
import { Role } from '../../users/role.enum';
import { Company } from '../../modules/company/schemas/company.schema';
import { PersonalData } from '../../users/personal-data.schema';
import { FeedbackGeoQueryDto } from './dto/feedback-geo-query.dto';

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

interface CountAggregationResult {
  _id: string;
  count: number;
}

interface AvgAggregationResult {
  _id: null;
  avg: number;
}

interface ResolutionAggregationResult {
  _id: null;
  avgDays: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<Feedback>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(PersonalData.name)
    private readonly personalDataModel: Model<PersonalData>,
  ) {}

  async getSummary(user: JwtUserPayload): Promise<DashboardSummaryResponseDto> {
    const companyMatch = await this.buildCompanyMatch(user);

    if (companyMatch === null) {
      return this.buildEmptySummary();
    }

    const baseMatch = { ...companyMatch };
    const matchStages: PipelineStage.Match[] = Object.keys(baseMatch).length
      ? [{ $match: baseMatch }]
      : [];

    const totalFeedbacks = await this.feedbackModel.countDocuments(baseMatch);

    const feedbacksByStatus =
      await this.feedbackModel.aggregate<CountAggregationResult>([
        ...matchStages,
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

    const feedbacksByType =
      await this.feedbackModel.aggregate<CountAggregationResult>([
        ...matchStages,
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]);

    const topCompanies =
      await this.feedbackModel.aggregate<CountAggregationResult>([
        ...matchStages,
        { $match: { 'company.id': { $exists: true, $ne: null } } },
        { $group: { _id: '$company.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const feedbacksLast7Days =
      await this.feedbackModel.aggregate<CountAggregationResult>([
        ...matchStages,
        { $match: { dateRegister: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$dateRegister' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

    const closedCount = await this.feedbackModel.countDocuments({
      ...baseMatch,
      status: 'RESOLVED',
    });
    const resolutionRate =
      totalFeedbacks > 0 ? closedCount / totalFeedbacks : 0;

    const resolutionTimes =
      await this.feedbackModel.aggregate<ResolutionAggregationResult>([
        ...matchStages,
        { $match: { status: 'RESOLVED', dateClosed: { $exists: true } } },
        {
          $project: {
            diffDays: {
              $divide: [
                { $subtract: ['$dateClosed', '$dateRegister'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        { $group: { _id: null, avgDays: { $avg: '$diffDays' } } },
      ]);
    const avgResolutionTime = resolutionTimes[0]?.avgDays || 0;

    const avgFeedbacksPerUser =
      await this.feedbackModel.aggregate<AvgAggregationResult>([
        ...matchStages,
        { $group: { _id: '$email', count: { $sum: 1 } } },
        { $group: { _id: null, avg: { $avg: '$count' } } },
      ]);
    const averageFeedbacksPerUser = avgFeedbacksPerUser[0]?.avg || 0;

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

  async getFeedbacksGeo(
    user: JwtUserPayload,
    filters?: FeedbackGeoQueryDto,
  ): Promise<{ latitude: number; longitude: number }[]> {
    const companyMatch = await this.buildCompanyMatch(user);

    if (companyMatch === null) {
      return [];
    }

    const query: Record<string, unknown> = {
      ...companyMatch,
      latitude: { $exists: true },
      longitude: { $exists: true },
    };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    return this.feedbackModel
      .find(query, { latitude: 1, longitude: 1, _id: 0 })
      .exec();
  }

  private async buildCompanyMatch(
    user: JwtUserPayload,
  ): Promise<Record<string, unknown> | null> {
    if (!user || user.role === Role.ADMIN) {
      return {};
    }

    const companyIds = await this.getCompanyIdsForUser(user.userId);

    if (companyIds.length === 0) {
      return null;
    }

    return { 'company.id': { $in: companyIds } };
  }

  private async getCompanyIdsForUser(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    const personalData = await this.personalDataModel
      .findOne({ user: new Types.ObjectId(userId) })
      .select('_id')
      .exec();

    if (!personalData?._id) {
      return [];
    }

    const companies = await this.companyModel
      .find({ contacts: personalData._id })
      .select('_id')
      .exec();

    const uniqueIds = new Set(
      companies
        .map((company) => {
          const idValue = company?._id as Types.ObjectId | string | undefined;
          if (!idValue) {
            return null;
          }
          return typeof idValue === 'string' ? idValue : idValue.toHexString();
        })
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );

    return Array.from(uniqueIds);
  }

  private buildEmptySummary(): DashboardSummaryResponseDto {
    return {
      totalFeedbacks: 0,
      feedbacksByStatus: [],
      feedbacksByType: [],
      topCompanies: [],
      feedbacksLast7Days: [],
      resolutionRate: 0,
      avgResolutionTime: 0,
      averageFeedbacksPerUser: 0,
      typeDistribution: [],
    };
  }
}
