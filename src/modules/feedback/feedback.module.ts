import { Module } from '@nestjs/common';
import { UploadModule } from '../upload';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { StorageService } from '../../storage/storage.service';
import { FileStorageService } from '../../storage/file-storage.service';

@Module({
  imports: [UploadModule],
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
