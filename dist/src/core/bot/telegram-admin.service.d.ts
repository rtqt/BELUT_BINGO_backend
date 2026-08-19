import { PrismaService } from '../prisma/prisma.service';
export declare class TelegramAdminService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    notifyWithdrawalRequest(withdrawal: any): Promise<void>;
    handleApprove(withdrawalId: string): Promise<void>;
    handleReject(withdrawalId: string): Promise<void>;
}
