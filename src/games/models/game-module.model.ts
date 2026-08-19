import { Field, ObjectType, Float } from '@nestjs/graphql';

@ObjectType()
export class GameModuleModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => Float)
  entryFee: number;

  @Field(() => String)
  status: string;
}
