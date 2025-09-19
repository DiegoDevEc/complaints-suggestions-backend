import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FeedbackCompanyRequestDto {
  @ApiProperty({ description: 'ID of the company to assign feedback to' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'name of the company to assign feedback to' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'description of the company to assign feedback to',
  })
  @IsString()
  description: string;
}
