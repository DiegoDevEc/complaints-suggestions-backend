import { Controller, Get } from '@nestjs/common';
import {
  DashboardService,
  DashboardSummaryResponseDto,
} from './dashboard.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('private/dashboard')
@ApiTags('Dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener métricas agregadas del dashboard administrativo',
  })
  getSummary(): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary();
  }
}
