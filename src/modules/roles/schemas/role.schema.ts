import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { Permission } from '../../permissions/schemas/permission.schema';

export type RoleStatus = 'ACT' | 'INA' | 'BLO';

@Schema({ collection: 'roles', timestamps: true })
export class Role extends Document {
  @ApiProperty()
  @Prop({ required: true, unique: true })
  name: string;

  @ApiPropertyOptional()
  @Prop({ required: false })
  description?: string;

  @ApiProperty({ enum: ['ACT', 'INA', 'BLO'], default: 'ACT' })
  @Prop({ required: true, enum: ['ACT', 'INA', 'BLO'], default: 'ACT' })
  status: RoleStatus;

  @ApiProperty({
    type: [String],
    description: 'Permission identifiers',
    default: [],
  })
  @Prop({
    type: [{ type: Types.ObjectId, ref: Permission.name }],
    default: [],
  })
  permissions: Types.ObjectId[] | Permission[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
