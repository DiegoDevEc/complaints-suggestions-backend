import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FilesystemStorageService } from '../../storage/filesystem.storage';
import { StorageService } from '../../storage/storage.service';

@Module({
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    {
      provide: StorageService,
      useClass: FilesystemStorageService,
    },
  ],
})
export class FeedbackModule {}
