import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '../../modules/permissions/schemas/permission.schema';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@ApiTags('Permissions')
@Controller('private/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create permission' })
  @ApiBody({ type: CreatePermissionDto })
  create(@Body() dto: CreatePermissionDto): Promise<Permission> {
    return this.permissionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List permissions with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: Record<string, unknown>) {
    const { page = 1, limit = 10, ...filters } = query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    return this.permissionsService.findAll(pageNumber, limitNumber, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by id' })
  findOne(@Param('id') id: string): Promise<Permission> {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update permission' })
  @ApiBody({ type: UpdatePermissionDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<Permission> {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete permission (soft delete to INA status)' })
  remove(@Param('id') id: string): Promise<Permission> {
    return this.permissionsService.remove(id);
  }
}
