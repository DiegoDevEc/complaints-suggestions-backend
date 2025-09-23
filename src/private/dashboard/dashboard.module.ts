import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import {
  Feedback,
  FeedbackSchema,
} from 'src/modules/feedback/schemas/feedback.schema';
import {
  Company,
  CompanySchema,
} from 'src/modules/company/schemas/company.schema';
import {
  PersonalData,
  PersonalDataSchema,
} from 'src/users/personal-data.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Company.name, schema: CompanySchema },
      { name: PersonalData.name, schema: PersonalDataSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
