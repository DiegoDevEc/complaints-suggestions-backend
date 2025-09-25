import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document } from 'mongoose';

export type PermissionStatus = 'ACT' | 'INA' | 'BLO';

@Schema({ collection: 'permissions', timestamps: true })
export class Permission extends Document {
  @ApiProperty()
  @Prop({ required: true, unique: true })
  name: string;

  @ApiPropertyOptional()
  @Prop({ required: false })
  description?: string;

  @ApiProperty({ enum: ['ACT', 'INA', 'BLO'], default: 'ACT' })
  @Prop({ required: true, enum: ['ACT', 'INA', 'BLO'], default: 'ACT' })
  status: PermissionStatus;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
