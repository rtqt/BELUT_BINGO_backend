import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BingoGrid {
  @Field(() => [Int])
  B: number[];

  @Field(() => [Int])
  I: number[];

  @Field(() => [Int])
  N: number[];

  @Field(() => [Int])
  G: number[];

  @Field(() => [Int])
  O: number[];
}

@ObjectType()
export class Ticket {
  @Field(() => String)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  gameInstanceId: string;

  @Field(() => BingoGrid)
  gridDefinition: BingoGrid;
}
