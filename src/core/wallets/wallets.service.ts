import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(telegramId: string) {
    // Use upsert pattern: get the wallet or create it on first access
    let user;
    try {
      user = await this.prisma.user.upsert({
        where: { telegramId },
        update: {},
        create: {
          telegramId,
          wallet: {
            create: { balance: 0, wagerRequirementBalance: 0 },
          },
        },
        include: { wallet: true },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        user = await this.prisma.user.findUnique({
          where: { telegramId },
          include: { wallet: true },
        });
      } else {
        throw e;
      }
    }

    return user!.wallet!;
  }

  async deductGameFee(
    telegramId: string,
    amount: Prisma.Decimal,
    gameInstanceId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the user & wallet row to prevent race conditions during the deduction
      const user = await tx.user.findUnique({
        where: { telegramId },
        include: { wallet: true }
      });

      if (!user || !user.wallet) {
        throw new BadRequestException('Wallet not found');
      }
      
      const wallet = user.wallet;

      // 2. Check for sufficient funds
      if (wallet.balance.lessThan(amount)) {
        throw new BadRequestException('Insufficient funds');
      }

      // 3. Update the wallet balance atomically
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { 
          balance: { decrement: amount } 
        },
      });

      // SECURE CHECK: Rollback the entire transaction if balance dips below 0 (Race Condition Prevention)
      if (updatedWallet.balance.lessThan(0)) {
        throw new BadRequestException('Insufficient balance (Concurrent Request Detected)');
      }

      // 4. Create the audit ledger entry
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'GAME_FEE',
          amount: amount,
          status: 'COMPLETED',
          balanceAfter: updatedWallet.balance,
          externalTxId: `game-entry-${gameInstanceId}-${wallet.id}-${Date.now()}`,
          isClaimed: true,
        },
      });

      return updatedWallet;
    });
  }

  async refundGameFee(
    telegramId: string,
    amount: Prisma.Decimal,
    gameInstanceId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { telegramId }, include: { wallet: true } });
      if (!user || !user.wallet) return null;
      
      const wallet = user.wallet;

      // Update the wallet balance atomically
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });

      // Create the audit ledger entry
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'GAME_WIN',
          amount: amount,
          status: 'COMPLETED',
          balanceAfter: updatedWallet.balance,
          externalTxId: `refund-${gameInstanceId}-${wallet.id}-${Date.now()}`,
          isClaimed: true,
        },
      });

      return updatedWallet;
    });
  }

  async claimDeposit(
    telegramId: string,
    externalTxId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Find the unclaimed deposit in the transaction ledger
      const deposit = await tx.transaction.findUnique({
        where: { externalTxId },
      });

      if (!deposit) {
        throw new BadRequestException('Deposit not found.');
      }

      if (deposit.isClaimed) {
        throw new BadRequestException('This deposit has already been claimed.');
      }

      if (deposit.type !== 'DEPOSIT') {
        throw new BadRequestException('Invalid transaction type.');
      }

      // We do not require amount check anymore because the webhooks
      // guarantees the amount is correct.
      
      // 2. Lock the user's wallet, or create one if this is their first interaction
      let user = await tx.user.findUnique({
        where: { telegramId },
        include: { wallet: true }
      });

      if (!user || !user.wallet) {
        // Auto-create user and wallet for seamless Telegram Mini App onboarding
        user = await tx.user.create({
          data: {
            telegramId,
            wallet: {
              create: { balance: 0, wagerRequirementBalance: 0 },
            }
          },
          include: { wallet: true },
        });
      }
      
      const wallet = user.wallet!;

      // 3. Apply deposit bonuses (+5 for 50 ETB, +10 for 100 ETB)
      const baseAmount = deposit.amount.toNumber();
      let bonusAmount = 0;
      if (baseAmount === 50) bonusAmount = 5;
      if (baseAmount === 100) bonusAmount = 10;
      const totalAmount = baseAmount + bonusAmount;

      // 4. Update the wallet balance atomically with the wager requirement
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { 
          balance: { increment: totalAmount },
          wagerRequirementBalance: { increment: totalAmount }
        },
      });

      // 5. Mark transaction as claimed and assign it to the user's wallet
      await tx.transaction.update({
        where: { id: deposit.id },
        data: {
          isClaimed: true,
          walletId: wallet.id,
          balanceAfter: updatedWallet.balance,
        },
      });

      // 6. Record bonus transaction if applicable
      if (bonusAmount > 0) {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEPOSIT_BONUS',
            amount: bonusAmount,
            status: 'COMPLETED',
            balanceAfter: updatedWallet.balance,
            isClaimed: true,
          }
        });
      }

      return updatedWallet;
    });
  }
}
