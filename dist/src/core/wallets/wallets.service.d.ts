import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class WalletsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getWallet(telegramId: string): Promise<{
        id: string;
        updatedAt: Date;
        balance: Prisma.Decimal;
        wagerRequirementBalance: Prisma.Decimal;
        userId: string;
    }>;
    deductGameFee(telegramId: string, amount: Prisma.Decimal, gameInstanceId: string): Promise<{
        id: string;
        updatedAt: Date;
        balance: Prisma.Decimal;
        wagerRequirementBalance: Prisma.Decimal;
        userId: string;
    }>;
    refundGameFee(telegramId: string, amount: Prisma.Decimal, gameInstanceId: string): Promise<{
        id: string;
        updatedAt: Date;
        balance: Prisma.Decimal;
        wagerRequirementBalance: Prisma.Decimal;
        userId: string;
    } | null>;
    claimDeposit(telegramId: string, externalTxId: string): Promise<{
        id: string;
        updatedAt: Date;
        balance: Prisma.Decimal;
        wagerRequirementBalance: Prisma.Decimal;
        userId: string;
    }>;
}
