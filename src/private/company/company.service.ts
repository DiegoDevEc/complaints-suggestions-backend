import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company } from '../../modules/company/schemas/company.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
  ) { }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = new this.companyModel(dto);
    return company.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Record<string, unknown> = {},
  ): Promise<{ data: Company[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const mongoFilters: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'string') {
        mongoFilters[key] = { $regex: value, $options: 'i' };
      } else {
        mongoFilters[key] = value;
      }
    }

    const query = this.companyModel
      .find(mongoFilters)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'contacts',
        populate: { path: 'user' }, // 👈 populamos también el User dentro de cada contacto
      });

    const [data, total] = await Promise.all([
      query.exec(),
      this.companyModel.countDocuments(mongoFilters).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyModel.findById(id)
      .populate('contacts').exec();

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.companyModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('contacts')
      .exec();
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async remove(id: string): Promise<Company> {
    const company = await this.companyModel
      .findByIdAndUpdate(id, { status: 'INA' }, { new: true })
      .populate('contacts')
      .exec();
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async addContact(companyId: string, personId: string): Promise<Company> {
    const company = await this.companyModel
      .findByIdAndUpdate(
        companyId,
        { $addToSet: { contacts: new Types.ObjectId(personId) } },
        { new: true },
      )
      .populate({
        path: 'contacts',
        populate: { path: 'user' },
      })
      .exec();
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }
    return company;
  }

  async removeContact(companyId: string, personId: string): Promise<Company> {
    const company = await this.companyModel
      .findByIdAndUpdate(
        companyId,
        { $pull: { contacts: new Types.ObjectId(personId) } },
        { new: true },
      )
      .populate({
        path: 'contacts',
        populate: { path: 'user' },
      })
      .exec();

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return company;
  }
}
