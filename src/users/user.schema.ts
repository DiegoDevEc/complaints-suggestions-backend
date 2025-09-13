import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from './role.enum';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: Role, default: Role.EMPLOYEE })
  role: Role;

  @Prop({ default: true })
  isFirstLogin: boolean;

  @Prop({ type: Types.ObjectId, ref: 'PersonalData' })
  personalData: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
