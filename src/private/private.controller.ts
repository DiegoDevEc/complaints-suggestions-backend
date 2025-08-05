import { Controller, Get, Req } from '@nestjs/common';

@Controller('private')
export class PrivateController {
  @Get('secure')
  getSecure(@Req() req: any) {
    return { message: 'Secure data', user: req.user };
  }
}
