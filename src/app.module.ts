import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/prisma/prisma.module';
import { UsersModule } from './core/users/users.module';
import { WalletsModule } from './core/wallets/wallets.module';
import { WebhooksModule } from './core/webhooks/webhooks.module';
import { RedisModule } from './core/redis/redis.module';
import { BotModule } from './core/bot/bot.module';
import { GamesModule } from './games/games.module';
import { BingoModule } from './games/bingo/bingo.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true, // Useful during development
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    WalletsModule,
    WebhooksModule,
    BotModule,
    GamesModule,
    BingoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
