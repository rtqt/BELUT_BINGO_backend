import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { WalletsService } from './wallets.service';
import { WithdrawalsService } from './withdrawals.service';
import { Prisma } from '@prisma/client';
import { Wallet } from './models/wallet.model';
import { Transaction } from './models/transaction.model';

@Resolver(() => Wallet)
export class WalletsResolver {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly withdrawalsService: WithdrawalsService,
  ) {}

  @Query(() => Wallet)
  async getWallet(@Args('userId') userId: string) {
    return this.walletsService.getWallet(userId);
  }

  @Mutation(() => Transaction)
  async deductGameFee(
    @Args('userId') userId: string,
    @Args('amount') amount: number,
    @Args('gameInstanceId') gameInstanceId: string,
  ) {
    return this.walletsService.deductGameFee(
      userId,
      new Prisma.Decimal(amount),
      gameInstanceId,
    );
  }

  @Mutation(() => Wallet)
  async claimDeposit(
    @Args('userId') userId: string,
    @Args('transactionId') transactionId: string,
  ) {
    // The amount is automatically pulled from the existing DB record,
    // we pass 0 here because the signature might require it or we refactor it.
    // Let's refactor walletsService to not require amount.
    return this.walletsService.claimDeposit(userId, transactionId);
  }

  @Mutation(() => Transaction)
  async requestWithdrawal(
    @Args('userId') userId: string,
    @Args('amount') amount: number,
    @Args('phone') phone: string,
  ) {
    return this.withdrawalsService.requestWithdrawal(userId, amount, phone);
  }
}
