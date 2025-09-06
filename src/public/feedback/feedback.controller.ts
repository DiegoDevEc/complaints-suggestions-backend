import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Logger,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { join, extname, relative } from 'path';
import * as fs from 'fs';
import { Public } from '../../auth/public.decorator';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';
import { StorageService } from '../../storage/storage.service';

interface UploadedFile {
  path: string;
  mimetype: string;
  size: number;
  originalname: string;
  filename: string;
}

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
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const now = new Date();
          const uploadPath = join(
            process.cwd(),
            'uploads',
            now.getFullYear().toString(),
            (now.getMonth() + 1).toString().padStart(2, '0'),
          );
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
    }),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        lastName: { type: 'string' },
        firstName: { type: 'string' },
        email: { type: 'string' },
        description: { type: 'string' },
        phone: { type: 'string' },
        type: {
          type: 'string',
          enum: ['complaint', 'suggestion', 'compliment'],
        },
        contacted: { type: 'boolean' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        address: { type: 'string' },
        attachment: { type: 'string', format: 'binary', nullable: true },
      },
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        lastName: { type: 'string' },
        firstName: { type: 'string' },
        email: { type: 'string' },
        description: { type: 'string' },
        phone: { type: 'string' },
        type: { type: 'string' },
        contacted: { type: 'boolean' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        address: { type: 'string' },
        attachment: {
          type: 'object',
          nullable: true,
          properties: {
            url: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'number' },
            originalName: { type: 'string' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async create(
    @Body() dto: CreateFeedbackDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType:
              /^(image\/jpeg|image\/png|image\/webp|video\/mp4|application\/pdf)$/,
          }),
        ],
      }),
    )
    file?: UploadedFile,
  ) {
    this.logger.log('Handling feedback creation');
    try {
      let attachmentMeta;
      if (file) {
        const relativePath = relative(
          join(process.cwd(), 'uploads'),
          file.path,
        ).replace(/\\/g, '/');
        const url = this.storageService.getPublicUrl(relativePath);
        attachmentMeta = {
          url,
          mimeType: file.mimetype,
          size: file.size,
          originalName: file.originalname,
          filename: file.filename,
        };
      }
      const result = await this.feedbackService.createFeedback(
        dto,
        attachmentMeta,
      );
      this.logger.log(`Feedback created: ${result.id}`);
      return result;
    } catch (err) {
      this.logger.error('Error creating feedback', err.stack);
      throw err;
    }
  }
}
