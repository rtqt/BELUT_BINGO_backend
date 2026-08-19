"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_1 = require("@nestjs/apollo");
const path_1 = require("path");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./core/prisma/prisma.module");
const users_module_1 = require("./core/users/users.module");
const wallets_module_1 = require("./core/wallets/wallets.module");
const webhooks_module_1 = require("./core/webhooks/webhooks.module");
const redis_module_1 = require("./core/redis/redis.module");
const bot_module_1 = require("./core/bot/bot.module");
const games_module_1 = require("./games/games.module");
const bingo_module_1 = require("./games/bingo/bingo.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            graphql_1.GraphQLModule.forRoot({
                driver: apollo_1.ApolloDriver,
                autoSchemaFile: (0, path_1.join)(process.cwd(), 'src/schema.gql'),
                sortSchema: true,
                playground: true,
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            users_module_1.UsersModule,
            wallets_module_1.WalletsModule,
            webhooks_module_1.WebhooksModule,
            bot_module_1.BotModule,
            games_module_1.GamesModule,
            bingo_module_1.BingoModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map