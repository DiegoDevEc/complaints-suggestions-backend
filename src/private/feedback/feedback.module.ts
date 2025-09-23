import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Feedback,
  FeedbackSchema,
} from '../../modules/feedback/schemas/feedback.schema';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import {
  Company,
  CompanySchema,
} from '../../modules/company/schemas/company.schema';
import {
  PersonalData,
  PersonalDataSchema,
} from '../../users/personal-data.schema';

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Company.name, schema: CompanySchema },
      { name: PersonalData.name, schema: PersonalDataSchema },
    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
