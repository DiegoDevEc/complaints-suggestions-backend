import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  DashboardService,
  DashboardSummaryResponseDto,
} from './dashboard.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtUserPayload } from '../../auth/interfaces/jwt-user-payload.interface';
import { FeedbackGeoQueryDto } from './dto/feedback-geo-query.dto';
import { FeedbackType } from '../../modules/feedback/feedback-type.enum';
import { FeedbackStatus } from '../../modules/feedback/feedback-status.enum';

type RequestWithUser = Request & { user: JwtUserPayload };

@Controller('private/dashboard')
@ApiTags('Dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener métricas agregadas del dashboard administrativo',
  })
  getSummary(
    @Req() req: RequestWithUser,
  ): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary(req.user);
  }

  @Get('feedbacks/geo')
  @ApiQuery({ name: 'type', required: false, enum: FeedbackType })
  @ApiQuery({ name: 'status', required: false, enum: FeedbackStatus })
  async getFeedbacksGeo(
    @Req() req: RequestWithUser,
    @Query() filters: FeedbackGeoQueryDto,
  ): Promise<{ latitude: number; longitude: number }[]> {
    return this.dashboardService.getFeedbacksGeo(req.user, filters);
  }
}
