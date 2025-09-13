import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './user.schema';
import { PersonalData } from './personal-data.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PersonalData.name)
    private personalDataModel: Model<PersonalData>,
  ) {}

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

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }
}
