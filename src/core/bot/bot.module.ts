import { Module } from '@nestjs/common';
import { TelegramAdminService } from './telegram-admin.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TelegramAdminService],
  exports: [TelegramAdminService],
})
export class BotModule {}
