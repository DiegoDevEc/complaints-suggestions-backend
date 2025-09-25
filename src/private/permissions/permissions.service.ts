import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from '../../modules/permissions/schemas/permission.schema';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<Permission>,
  ) {}

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const permission = new this.permissionModel({
      ...dto,
      status: dto.status ?? 'ACT',
    });
    await permission.save();
    return permission;
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Record<string, unknown> = {},
  ): Promise<{
    data: Permission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const mongoFilters: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'string') {
        mongoFilters[key] = { $regex: value, $options: 'i' };
      } else {
        mongoFilters[key] = value;
      }
    }

    const query = this.permissionModel
      .find(mongoFilters)
      .skip(skip)
      .limit(limit);
    const [data, total] = await Promise.all([
      query.exec(),
      this.permissionModel.countDocuments(mongoFilters).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionModel.findById(id).exec();
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.permissionModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async remove(id: string): Promise<Permission> {
    const permission = await this.permissionModel
      .findByIdAndUpdate(id, { status: 'INA' }, { new: true })
      .exec();
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }
}
