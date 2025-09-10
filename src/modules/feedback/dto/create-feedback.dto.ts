import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsString,
} from 'class-validator';
import { FeedbackType } from '../feedback-type.enum';

export class CreateFeedbackDto {
  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ enum: FeedbackType })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty()
  @IsBooleanString()
  contacted: boolean;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiProperty()
  @IsString()
  address: string;
}
