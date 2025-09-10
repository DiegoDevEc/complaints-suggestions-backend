import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { FeedbackType } from '../feedback-type.enum';
import { FeedbackStatus } from '../feedback-status.enum';

@Schema({ collection: 'feedbacks' })
export class Feedback extends Document {
  @ApiProperty()
  @Prop({ required: true })
  lastName: string;

  @ApiProperty()
  @Prop({ required: true })
  firstName: string;

  @ApiProperty()
  @Prop({ required: true })
  email: string;

  @ApiProperty()
  @Prop({ required: true })
  description: string;

  @ApiProperty()
  @Prop({ required: true })
  phone: string;

  @ApiProperty({ enum: FeedbackType })
  @Prop({ required: true, enum: FeedbackType })
  type: FeedbackType;

  @ApiProperty()
  @Prop({ required: true, unique: true })
  caseNumber: string;

  @ApiProperty({ enum: FeedbackStatus, default: FeedbackStatus.PENDING })
  @Prop({
    required: true,
    enum: FeedbackStatus,
    default: FeedbackStatus.PENDING,
  })
  status: FeedbackStatus;

  @ApiProperty()
  @Prop({ required: true })
  contacted: boolean;

  @ApiProperty()
  @Prop({ required: true })
  latitude: number;

  @ApiProperty()
  @Prop({ required: true })
  longitude: number;

  @ApiProperty({ default: '2025-08-05T17:00:00.000Z' })
  @Prop({ default: Date.now })
  dateRegister: Date;

  @ApiProperty()
  @Prop({ required: true })
  address: string;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      url: { type: 'string' },
      mimeType: { type: 'string' },
      size: { type: 'number' },
      originalName: { type: 'string' },
      filename: { type: 'string' },
    },
    nullable: true,
  })
  @Prop({
    type: {
      url: String,
      mimeType: String,
      size: Number,
      originalName: String,
      filename: String,
    },
    _id: false,
    required: false,
    default: null, // permite guardar sin adjunto
  })
  attachment?: {
    url: string;
    mimeType: string;
    size: number;
    originalName: string;
    filename: string;
  } | null;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
