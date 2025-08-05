import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller('public')
export class PublicController {
  @Public()
  @Get('hello')
  getHello() {
    return { message: 'Hello from public route' };
  }
}
