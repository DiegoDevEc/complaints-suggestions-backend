import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './user.schema';
import { PersonalData } from './personal-data.schema';
import { Company } from 'src/modules/company/schemas/company.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
    @InjectModel(PersonalData.name)
    private personalDataModel: Model<PersonalData>,
  ) { }

  async create(
    userData: Partial<User>,
    personalData: Partial<PersonalData>,
  ): Promise<User> {
    const createdUser = new this.userModel(userData);
    await createdUser.save();
    const personal = new this.personalDataModel({
      ...personalData,
      user: createdUser._id,
    });
    await personal.save();
    createdUser.personalData = personal._id as Types.ObjectId;
    return createdUser.save();
  }

  async update(
    id: string,
    userData: Partial<User>,
    personalData: Partial<PersonalData>,
  ): Promise<User | null> {
    const user = await this.userModel.findById(id);
    if (!user) return null;

    // Actualizar usuario
    if (userData) {
      await this.userModel
        .findByIdAndUpdate(id, userData, { new: true, omitUndefined: true }).exec();
    }

    // Actualizar o crear personalData
    if (personalData) {
      if (user.personalData) {
        await this.personalDataModel
          .findByIdAndUpdate(user.personalData, personalData, { new: true }).exec();
      } else {
        const personal = new this.personalDataModel({ ...personalData, user: user._id });
        await personal.save();
        user.personalData = personal._id as Types.ObjectId;
        await user.save();
      }
    }

    return this.userModel.findById(id).populate('personalData').exec();
  }

  async delete(id: string): Promise<User | null> {
    const user = await this.userModel.findById(id);
    if (!user) return null;

    return this.userModel
      .findByIdAndUpdate(id, { status: 'INA' }, { new: true })
      .exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findAllAdmin(
    page = 1,
    limit = 10,
    filters: Record<string, unknown> = {},
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    // 1) Construir filtros base (regex para strings)
    const mongoFilters: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
      mongoFilters[key] =
        typeof value === 'string' ? { $regex: value, $options: 'i' } : value;
    }

    // 3) Filtro final (mismo para find y count)
    const finalFilter: any = { ...mongoFilters };

    // 4) Consulta + conteo con el MISMO filtro
    const [data, total] = await Promise.all([
      this.userModel
        .find(finalFilter)
        .skip(skip)
        .limit(limit)
        .populate('personalData')
        .lean()
        .exec(),
      this.userModel.countDocuments(finalFilter).exec(),
    ]);

    return { data, total, page, limit };
  }
  async findAll(
    page = 1,
    limit = 10,
    filters: Record<string, unknown> = {},
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    // 1) Construir filtros base (regex para strings)
    const mongoFilters: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
      mongoFilters[key] =
        typeof value === 'string' ? { $regex: value, $options: 'i' } : value;
    }

    // 2) Obtener userIds asignados a alguna empresa (contacts -> PersonalData.user)
    const companies = await this.companyModel
      .find({}, 'contacts')
      .populate({ path: 'contacts', select: 'user', options: { lean: true } })
      .lean()
      .exec();

    const assignedUserIds = Array.from(
      new Set(
        companies.reduce((acc: string[], c: any) => {
          const ids = (c.contacts ?? [])
            .map((ct: any) => ct?.user)
            .filter(Boolean)
            .map((id: any) => id.toString());
          return acc.concat(ids);
        }, [])
      )
    );

    // 3) Filtro final (mismo para find y count)
    const finalFilter: any = { role: 'EMPLOYEE', ...mongoFilters };
    if (assignedUserIds.length > 0) {
      finalFilter._id = { $nin: assignedUserIds };
    }

    // 4) Consulta + conteo con el MISMO filtro
    const [data, total] = await Promise.all([
      this.userModel
        .find(finalFilter)
        .skip(skip)
        .limit(limit)
        .populate('personalData')
        .lean()
        .exec(),
      this.userModel.countDocuments(finalFilter).exec(),
    ]);

    return { data, total, page, limit };
  }

}
