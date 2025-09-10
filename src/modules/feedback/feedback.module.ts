import { Module } from '@nestjs/common';
import { UploadModule } from '../upload';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { StorageService } from '../../storage/storage.service';
import { FileStorageService } from '../../storage/file-storage.service';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
    UploadModule,
  ],
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    {
      provide: StorageService,
      useClass: FileStorageService,
    },
  ],
})
export class FeedbackModule {}
