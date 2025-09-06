import { FeedbackService, AttachmentMeta } from './feedback.service';
import { FeedbackType } from './feedback-type.enum';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    service = new FeedbackService();
  });

  const dto: CreateFeedbackDto = {
    lastName: 'Doe',
    firstName: 'John',
    email: 'john@example.com',
    description: 'desc',
    phone: '123',
    type: FeedbackType.COMPLAINT,
    contacted: true,
    latitude: 0,
    longitude: 0,
    address: 'Somewhere',
  };

  it('creates feedback without attachment', async () => {
    const result = await service.createFeedback(dto);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(result.attachment).toBeNull();
  });

  it('creates feedback with attachment', async () => {
    const attachment: AttachmentMeta = {
      url: '/public/files/2025/09/file.png',
      mimeType: 'image/png',
      size: 100,
      originalName: 'file.png',
      filename: 'uuid.png',
    };
    const result = await service.createFeedback(dto, attachment);
    expect(result.attachment).toEqual({
      url: attachment.url,
      mimeType: attachment.mimeType,
      size: attachment.size,
      originalName: attachment.originalName,
    });
  });
});
