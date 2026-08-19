import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WithdrawalsService {
  constructor(private readonly prisma: PrismaService) {}

  async requestWithdrawal(userId: string, amount: number, phone: string): Promise<any> {
    if (amount < 50) {
      throw new BadRequestException('Minimum withdrawal amount is 50 ETB');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Get the wallet with row-level lock (if needed in real DB)
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      if (wallet.balance.lessThan(amount)) {
        throw new BadRequestException('Insufficient balance');
      }

      // 2. Atomically deduct balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // SECURE CHECK: Rollback the entire transaction if balance dips below 0 (Race Condition Prevention)
      if (updatedWallet.balance.lessThan(0)) {
        throw new BadRequestException('Insufficient balance (Concurrent Request Detected)');
      }

      // 3. Create PENDING transaction
      const withdrawal = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount,
          status: 'PENDING',
          senderPhone: phone,
          balanceAfter: updatedWallet.balance,
        },
      });

      return withdrawal;
    });
  }
}
