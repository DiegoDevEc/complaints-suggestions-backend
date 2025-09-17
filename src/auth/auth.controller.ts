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
  ) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    const { subject, html } = this.buildCredentialsEmailTemplate(
      dto.username,
      dto.password,
    );
    try {
      await this.notificationsService.sendEmail({
        to: dto.email,
        subject,
        html,
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
    const subject = '🎉 Bienvenido a Complaints & Suggestions';

    const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px; color: #333;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden;">
        
        <div style="background-color: #2563eb; color: white; padding: 16px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">Bienvenido al Sistema Quejas y Sugerencias</h1>
        </div>

        <div style="padding: 24px;">
          <p style="font-size: 16px; margin-bottom: 16px;">
            ¡Hola! 👋<br>
            Tu cuenta ha sido creada correctamente. Aquí tienes tus credenciales de acceso:
          </p>

          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 15px;">
              <strong>Usuario:</strong> <span style="color: #111827;">${username}</span><br>
              <strong>Contraseña:</strong> <span style="color: #111827;">${password}</span>
            </p>
          </div>

          <p style="font-size: 15px; margin-bottom: 12px;">
            🔑 Te recomendamos iniciar sesión y actualizar tu contraseña cuanto antes para mayor seguridad.
          </p>

          <p style="font-size: 14px; color: #6b7280;">
            Si tú no solicitaste este registro, por favor contacta con el administrador.
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 12px; text-align: center; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} Complaints & Suggestions · Todos los derechos reservados
        </div>
      </div>
    </div>
  `;
    return { subject, html };
  }
}
