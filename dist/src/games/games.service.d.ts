import { PrismaService } from '../core/prisma/prisma.service';
export declare class GamesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getActiveGames(): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.GameStatus;
        name: string;
        entryFee: import("@prisma/client-runtime-utils").Decimal;
    }[]>;
}
