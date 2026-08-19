import { Resolver, Query } from '@nestjs/graphql';
import { GamesService } from './games.service';
import { GameModuleModel } from './models/game-module.model';

@Resolver(() => GameModuleModel)
export class GamesResolver {
  constructor(private readonly gamesService: GamesService) {}

  @Query(() => [GameModuleModel])
  async getActiveGames() {
    const games = await this.gamesService.getActiveGames();
    return games.map(game => ({
      ...game,
      entryFee: game.entryFee.toNumber(),
    }));
  }
}
