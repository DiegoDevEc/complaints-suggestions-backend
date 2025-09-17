import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { PersonalData, PersonalDataSchema } from './personal-data.schema';
import { UsersService } from './users.service';
import { Company, CompanySchema } from 'src/modules/company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PersonalData.name, schema: PersonalDataSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
