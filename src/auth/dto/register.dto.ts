import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../users/role.enum';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;
}
