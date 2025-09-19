import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'companies' })
export class Company extends Document {
  @ApiProperty()
  @Prop({ required: true })
  name: string;

  @ApiProperty()
  @Prop()
  description: string;

  @ApiProperty()
  @Prop({ required: true })
  status: string;

  @ApiProperty()
  @Prop({ required: true })
  category: string;

  @ApiProperty({ type: [String], required: false, default: [] })
  @Prop({ type: [String], default: [] })
  tags: string[];

  @ApiProperty({ type: [String], required: false, default: [] })
  @Prop({ type: [{ type: Types.ObjectId, ref: 'PersonalData' }], default: [] })
  contacts: Types.ObjectId[];
}

export const CompanySchema = SchemaFactory.createForClass(Company);
