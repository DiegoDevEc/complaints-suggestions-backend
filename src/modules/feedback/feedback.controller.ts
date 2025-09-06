import {
  Body,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';
import { Public } from '../../auth/public.decorator';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreateFeedbackWithFileDto } from './dto/create-feedback-with-file.dto';
import { FeedbackResponseDto } from './dto/feedback-response.dto';
import { FeedbackService, AttachmentMeta } from './feedback.service';
import { StorageService } from '../../storage/storage.service';
import { AttachmentValidationPipe, getRelativePath } from '../upload';

/**
 * curl -X POST http://localhost:3000/public/feedback \
 *   -F "lastName=Doe" \
 *   -F "firstName=Jane" \
 *   -F "email=jane@example.com" \
 *   -F "description=Hay baches en la calle 10" \
 *   -F "phone=0999999999" \
 *   -F "type=complaint" \
 *   -F "contacted=true" \
 *   -F "latitude=-0.1807" \
 *   -F "longitude=-78.4678" \
 *   -F "address=Quito, EC" \
 *   -F "attachment=@/ruta/imagen.png;type=image/png"
 */
@ApiTags('Public/Feedback')
@Controller('public/feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateFeedbackWithFileDto })
  @ApiCreatedResponse({ type: FeedbackResponseDto })
  @UseInterceptors(FileInterceptor('attachment'))
  create(
    @Body() dto: CreateFeedbackDto,
    @UploadedFile(AttachmentValidationPipe) file?: MulterFile,
  ): FeedbackResponseDto {
    this.logger.log('Handling feedback creation');

    let attachmentMeta: AttachmentMeta | undefined;
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
    if (file) {
      const { path, mimetype, size, originalname, filename } = file;
      const relativePath = getRelativePath(path);
      const url = this.storageService.getPublicUrl(relativePath);
      attachmentMeta = {
        url,
        mimeType: mimetype,
        size,
        originalName: originalname,
        filename,
      };
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

    const result = this.feedbackService.createFeedback(dto, attachmentMeta);
    this.logger.log(`Feedback created: ${result.id}`);
    return result;
  }
}
