import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../../modules/roles/schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const { permissions = [], status = 'ACT', ...rest } = dto;
    const role = new this.roleModel({
      ...rest,
      status,
      permissions: permissions.map((id) => new Types.ObjectId(id)),
    });
    await role.save();
    await role.populate('permissions');
    return role;
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Record<string, unknown> = {},
  ): Promise<{ data: Role[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const mongoFilters: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'permissions' && value) {
        const ids = Array.isArray(value) ? value : [value];
        mongoFilters[key] = {
          $all: ids.map((id) => new Types.ObjectId(String(id))),
        };
        continue;
      }
      if (typeof value === 'string') {
        mongoFilters[key] = { $regex: value, $options: 'i' };
      } else {
        mongoFilters[key] = value;
      }
    }

    const query = this.roleModel
      .find(mongoFilters)
      .skip(skip)
      .limit(limit)
      .populate('permissions');

    const [data, total] = await Promise.all([
      query.exec(),
      this.roleModel.countDocuments(mongoFilters).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleModel
      .findById(id)
      .populate('permissions')
      .exec();
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const updateData: Record<string, unknown> = { ...dto };

    if (dto.permissions) {
      updateData.permissions = dto.permissions.map((permissionId) =>
        new Types.ObjectId(permissionId),
      );
    }

    const role = await this.roleModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
      .populate('permissions')
      .exec();

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async remove(id: string): Promise<Role> {
    const role = await this.roleModel
      .findByIdAndUpdate(id, { status: 'INA' }, { new: true })
      .populate('permissions')
      .exec();
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }
}
