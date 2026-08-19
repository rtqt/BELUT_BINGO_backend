import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
export class Wallet {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => Float)
  balance: number;

  @Field(() => Float)
  wagerRequirementBalance: number;

  @Field()
  updatedAt: Date;
}
