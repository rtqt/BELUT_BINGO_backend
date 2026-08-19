import { PrismaService } from '../../core/prisma/prisma.service';
import { WalletsService } from '../../core/wallets/wallets.service';
import { BingoService } from './bingo.service';
import { Ticket } from './models/ticket.model';
export declare class JoinLobbyResponse {
    gameInstanceId: string;
}
export declare class BingoResolver {
    private readonly prisma;
    private readonly walletsService;
    private readonly bingoService;
    constructor(prisma: PrismaService, walletsService: WalletsService, bingoService: BingoService);
    getMyTicket(gameId: string, context: any): Promise<Ticket>;
    joinLobby(gameModuleId: string, context: any): Promise<JoinLobbyResponse>;
}
