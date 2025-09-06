import { ParseFilePipeBuilder } from '@nestjs/common';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './upload.constants';

export const AttachmentValidationPipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE })
  .addFileTypeValidator({ fileType: ALLOWED_MIME_TYPES })
  .build({ fileIsRequired: false });
