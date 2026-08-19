import { PrismaService } from '../prisma/prisma.service';
export declare class WithdrawalsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    requestWithdrawal(userId: string, amount: number, phone: string): Promise<any>;
}
