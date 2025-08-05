import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { FeedbackType } from '../feedback-type.enum';

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
  @Prop({ required: true })
  contacted: boolean;

  @ApiProperty()
  @Prop({ required: true })
  latitude: number;

  @ApiProperty()
  @Prop({ required: true })
  longitude: number;

  @ApiProperty({ default: Date.now })
  @Prop({ default: Date.now })
  dateRegister: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
