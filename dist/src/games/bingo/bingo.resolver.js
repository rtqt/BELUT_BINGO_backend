"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BingoResolver = exports.JoinLobbyResponse = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const telegram_auth_guard_1 = require("../../core/auth/telegram-auth.guard");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const wallets_service_1 = require("../../core/wallets/wallets.service");
const bingo_service_1 = require("./bingo.service");
const ticket_model_1 = require("./models/ticket.model");
const graphql_2 = require("@nestjs/graphql");
let JoinLobbyResponse = class JoinLobbyResponse {
    gameInstanceId;
};
exports.JoinLobbyResponse = JoinLobbyResponse;
__decorate([
    (0, graphql_2.Field)(() => String),
    __metadata("design:type", String)
], JoinLobbyResponse.prototype, "gameInstanceId", void 0);
exports.JoinLobbyResponse = JoinLobbyResponse = __decorate([
    (0, graphql_2.ObjectType)()
], JoinLobbyResponse);
let BingoResolver = class BingoResolver {
    prisma;
    walletsService;
    bingoService;
    constructor(prisma, walletsService, bingoService) {
        this.prisma = prisma;
        this.walletsService = walletsService;
        this.bingoService = bingoService;
    }
    async getMyTicket(gameId, context) {
        const user = context.req.user;
        if (!user || !user.id) {
            throw new common_1.UnauthorizedException('User identity not found in Telegram token');
        }
        const telegramId = user.id.toString();
        const ticket = await this.prisma.ticket.findFirst({
            where: {
                user: { telegramId },
                gameInstanceId: gameId,
            },
            include: { template: true },
        });
        if (!ticket || !ticket.template) {
            throw new common_1.BadRequestException('No active ticket found for this game');
        }
        const rawGrid = ticket.template.gridDefinition;
        const normalizedN = rawGrid.N.map((v) => (v === 'FREE' ? 0 : v));
        return {
            id: ticket.id,
            userId: telegramId,
            gameInstanceId: gameId,
            gridDefinition: {
                B: rawGrid.B,
                I: rawGrid.I,
                N: normalizedN,
                G: rawGrid.G,
                O: rawGrid.O,
            },
        };
    }
    async joinLobby(gameModuleId, context) {
        const user = context.req.user;
        if (!user || !user.id) {
            throw new common_1.UnauthorizedException('User identity not found in Telegram token');
        }
        const userId = user.id.toString();
        const module = await this.prisma.gameModule.findUnique({
            where: { id: gameModuleId },
        });
        if (!module || module.status !== 'LIVE') {
            throw new common_1.BadRequestException('Game module is not available');
        }
        let instance = await this.prisma.gameInstance.findFirst({
            where: { gameModuleId, state: 'LOBBY' },
            orderBy: { createdAt: 'desc' },
        });
        if (!instance) {
            instance = await this.prisma.gameInstance.create({
                data: { gameModuleId, state: 'LOBBY' },
            });
        }
        const userDb = await this.prisma.user.findUnique({
            where: { telegramId: userId },
            include: { wallet: true },
        });
        if (!userDb || !userDb.wallet || userDb.wallet.balance.lessThan(module.entryFee)) {
            throw new common_1.BadRequestException('Insufficient funds to join lobby');
        }
        return {
            gameInstanceId: instance.id,
        };
    }
};
exports.BingoResolver = BingoResolver;
__decorate([
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard),
    (0, graphql_1.Query)(() => ticket_model_1.Ticket),
    __param(0, (0, graphql_1.Args)('gameId')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BingoResolver.prototype, "getMyTicket", null);
__decorate([
    (0, common_1.UseGuards)(telegram_auth_guard_1.TelegramAuthGuard),
    (0, graphql_1.Mutation)(() => JoinLobbyResponse),
    __param(0, (0, graphql_1.Args)('gameModuleId')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BingoResolver.prototype, "joinLobby", null);
exports.BingoResolver = BingoResolver = __decorate([
    (0, graphql_1.Resolver)(() => ticket_model_1.Ticket),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallets_service_1.WalletsService,
        bingo_service_1.BingoService])
], BingoResolver);
//# sourceMappingURL=bingo.resolver.js.map