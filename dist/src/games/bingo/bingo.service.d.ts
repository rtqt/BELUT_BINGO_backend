import { Redis } from 'ioredis';
import { BingoGateway } from './bingo.gateway';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WalletsService } from '../../core/wallets/wallets.service';
export declare class BingoService {
    private readonly redisClient;
    private readonly gateway;
    private readonly prisma;
    private readonly walletsService;
    constructor(redisClient: Redis, gateway: BingoGateway, prisma: PrismaService, walletsService: WalletsService);
    getTemplateGrid(templateId: number): Promise<any>;
    private normalizeGrid;
    toggleCardReservation(userId: string, lobbyId: string, templateId: number): Promise<{
        action: 'reserved' | 'released';
        templateIds: number[];
    }>;
    getUserCardGrids(userId: string, lobbyId: string): Promise<{
        templateId: number;
        grid: any;
    }[]>;
    private abortCountdownIfNeeded;
    private startCountdown;
    private processLobbyStart;
    private startGameLoop;
    handlePlayerDisconnect(userId: string): Promise<void>;
    trackUserSession(userId: string, lobbyId: string): Promise<void>;
    private drawAndCheckAutoWin;
    private getDbUserId;
    private checkAutoWin;
    claimBingo(telegramId: string, lobbyId: string): Promise<boolean>;
    private processWin;
    drawSecureNumber(gameInstanceId: string): Promise<void>;
    private parseDrawnNumbers;
    private gridToMatrix;
    private checkWinningPattern;
    private mapNumberToLetter;
}
