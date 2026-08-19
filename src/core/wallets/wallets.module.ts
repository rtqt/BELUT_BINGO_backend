import { Module } from '@nestjs/common';
import { WalletsResolver } from './wallets.resolver';
import { WalletsService } from './wallets.service';
import { WithdrawalsService } from './withdrawals.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WalletsResolver, WalletsService, WithdrawalsService],
  exports: [WalletsService, WithdrawalsService],
})
export class WalletsModule {}
