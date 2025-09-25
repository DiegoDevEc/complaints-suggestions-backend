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
import { FeedbackPdfService } from './feedback-pdf.service';
import { log } from 'console';
import {
  NotificationsService,
  SendEmailOptions,
} from '../../notifications/notifications.service';
import { User } from '../../users/user.schema';
import { Role } from '../../users/role.enum';
import { FeedbackType } from './feedback-type.enum';

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
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly aiClassifierService: AiClassifierService,
    private readonly notificationsService: NotificationsService,
    private readonly feedbackPdfService: FeedbackPdfService,
  ) {}

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
    const companySelected: unknown =
      await this.aiClassifierService.classifyFeedbackPreparate(
        dto.description,
        companies,
      );
    log('Company boolean:', companySelected != null);

    const normalizedCompany = this.normalizeCompanySelection(companySelected);
    const companyId = normalizedCompany.id;

    const companySave =
      companyId != null
        ? {
            id: companyId,
            ...(normalizedCompany.name
              ? { name: normalizedCompany.name }
              : {}),
            ...(normalizedCompany.category
              ? { description: normalizedCompany.category }
              : {}),
            ...(normalizedCompany.note
              ? { note: normalizedCompany.note }
              : {}),
          }
        : null;

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
    const savedFeedback = await feedbackModel.save();

    void this.sendFeedbackCreationNotifications(savedFeedback, companyId);

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

  private normalizeCompanySelection(selection: unknown): {
    id: string | null;
    name?: string;
    category?: string;
    note?: string;
  } {
    if (!this.isRecord(selection)) {
      return { id: null };
    }

    const rawId =
      selection['empresaId'] ?? selection['id'] ?? selection['_id'] ?? null;

    return {
      id: this.normalizeId(rawId),
      name: this.extractNonEmptyString(selection['name']),
      category: this.extractNonEmptyString(selection['category']),
      note: this.extractNonEmptyString(selection['note']),
    };
  }

  private normalizeId(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return value.toString();
    }
    if (this.isRecord(value) && 'toString' in value) {
      const toStringFn = value.toString;
      if (typeof toStringFn === 'function') {
        const result = toStringFn.call(value);
        if (typeof result === 'string' && result !== '[object Object]') {
          return result;
        }
      }
    }
    return null;
  }

  private extractNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private async sendFeedbackCreationNotifications(
    feedbackDoc: Feedback,
    companyId: string | null,
  ): Promise<void> {
    try {
      const notifications: Promise<void>[] = [];
      const caseNumber = feedbackDoc.caseNumber;
      const authorEmail = feedbackDoc.email;

      if (authorEmail) {
        notifications.push(
          this.safeSendAuthorEmail(feedbackDoc, {
            to: authorEmail,
            subject: `Registro de feedback - ${caseNumber}`,
            html: this.buildAuthorEmailHtml(feedbackDoc),
          }),
        );
      }

      const adminUsers = await this.userModel
        .find({ role: Role.ADMIN })
        .select('email')
        .lean()
        .exec();
        
      const generalRecipients = new Set<string>(
        adminUsers
          .map((admin) => admin?.email)
          .filter(
            (email): email is string =>
              typeof email === 'string' && email.length > 0,
          ),
      );

      const companyRecipients = await this.getCompanyContactEmails(companyId);
      for (const email of companyRecipients) {
        generalRecipients.add(email);
      }

      for (const email of generalRecipients) {
        notifications.push(
          this.safeSendEmail({
            to: email,
            subject: 'Nuevo caso registrado',
            html: this.buildGeneralEmailHtml(feedbackDoc),
          }),
        );
      }

      if (notifications.length > 0) {
        await Promise.all(notifications);
      }
    } catch (error) {
      this.logger.error(
        `Error al enviar notificaciones para el feedback ${feedbackDoc.caseNumber}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async getCompanyContactEmails(
    companyId: string | null,
  ): Promise<string[]> {
    if (!companyId) {
      return [];
    }
    try {
      const company = await this.companyModel
        .findById(companyId)
        .populate({
          path: 'contacts',
          populate: { path: 'user', select: 'email' },
        })
        .lean()
        .exec();

      if (!company || !Array.isArray(company.contacts)) {
        return [];
      }

      return company.contacts
        .map((contact: unknown) => {
          if (!this.isRecord(contact)) {
            return null;
          }
          const user = contact['user'];
          if (!this.isRecord(user)) {
            return null;
          }
          const email = this.extractNonEmptyString(user['email']);
          return email ?? null;
        })
        .filter((email): email is string => typeof email === 'string');
    } catch (error) {
      this.logger.error(
        `No se pudieron obtener los contactos de la empresa ${companyId}: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  private async safeSendEmail(options: SendEmailOptions): Promise<void> {
    try {
      await this.notificationsService.sendEmail(options);
    } catch {
      // El servicio de notificaciones ya registra los errores
    }
  }

  private async safeSendAuthorEmail(
    feedback: Feedback,
    options: SendEmailOptions,
  ): Promise<void> {
    if (feedback.type !== FeedbackType.COMPLAINT) {
      await this.safeSendEmail(options);
      return;
    }

    try {
      const pdfBuffer = await this.feedbackPdfService.generateComplaintCertificate(feedback);
      const attachments = [
        {
          filename: `constancia-${feedback.caseNumber}.pdf`,
          content: pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
        },
      ];

      await this.safeSendEmail({
        ...options,
        attachments,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo generar la constancia en PDF para el feedback ${feedback.caseNumber}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      await this.safeSendEmail(options);
    }
  }

  private buildAuthorEmailHtml(feedback: Feedback): string {
    return [
      `<p>Hola ${feedback.firstName} ${feedback.lastName},</p>`,
      `<p>Hemos recibido tu feedback y se ha generado el número de seguimiento <strong>${feedback.caseNumber}</strong>.</p>`,
      '<p>Nos pondremos en contacto contigo si necesitamos información adicional.</p>',
      '<p>Gracias por ayudarnos a mejorar.</p>',
    ].join('');
  }

  private buildGeneralEmailHtml(feedback: Feedback): string {
    const companyInfo = feedback.company?.name
      ? `<p><strong>Empresa asignada:</strong> ${feedback.company.name}</p>`
      : '';

    return [
      '<p>Se ha registrado un nuevo caso en el sistema.</p>',
      `<p><strong>Número de seguimiento:</strong> ${feedback.caseNumber}</p>`,
      `<p><strong>Tipo:</strong> ${feedback.type}</p>`,
      `<p><strong>Remitente:</strong> ${feedback.firstName} ${feedback.lastName} (${feedback.email}).</p>`,
      companyInfo,
      '<p>Descripción:</p>',
      `<p>${feedback.description}</p>`,
    ].join('');
  }
}
