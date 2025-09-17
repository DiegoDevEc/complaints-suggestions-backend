import { UsersService } from './../users/users.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Role } from '../users/role.enum';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiQuery, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    const { subject, html, text } = this.buildCredentialsEmailTemplate(
      dto.username,
      dto.password,
    );
    try {
      await this.notificationsService.sendEmail({
        to: dto.email,
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de credenciales a ${dto.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('users/:id')
  update(@Param('id') id: string, @Body() dto: RegisterDto) {
    return this.authService.updateUser(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('users/:id')
  delete(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('users')
  @ApiOperation({
    summary: 'Lista de usuarios con paginación y filtros',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllUsersAdmin(@Query() query: Record<string, unknown>) {
    const { page = 1, limit = 10, ...filters } = query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    return this.usersService.findAllAdmin(pageNumber, limitNumber, filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('users/not-assigned')
  @ApiOperation({
    summary: 'Lista de usuarios con paginación y filtros',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllUsers(@Query() query: Record<string, unknown>) {
    const { page = 1, limit = 10, ...filters } = query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    return this.usersService.findAll(pageNumber, limitNumber, filters);
  }

  private buildCredentialsEmailTemplate(username: string, password: string) {
    const subject = 'Credenciales de acceso';
    const html = `
      <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
        <h2>Bienvenido a Complaints & Suggestions</h2>
        <p>Tu cuenta ha sido creada correctamente. Estas son tus credenciales de acceso:</p>
        <ul>
          <li><strong>Usuario:</strong> ${username}</li>
          <li><strong>Contraseña:</strong> ${password}</li>
        </ul>
        <p>Te recomendamos iniciar sesión y actualizar tu contraseña cuanto antes.</p>
        <p>Si tú no solicitaste este registro, contacta con el administrador.</p>
      </div>
    `;
    const text = [
      'Bienvenido a Complaints & Suggestions',
      '',
      'Tu cuenta ha sido creada correctamente.',
      `Usuario: ${username}`,
      `Contraseña: ${password}`,
      '',
      'Te recomendamos iniciar sesión y actualizar tu contraseña cuanto antes.',
    ].join('\n');
    return { subject, html, text };
  }
}
