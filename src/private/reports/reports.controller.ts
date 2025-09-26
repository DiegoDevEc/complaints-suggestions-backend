import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FeedbackReportQueryDto } from './dto/feedback-report-query.dto';
import { FeedbacksByCompanyQueryDto } from './dto/feedbacks-by-company-query.dto';
import { ReportsService } from './reports.service';

@Controller('private/reports')
@ApiTags('Reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('feedbacks/excel')
  @ApiOperation({
    summary: 'Exportar el listado general de feedbacks en formato Excel',
  })
  async exportFeedbacksToExcel(
    @Query() query: FeedbackReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.reportsService.exportFeedbacksToExcel(query, res);
  }

  @Get('feedbacks-by-company/excel')
  @ApiOperation({
    summary: 'Exportar el total de feedbacks por empresa en formato Excel',
  })
  async exportFeedbacksByCompanyToExcel(
    @Query() query: FeedbacksByCompanyQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.reportsService.exportFeedbacksByCompanyToExcel(query, res);
  }
}
