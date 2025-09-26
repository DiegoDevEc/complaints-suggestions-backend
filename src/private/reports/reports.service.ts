import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Workbook } from 'exceljs';
import { Model, PipelineStage } from 'mongoose';
import { Feedback } from '../../modules/feedback/schemas/feedback.schema';
import { FeedbackReportQueryDto } from './dto/feedback-report-query.dto';
import { Response } from 'express';
import { FeedbacksByCompanyQueryDto } from './dto/feedbacks-by-company-query.dto';
import { Company } from '../../modules/company/schemas/company.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<Feedback>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
  ) {}

  async exportFeedbacksToExcel(
    query: FeedbackReportQueryDto,
    res: Response,
  ): Promise<void> {
    const filters = this.buildFeedbackFilters(query);

    const feedbacks = await this.feedbackModel
      .find(filters)
      .sort({ dateRegister: -1 })
      .lean()
      .exec();

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Feedbacks');

    worksheet.columns = [
      { header: 'CaseNumber', key: 'caseNumber', width: 20 },
      { header: 'FirstName', key: 'firstName', width: 20 },
      { header: 'LastName', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Type', key: 'type', width: 18 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'CompanyName', key: 'companyName', width: 28 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'DateRegister', key: 'dateRegister', width: 28 },
      { header: 'Contacted', key: 'contacted', width: 15 },
      { header: 'Address', key: 'address', width: 40 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.autoFilter = {
      from: 'A1',
      to: 'L1',
    };

    for (const feedback of feedbacks) {
      worksheet.addRow({
        caseNumber: feedback.caseNumber,
        firstName: feedback.firstName,
        lastName: feedback.lastName,
        email: feedback.email,
        phone: feedback.phone,
        type: feedback.type,
        status: feedback.status,
        companyName: this.resolveCompanyName(feedback.company),
        description: feedback.description,
        dateRegister: feedback.dateRegister
          ? new Date(feedback.dateRegister).toISOString()
          : '',
        contacted: feedback.contacted ? 'Yes' : 'No',
        address: feedback.address,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=feedbacks.xlsx',
    );

    res.send(buffer);
  }

  async exportFeedbacksByCompanyToExcel(
    query: FeedbacksByCompanyQueryDto,
    res: Response,
  ): Promise<void> {
    const pipeline = this.buildFeedbacksByCompanyPipeline(query);

    const results = await this.feedbackModel.aggregate(pipeline).exec();

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Feedbacks por empresa');

    worksheet.columns = [
      { header: 'CompanyName', key: 'companyName', width: 40 },
      { header: 'TotalFeedbacks', key: 'totalFeedbacks', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.autoFilter = {
      from: 'A1',
      to: 'B1',
    };

    for (const row of results) {
      worksheet.addRow({
        companyName: row.companyName,
        totalFeedbacks: row.totalFeedbacks,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=feedbacks-by-company.xlsx',
    );

    res.send(buffer);
  }

  private buildFeedbackFilters(query: FeedbackReportQueryDto) {
    const filters: Record<string, unknown> = {};

    const dateFilter: Record<string, Date> = {};
    const startDate = this.parseDate(query.startDate);
    const endDate = this.parseDate(query.endDate);

    if (startDate) {
      dateFilter.$gte = startDate;
    }

    if (endDate) {
      dateFilter.$lte = endDate;
    }

    if (Object.keys(dateFilter).length > 0) {
      filters.dateRegister = dateFilter;
    }

    if (query.type) {
      filters.type = query.type;
    }

    if (query.status) {
      filters.status = query.status;
    }

    return filters;
  }

  private buildFeedbacksByCompanyPipeline(
    query: FeedbacksByCompanyQueryDto,
  ): PipelineStage[] {
    const pipeline: PipelineStage[] = [];
    const match: Record<string, unknown> = {};

    const startDate = this.parseDate(query.startDate);
    const endDate = this.parseDate(query.endDate);

    const dateFilter: Record<string, Date> = {};

    if (startDate) {
      dateFilter.$gte = startDate;
    }

    if (endDate) {
      dateFilter.$lte = endDate;
    }

    if (Object.keys(dateFilter).length > 0) {
      match.dateRegister = dateFilter;
    }

    if (query.status) {
      match.status = query.status;
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push({
      $group: {
        _id: '$company.id',
        totalFeedbacks: { $sum: 1 },
        fallbackName: { $first: '$company.name' },
      },
    });

    pipeline.push({
      $addFields: {
        companyObjectId: {
          $convert: {
            input: '$_id',
            to: 'objectId',
            onError: null,
            onNull: null,
          },
        },
      },
    });

    pipeline.push({
      $lookup: {
        from: this.companyModel.collection.name,
        localField: 'companyObjectId',
        foreignField: '_id',
        as: 'company',
        pipeline: [{ $project: { name: 1 } }],
      },
    });

    pipeline.push({
      $addFields: {
        companyName: {
          $let: {
            vars: {
              lookedUpName: { $first: '$company.name' },
            },
            in: {
              $ifNull: [
                '$$lookedUpName',
                { $ifNull: ['$fallbackName', 'Sin asignar'] },
              ],
            },
          },
        },
      },
    });

    pipeline.push({
      $project: {
        _id: 0,
        companyName: 1,
        totalFeedbacks: 1,
      },
    });

    pipeline.push({ $sort: { companyName: 1 } });

    return pipeline;
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private resolveCompanyName(
    company: unknown,
  ): string {
    if (!company) {
      return '';
    }

    if (typeof company === 'string') {
      return company;
    }

    if (typeof company === 'object') {
      const name = (company as { name?: string }).name;
      if (typeof name === 'string' && name.length > 0) {
        return name;
      }

      if (
        typeof (company as { toString?: () => string }).toString === 'function'
      ) {
        return (company as { toString: () => string }).toString();
      }
    }

    return '';
  }
}
