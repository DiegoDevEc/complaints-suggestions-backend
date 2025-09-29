import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Feedback } from '../../modules/feedback/schemas/feedback.schema';
import { FeedbackService } from './feedback.service';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { JwtUserPayload } from '../../auth/interfaces/jwt-user-payload.interface';
import { Request } from 'express';
import { FeedbackCompanyRequestDto } from './dto/feedback-company-request.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { FeedbackStatus } from '../../modules/feedback/feedback-status.enum';

type RequestWithUser = Request & { user: JwtUserPayload };

@ApiTags('Feedback')
@Controller('private/feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update feedback status' })
  @ApiBody({ type: UpdateFeedbackStatusDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
    @Req() req: RequestWithUser,
  ): Promise<Feedback> {
    const feedback = await this.feedbackService.updateStatus(
      id,
      dto.status,
      req.user,
      dto.note,
    );

    if (feedback.email) {
      try {
        await this.notificationsService.sendEmail({
          to: feedback.email,
          subject: `Actualización de estado - Caso ${feedback.caseNumber}`,
          html: this.buildFeedbackEmail(feedback),
        });
      } catch (error) {
        this.logger.error(
          `No se pudo enviar el correo de actualización del caso ${feedback.caseNumber}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    return feedback;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel feedback entry' })
  async cancel(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<Feedback> {
    return this.feedbackService.cancel(id, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'List feedback entries with pagination and filters',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query() query: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    const { page = 1, limit = 10, ...filters } = query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    return this.feedbackService.findAll(
      pageNumber,
      limitNumber,
      filters,
      req.user,
    );
  }

  @Patch(':id/company')
  @ApiOperation({ summary: 'Assign feedback to a company' })
  @ApiBody({ type: FeedbackCompanyRequestDto })
  assignToCompany(
    @Param('id') id: string,
    @Body() dto: FeedbackCompanyRequestDto,
  ): Promise<Feedback> {
    return this.feedbackService.assignToCompany(id, dto);
  }

  private buildFeedbackEmail(feedback: Feedback): string {
    const statusLabels: Partial<Record<FeedbackStatus, string>> = {
      [FeedbackStatus.PENDING]: 'Pendiente',
      [FeedbackStatus.FORWARDED]: 'Derivado',
      [FeedbackStatus.IN_PROGRESS]: 'En proceso',
      [FeedbackStatus.RESOLVED]: 'Resuelto',
      [FeedbackStatus.CANCEL]: 'Cancelado',
      [FeedbackStatus.RETURNED]: 'Devuelto',
    };

    const statusLabel = statusLabels[feedback.status] ?? feedback.status;
    const resolvedMessage =
      feedback.status === FeedbackStatus.RESOLVED
        ? '<p class="message">Agradecemos sinceramente tu observación. Gracias a tu participación podemos seguir mejorando nuestros servicios.</p>'
        : '';

    return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Actualización de estado</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f5f7fa;
        margin: 0;
        padding: 0;
        color: #2f3542;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        padding: 24px;
        color: #ffffff;
      }
      .header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }
      .content {
        padding: 28px 32px;
        line-height: 1.6;
      }
      .status {
        display: inline-block;
        margin-top: 12px;
        padding: 8px 18px;
        border-radius: 999px;
        background: #e0edff;
        color: #1d4ed8;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .message {
        margin-top: 18px;
      }
      .footer {
        padding: 20px 32px;
        background: #f1f5f9;
        font-size: 12px;
        color: #64748b;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Actualización del caso #${feedback.caseNumber}</h1>
      </div>
      <div class="content">
        <p>Hola ${feedback.firstName} ${feedback.lastName},</p>
        <p>
          Te informamos que el estado de tu solicitud ha sido actualizado al
          siguiente estado:
        </p>
        <div class="status">${statusLabel}</div>
        ${resolvedMessage}
        <p class="message">
          Si tienes preguntas adicionales puedes responder a este correo para
          ponerte en contacto con nuestro equipo.
        </p>
      </div>
      <div class="footer">
        Este mensaje se generó automáticamente, por favor no respondas si no es
        necesario.
      </div>
    </div>
  </body>
</html>`;
  }
}
