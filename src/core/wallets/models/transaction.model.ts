import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
export class Transaction {
  @Field(() => ID)
  id: string;

  @Field()
  walletId: string;

  @Field()
  type: string;

  @Field(() => Float)
  amount: number;

  @Field()
  status: string;

  @Field(() => Float, { nullable: true })
  balanceAfter?: number;

  @Field({ nullable: true })
  externalTxId?: string;

  @Field()
  isClaimed: boolean;

  @Field()
  createdAt: Date;
}
