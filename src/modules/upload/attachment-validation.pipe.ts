import { ParseFilePipeBuilder } from '@nestjs/common';
import { MAX_FILE_SIZE } from './upload.constants';

export const AttachmentValidationPipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE })
  .build({ fileIsRequired: false });
