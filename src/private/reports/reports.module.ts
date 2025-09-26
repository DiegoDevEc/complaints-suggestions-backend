import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Feedback,
  FeedbackSchema,
} from '../../modules/feedback/schemas/feedback.schema';
import {
  Company,
  CompanySchema,
} from '../../modules/company/schemas/company.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
