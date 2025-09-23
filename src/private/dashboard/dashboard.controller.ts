import { Controller, Get, Req } from '@nestjs/common';
import {
  DashboardService,
  DashboardSummaryResponseDto,
} from './dashboard.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtUserPayload } from '../../auth/interfaces/jwt-user-payload.interface';

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
  async getFeedbacksGeo(
    @Req() req: RequestWithUser,
  ): Promise<{ latitude: number; longitude: number }[]> {
    return this.dashboardService.getFeedbacksGeo(req.user);
  }
}
