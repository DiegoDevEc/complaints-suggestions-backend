import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback } from '../../modules/feedback/schemas/feedback.schema';
import type { FeedbackStatusHistoryEntry } from '../../modules/feedback/schemas/feedback.schema';
import { FeedbackStatus } from '../../modules/feedback/feedback-status.enum';
import { JwtUserPayload } from '../../auth/interfaces/jwt-user-payload.interface';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { FeedbackCompanyRequestDto } from './dto/feedback-company-request.dto';
import { Company } from '../../modules/company/schemas/company.schema';
import { PersonalData } from '../../users/personal-data.schema';
import { Role } from '../../users/role.enum';
import { log } from 'console';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class FeedbackService {
  private readonly urlN8n =
    'https://n8n.srv863641.hstgr.cloud/webhook/update-status';
  private readonly urlN8nCompany =
    'https://n8n.srv863641.hstgr.cloud/webhook/074c7af3-43ed-48e8-9e12-0e989e6d14b0';
  constructor(
    @InjectModel(Feedback.name) private readonly feedbackModel: Model<Feedback>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
    @InjectModel(PersonalData.name)
    private readonly personalDataModel: Model<PersonalData>,
    private readonly gateway: NotificationsGateway,
    private readonly httpService: HttpService,
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
    if (status === FeedbackStatus.RESOLVED) {
      feedback.dateClosed = new Date();
    }
    await feedback.save();
    this.gateway.sendNotification('statusUpdated', feedback);
    log('Feedback status updated:', feedback);
    await this.sendFeedbackSheet(feedback);

    return feedback;
  }

  async cancel(id: string, user: JwtUserPayload): Promise<Feedback> {
    return this.updateStatus(id, FeedbackStatus.CANCEL, user);
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Record<string, unknown> = {},
    user: JwtUserPayload,
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

    if (user.role !== Role.ADMIN) {
      const companyIds = await this.getCompanyIdsForUser(user.userId);

      if (companyIds.length === 0) {
        return { data: [], total: 0, page, limit };
      }

      mongoFilters['company.id'] = { $in: companyIds };
    }

    const query = this.feedbackModel
      .find(mongoFilters)
      .sort({ dateRegister: -1 })
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      query.exec(),
      this.feedbackModel.countDocuments(mongoFilters).exec(),
    ]);

    return { data, total, page, limit };
  }

  private async getCompanyIdsForUser(userId: string): Promise<string[]> {
    log('Fetching company IDs for user:', userId);
    const personalData = await this.personalDataModel
      .findOne({ user: new Types.ObjectId(userId) })
      .select('_id')
      .exec();

    if (!personalData?._id) {
      return [];
    }

    const companies = (await this.companyModel
      .find({ contacts: personalData._id })
      .select('_id')
      .exec()) as { _id: unknown }[];

    const uniqueIds = new Set(
      companies
        .map((company) => {
          if (typeof company._id === 'string') return company._id;
          if (
            company._id &&
            typeof (company._id as any).toString === 'function'
          ) {
            return (company._id as any).toString();
          }
          return '';
        })
        .filter((id) => id.length > 0),
    );
    log('Unique Company IDs:', uniqueIds);

    return Array.from(uniqueIds);
  }

  async assignToCompany(
    id: string,
    dto: FeedbackCompanyRequestDto,
  ): Promise<Feedback> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    feedback.status = FeedbackStatus.FORWARDED;

    feedback.company = {
      id: dto.id,
      name: dto.name,
      description: dto.description,
    };

    await feedback.save();
    this.gateway.sendNotification('companyAssigned', feedback);
    log('Feedback assigned to company:', feedback);
    await this.sendFeedbackSheetUpdateCompany(feedback);
    return feedback;
  }

  async sendFeedbackSheetUpdateCompany(feedback: Feedback): Promise<void> {
    try {
      const feedbackData = {
        caseNumber: feedback.caseNumber,
        company: feedback.company?.name || 'No asignada',
      };
      log('Sending feedback data to n8n:', feedbackData);
      await this.httpService.post(this.urlN8nCompany, feedbackData).toPromise();
    } catch (error) {
      console.error('Error sending feedback sheet to n8n:', error);
    }
  }

  async sendFeedbackSheet(feedback: Feedback): Promise<void> {
    try {
      const feedbackData = {
        caseNumber: feedback.caseNumber,
        status: this.feedbackStatusMap[feedback.status] || feedback.status,
      };
      log('Sending feedback data to n8n:', feedbackData);
      await this.httpService.post(this.urlN8n, feedbackData).toPromise();
    } catch (error) {
      console.error('Error sending feedback sheet to n8n:', error);
    }
  }

  private readonly feedbackStatusMap: Record<string, string> = {
    PENDING: 'Pendiente',
    FORWARDED: 'Derivado',
    IN_PROGRESS: 'En proceso',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
  };
}
