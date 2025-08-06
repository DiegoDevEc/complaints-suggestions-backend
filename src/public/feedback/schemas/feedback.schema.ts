import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
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
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
