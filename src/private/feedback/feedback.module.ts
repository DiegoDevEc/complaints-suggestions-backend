import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Feedback,
  FeedbackSchema,
} from '../../modules/feedback/schemas/feedback.schema';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
