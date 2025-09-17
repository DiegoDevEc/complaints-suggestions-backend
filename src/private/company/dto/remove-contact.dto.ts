import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RemoveContactDto {
  @ApiProperty()
  @IsString()
  personId: string;
}
