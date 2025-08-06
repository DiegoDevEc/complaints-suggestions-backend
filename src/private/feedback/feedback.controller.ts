import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Feedback } from '../../public/feedback/schemas/feedback.schema';
import { FeedbackService } from './feedback.service';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';

@ApiTags('Feedback')
@Controller('private/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update feedback status' })
  @ApiBody({ type: UpdateFeedbackStatusDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ): Promise<Feedback> {
    return this.feedbackService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel feedback entry' })
  async cancel(@Param('id') id: string): Promise<Feedback> {
    return this.feedbackService.cancel(id);
  }

  @Get()
  @ApiOperation({
    summary: 'List feedback entries with pagination and filters',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: Record<string, any>) {
    const { page = 1, limit = 10, ...filters } = query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    return this.feedbackService.findAll(pageNumber, limitNumber, filters);
  }
}
