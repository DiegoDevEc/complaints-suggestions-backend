import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './schemas/feedback.schema';
import { FeedbackService } from './feedback.service';

@ApiTags('Feedback')
@Controller('public/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create feedback entry' })
  @ApiBody({ type: CreateFeedbackDto })
  @ApiCreatedResponse({ type: Feedback })
  async create(@Body() dto: CreateFeedbackDto): Promise<Feedback> {
    return this.feedbackService.create(dto);
  }
}
