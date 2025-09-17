import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddContactDto {
  @ApiProperty()
  @IsString()
  personId: string;
}
