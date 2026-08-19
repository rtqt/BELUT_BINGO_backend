import { Module } from '@nestjs/common';
import { BingoGateway } from './bingo.gateway';
import { BingoService } from './bingo.service';
import { BingoResolver } from './bingo.resolver';
import { WalletsModule } from '../../core/wallets/wallets.module';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [WalletsModule, PrismaModule],
  providers: [BingoGateway, BingoService, BingoResolver]
})
export class BingoModule {}
