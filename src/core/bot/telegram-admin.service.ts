import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramAdminService {
  private readonly logger = new Logger(TelegramAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notifyWithdrawalRequest(withdrawal: any) {
    // Telegraf UI integration will go here
    this.logger.log(`New withdrawal request: ${withdrawal.id}`);
  }

  async handleApprove(withdrawalId: string) {
    await this.prisma.transaction.update({
      where: { id: withdrawalId },
      data: { status: 'COMPLETED' },
    });
  }

  async handleReject(withdrawalId: string) {
    await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.transaction.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal || withdrawal.status !== 'PENDING' || !withdrawal.walletId) {
        return;
      }

      await tx.transaction.update({
        where: { id: withdrawalId },
        data: { status: 'REJECTED' },
      });

      await tx.wallet.update({
        where: { id: withdrawal.walletId },
        data: { balance: { increment: withdrawal.amount } },
      });
    });
  }
}
