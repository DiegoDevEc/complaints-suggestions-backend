/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';
import { diskStorage } from 'multer';
import { ensureUploadPath, generateFilename } from './upload.utils';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (
          _req,
          _file: MulterFile,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          const dest = ensureUploadPath();
          cb(null, dest);
        },
        filename: (
          _req,
          file: MulterFile,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          cb(null, generateFilename(file.originalname));
        },
      }),
    }),
  ],
  exports: [MulterModule],
})
export class UploadModule {}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
