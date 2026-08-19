import { GamesService } from './games.service';
export declare class GamesResolver {
    private readonly gamesService;
    constructor(gamesService: GamesService);
    getActiveGames(): Promise<{
        entryFee: number;
        id: string;
        status: import("@prisma/client").$Enums.GameStatus;
        name: string;
    }[]>;
}
