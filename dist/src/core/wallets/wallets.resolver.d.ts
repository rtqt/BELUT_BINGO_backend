import { WalletsService } from './wallets.service';
import { WithdrawalsService } from './withdrawals.service';
import { Prisma } from '@prisma/client';
export declare class WalletsResolver {
    private readonly walletsService;
    private readonly withdrawalsService;
    constructor(walletsService: WalletsService, withdrawalsService: WithdrawalsService);
    getWallet(userId: string): Promise<{
        id: string;
        updatedAt: Date;
        balance: Prisma.Decimal;
        wagerRequirementBalance: Prisma.Decimal;
        userId: string;
    }>;
    deductGameFee(userId: string, amount: number, gameInstanceId: string): Promise<{
        id: string;
        updatedAt: Date;
        balance: Prisma.Decimal;
        wagerRequirementBalance: Prisma.Decimal;
        userId: string;
    }>;
    claimDeposit(userId: string, transactionId: string): Promise<{
        id: string;
        updatedAt: Date;
        balance: Prisma.Decimal;
        wagerRequirementBalance: Prisma.Decimal;
        userId: string;
    }>;
    requestWithdrawal(userId: string, amount: number, phone: string): Promise<any>;
}
