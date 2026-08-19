import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';
import { GameStatus } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveGames() {
    return this.prisma.gameModule.findMany({
      where: {
        status: {
          in: [GameStatus.LIVE, GameStatus.DEMO]
        }
      }
    });
  }
}
