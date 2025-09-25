import { Module } from '@nestjs/common';
import { UploadModule } from '../upload';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackPdfService } from './feedback-pdf.service';
import { StorageService } from '../../storage/storage.service';
import { FileStorageService } from '../../storage/file-storage.service';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema';
import { AiClassifierService } from './ai-classifier.service';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import { HttpModule } from '@nestjs/axios';
import { NotificationsModule } from '../../notifications/notifications.module';
import { User, UserSchema } from '../../users/user.schema';
import {
  PersonalData,
  PersonalDataSchema,
} from '../../users/personal-data.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: PersonalData.name, schema: PersonalDataSchema },
    ]),
    UploadModule,
    HttpModule,
    NotificationsModule,
  ],
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    FeedbackPdfService,
    {
      provide: StorageService,
      useClass: FileStorageService,
    },
    AiClassifierService,
  ],
})
export class FeedbackModule {}
