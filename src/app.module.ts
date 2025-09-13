import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { FeedbackModule as PrivateFeedbackModule } from './private/feedback/feedback.module';
import { CompanyModule } from './private/company/company.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost/complaints-suggestions',
    ),
    AuthModule,
    UsersModule,
    FeedbackModule,
    PrivateFeedbackModule,
    CompanyModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
