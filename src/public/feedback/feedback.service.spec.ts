import { FeedbackService } from './feedback.service';
import { FeedbackType } from './feedback-type.enum';
import { Model } from 'mongoose';
import { Feedback } from './schemas/feedback.schema';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let MockModel: any;

  beforeEach(() => {
    MockModel = function (doc: any) {
      return { ...doc, save: jest.fn().mockResolvedValue({ ...doc }) };
    } as any;
    MockModel.countDocuments = jest.fn();
    service = new FeedbackService(MockModel as unknown as Model<Feedback>);
  });

  it('generates sequential case numbers for complaints', async () => {
    MockModel.countDocuments
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(0) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(1) });
    const dto: any = {
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.com',
      description: 'desc',
      phone: '123',
      type: FeedbackType.COMPLAINT,
      contacted: true,
      latitude: 0,
      longitude: 0,
    };
    const first = await service.create(dto);
    expect(first.caseNumber).toBe('COP-00001');

    const second = await service.create(dto);
    expect(second.caseNumber).toBe('COP-00002');
  });

  it('uses suggestion prefix', async () => {
    MockModel.countDocuments.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(0) });
    const dto: any = {
      lastName: 'Doe',
      firstName: 'Jane',
      email: 'jane@example.com',
      description: 'desc',
      phone: '123',
      type: FeedbackType.SUGGESTION,
      contacted: true,
      latitude: 0,
      longitude: 0,
    };
    const created = await service.create(dto);
    expect(created.caseNumber).toBe('SUG-00001');
  });
});
