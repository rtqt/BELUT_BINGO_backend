import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesResolver } from './games.resolver';
import { PrismaModule } from '../core/prisma/prisma.module';
import { BingoModule } from './bingo/bingo.module';

@Module({
  imports: [PrismaModule, BingoModule],
  providers: [GamesService, GamesResolver],
})
export class GamesModule {}
