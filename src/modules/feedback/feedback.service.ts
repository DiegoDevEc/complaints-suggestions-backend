import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackResponseDto } from './dto/feedback-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Feedback } from './schemas/feedback.schema';
import { Model } from 'mongoose';
import { AiClassifierService } from './ai-classifier.service';
import { Company } from '../company/schemas/company.schema';
import { FeedbackStatus } from './feedback-status.enum';
import { log } from 'console';

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
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly aiClassifierService: AiClassifierService,
  ) { }

  async createFeedback(
    dto: CreateFeedbackDto,
    attachment?: AttachmentMeta,
  ): Promise<FeedbackResponseDto> {
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

    log('Classifying feedback to select company...');
    const companies = await this.companyModel.find().exec();
    log(`Found ${companies.length} companies in database.`);
    const companySelected = await this.aiClassifierService.classifyFeedbackPreparate(
      dto.description,
      companies,
    );
    log('Company boolean:', companySelected != null);

    const companySave = companySelected != null ? {
      id: companySelected.empresaId,
      name: companySelected.name,
      description: companySelected.category, // 👈 si quieres guardar la categoría como descripción
      note: companySelected.note,            // 👈 aquí mapeamos "nota" → "note"
    } : null;

    log('Company to link:', companySave);
    log('Company selected:', companySelected);
    log('Creating feedback entry in database...');
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
      company: companySave,
      // eslint-disable-next-line prettier/prettier
      status: companySelected != null ? FeedbackStatus.FORWARDED : FeedbackStatus.PENDING,
    });
    log('Feedback entry created:', feedbackModel);
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
