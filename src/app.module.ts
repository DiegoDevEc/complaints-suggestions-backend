import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PublicController } from './public/public.controller';
import { PrivateController } from './private/private.controller';
import { FeedbackModule } from './public/feedback/feedback.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost/complaints-suggestions',
    ),
    AuthModule,
    UsersModule,
    FeedbackModule,
  ],
  controllers: [AppController, PublicController, PrivateController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
