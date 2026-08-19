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
exports.BingoService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const crypto_1 = require("crypto");
const amharic_tts_util_1 = require("./amharic-tts.util");
const bingo_gateway_1 = require("./bingo.gateway");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const wallets_service_1 = require("../../core/wallets/wallets.service");
const bingo_matrix_util_1 = require("./bingo.matrix.util");
const MAX_CARDS_PER_PLAYER = 10;
const AUTO_FEATURE_THRESHOLD = 3;
const RESERVATION_TTL = 600;
let BingoService = class BingoService {
    redisClient;
    gateway;
    prisma;
    walletsService;
    constructor(redisClient, gateway, prisma, walletsService) {
        this.redisClient = redisClient;
        this.gateway = gateway;
        this.prisma = prisma;
        this.walletsService = walletsService;
    }
    async getTemplateGrid(templateId) {
        const template = await this.prisma.cardTemplate.findUnique({ where: { id: templateId } });
        if (!template)
            throw new common_1.BadRequestException('Template not found');
        return this.normalizeGrid(template.gridDefinition);
    }
    normalizeGrid(grid) {
        const g = { ...grid };
        if (g.N && Array.isArray(g.N)) {
            g.N = g.N.map((val) => (val === 'FREE' ? 0 : val));
        }
        return g;
    }
    async toggleCardReservation(userId, lobbyId, templateId) {
        const cardOwnerKey = `reserve:${lobbyId}:${templateId}`;
        const userCardsKey = `usercards:${lobbyId}:${userId}`;
        const playersKey = `players:${lobbyId}`;
        const existingOwner = await this.redisClient.get(cardOwnerKey);
        if (existingOwner && existingOwner !== userId) {
            throw new common_1.BadRequestException('Card is already reserved by another player');
        }
        const alreadySelected = await this.redisClient.sismember(userCardsKey, templateId.toString());
        if (alreadySelected) {
            await this.redisClient.srem(userCardsKey, templateId.toString());
            await this.redisClient.del(cardOwnerKey);
            const remaining = await this.redisClient.scard(userCardsKey);
            if (remaining === 0) {
                await this.redisClient.srem(playersKey, userId);
                const playerCount = await this.redisClient.scard(playersKey);
                if (playerCount < 2) {
                    await this.abortCountdownIfNeeded(lobbyId);
                }
            }
        }
        else {
            const currentCount = await this.redisClient.scard(userCardsKey);
            if (currentCount >= MAX_CARDS_PER_PLAYER) {
                throw new common_1.BadRequestException(`You can only select up to ${MAX_CARDS_PER_PLAYER} cards`);
            }
            await this.redisClient.set(cardOwnerKey, userId, 'EX', RESERVATION_TTL);
            await this.redisClient.sadd(userCardsKey, templateId.toString());
            await this.redisClient.expire(userCardsKey, RESERVATION_TTL);
            await this.redisClient.sadd(playersKey, userId);
            await this.redisClient.expire(playersKey, RESERVATION_TTL);
            const playerCount = await this.redisClient.scard(playersKey);
            if (playerCount >= 2) {
                this.startCountdown(lobbyId);
            }
        }
        const updatedCards = await this.redisClient.smembers(userCardsKey);
        const templateIds = updatedCards.map(id => parseInt(id, 10));
        return {
            action: alreadySelected ? 'released' : 'reserved',
            templateIds,
        };
    }
    async getUserCardGrids(userId, lobbyId) {
        const userCardsKey = `usercards:${lobbyId}:${userId}`;
        const ids = await this.redisClient.smembers(userCardsKey);
        const results = [];
        for (const idStr of ids) {
            const templateId = parseInt(idStr, 10);
            const grid = await this.getTemplateGrid(templateId);
            results.push({ templateId, grid });
        }
        return results;
    }
    async abortCountdownIfNeeded(lobbyId) {
        const stateKey = `state:${lobbyId}`;
        const currentState = await this.redisClient.get(stateKey);
        if (currentState !== 'COUNTDOWN')
            return;
        await this.redisClient.set(stateKey, 'LOBBY');
        await this.prisma.gameInstance.update({
            where: { id: lobbyId },
            data: { state: 'LOBBY' },
        });
        this.gateway.server.to(lobbyId).emit('gameState', {
            state: 'LOBBY',
            message: 'Countdown aborted. Waiting for more players.',
            drawnNumbers: [],
        });
    }
    async startCountdown(lobbyId) {
        const stateKey = `state:${lobbyId}`;
        const currentState = await this.redisClient.get(stateKey);
        if (currentState && currentState !== 'LOBBY')
            return;
        await this.redisClient.set(stateKey, 'COUNTDOWN');
        await this.prisma.gameInstance.update({
            where: { id: lobbyId },
            data: { state: 'COUNTDOWN' },
        });
        let secondsLeft = 40;
        const interval = setInterval(async () => {
            const state = await this.redisClient.get(stateKey);
            if (state !== 'COUNTDOWN') {
                clearInterval(interval);
                return;
            }
            secondsLeft--;
            this.gateway.server.to(lobbyId).emit('gameState', {
                state: 'COUNTDOWN',
                countdown: secondsLeft,
                drawnNumbers: [],
            });
            if (secondsLeft <= 0) {
                clearInterval(interval);
                this.processLobbyStart(lobbyId);
            }
        }, 1000);
    }
    async processLobbyStart(lobbyId) {
        const playersKey = `players:${lobbyId}`;
        const activePlayers = await this.redisClient.smembers(playersKey);
        const instance = await this.prisma.gameInstance.findUnique({
            where: { id: lobbyId },
            include: { module: true },
        });
        if (!instance)
            return;
        for (const userId of activePlayers) {
            const userCardsKey = `usercards:${lobbyId}:${userId}`;
            const cardIds = await this.redisClient.smembers(userCardsKey);
            if (cardIds.length === 0) {
                this.gateway.server.to(lobbyId).emit('lobbyKick', { userId, reason: 'No card selected' });
                await this.redisClient.srem(playersKey, userId);
                continue;
            }
            const templateIds = cardIds.map(id => parseInt(id, 10));
            const totalFee = instance.module.entryFee.mul(templateIds.length);
            try {
                await this.walletsService.deductGameFee(userId, totalFee, lobbyId);
                const dbUser = await this.prisma.user.findUnique({
                    where: { telegramId: userId },
                    include: { tickets: { select: { id: true } } },
                });
                if (dbUser && dbUser.tickets.length === 0 && dbUser.referredById) {
                    await this.prisma.$transaction(async (tx) => {
                        const referrerWallet = await tx.wallet.findUnique({
                            where: { userId: dbUser.referredById },
                        });
                        if (referrerWallet) {
                            const updatedWallet = await tx.wallet.update({
                                where: { id: referrerWallet.id },
                                data: { balance: { increment: 5 } },
                            });
                            await tx.transaction.create({
                                data: {
                                    walletId: referrerWallet.id,
                                    type: 'REFERRAL_BONUS',
                                    amount: 5,
                                    status: 'COMPLETED',
                                    balanceAfter: updatedWallet.balance,
                                },
                            });
                        }
                    });
                }
                await this.prisma.gameInstance.update({
                    where: { id: lobbyId },
                    data: { totalPrizePool: { increment: totalFee } },
                });
                for (const templateId of templateIds) {
                    await this.prisma.ticket.create({
                        data: {
                            user: { connect: { telegramId: userId } },
                            instance: { connect: { id: lobbyId } },
                            template: { connect: { id: templateId } },
                        },
                    });
                }
                const autoEnabled = templateIds.length >= AUTO_FEATURE_THRESHOLD;
                if (autoEnabled) {
                    await this.redisClient.set(`auto:${lobbyId}:${userId}`, '1');
                }
                await this.redisClient.sadd(`active:${lobbyId}`, userId);
                this.gateway.server.to(lobbyId).emit('playerConfirmed', {
                    userId,
                    cardCount: templateIds.length,
                    autoEnabled,
                });
            }
            catch (e) {
                this.gateway.server.to(lobbyId).emit('lobbyKick', { userId, reason: 'Insufficient funds' });
                await this.redisClient.srem(playersKey, userId);
            }
        }
        const activeCount = await this.redisClient.scard(`active:${lobbyId}`);
        if (activeCount > 0) {
            this.startGameLoop(lobbyId);
        }
        else {
            await this.redisClient.set(`state:${lobbyId}`, 'LOBBY');
            await this.prisma.gameInstance.update({
                where: { id: lobbyId },
                data: { state: 'LOBBY' },
            });
            this.gateway.server.to(lobbyId).emit('gameState', {
                state: 'LOBBY',
                message: 'Game aborted — not enough players.',
                drawnNumbers: [],
            });
        }
    }
    async startGameLoop(lobbyId) {
        const stateKey = `state:${lobbyId}`;
        await this.redisClient.set(stateKey, 'IN_PROGRESS');
        await this.prisma.gameInstance.update({
            where: { id: lobbyId },
            data: { state: 'IN_PROGRESS', startedAt: new Date() },
        });
        this.gateway.server.to(lobbyId).emit('gameState', { state: 'IN_PROGRESS', drawnNumbers: [] });
        const loopInterval = setInterval(async () => {
            const currentState = await this.redisClient.get(stateKey);
            if (currentState !== 'IN_PROGRESS') {
                clearInterval(loopInterval);
                return;
            }
            await this.drawAndCheckAutoWin(lobbyId);
        }, 4000);
    }
    async handlePlayerDisconnect(userId) {
        const userSessionKey = `session:${userId}`;
        const lobbyId = await this.redisClient.get(userSessionKey);
        if (!lobbyId)
            return;
        const stateKey = `state:${lobbyId}`;
        const currentState = await this.redisClient.get(stateKey);
        if (!currentState || currentState === 'LOBBY' || currentState === 'COUNTDOWN') {
            const userCardsKey = `usercards:${lobbyId}:${userId}`;
            const cardIds = await this.redisClient.smembers(userCardsKey);
            for (const cardId of cardIds) {
                await this.redisClient.del(`reserve:${lobbyId}:${cardId}`);
            }
            await this.redisClient.del(userCardsKey);
            await this.redisClient.srem(`players:${lobbyId}`, userId);
            const playerCount = await this.redisClient.scard(`players:${lobbyId}`);
            if (playerCount < 2) {
                await this.abortCountdownIfNeeded(lobbyId);
            }
            console.log(`Cleared reservations for disconnected user ${userId} in lobby ${lobbyId}`);
        }
        await this.redisClient.del(userSessionKey);
    }
    async trackUserSession(userId, lobbyId) {
        await this.redisClient.set(`session:${userId}`, lobbyId, 'EX', 3600);
    }
    async drawAndCheckAutoWin(lobbyId) {
        const drawnSetKey = `drawn:${lobbyId}`;
        let isUnique = false;
        let drawnNum = 0;
        while (!isUnique) {
            drawnNum = (0, crypto_1.randomInt)(1, 76);
            const exists = await this.redisClient.sismember(drawnSetKey, drawnNum.toString());
            if (exists === 0) {
                await this.redisClient.sadd(drawnSetKey, drawnNum.toString());
                isUnique = true;
            }
        }
        const bingoString = this.mapNumberToLetter(drawnNum);
        const audioUrl = amharic_tts_util_1.AmharicTtsUtil.getAudioUrl(bingoString);
        if (this.gateway) {
            this.gateway.broadcastNumber(lobbyId, bingoString, audioUrl);
        }
        const activeUsers = await this.redisClient.smembers(`active:${lobbyId}`);
        const autoWinners = [];
        for (const userId of activeUsers) {
            const hasAuto = await this.redisClient.get(`auto:${lobbyId}:${userId}`);
            if (hasAuto) {
                const won = await this.checkAutoWin(userId, lobbyId);
                if (won)
                    autoWinners.push(userId);
            }
        }
        if (autoWinners.length > 0) {
            await this.processWin(autoWinners, lobbyId);
        }
    }
    async getDbUserId(telegramId) {
        const user = await this.prisma.user.findUnique({
            where: { telegramId },
            select: { id: true },
        });
        return user?.id ?? null;
    }
    async checkAutoWin(telegramId, lobbyId) {
        const drawnSetKey = `drawn:${lobbyId}`;
        const drawnNumbers = await this.redisClient.smembers(drawnSetKey);
        const dbUserId = await this.getDbUserId(telegramId);
        if (!dbUserId)
            return false;
        const tickets = await this.prisma.ticket.findMany({
            where: { userId: dbUserId, gameInstanceId: lobbyId },
            include: { template: true },
        });
        if (tickets.length < 3)
            return false;
        for (const ticket of tickets) {
            if (!ticket.template)
                continue;
            const grid = this.normalizeGrid(ticket.template.gridDefinition);
            const matrix = this.gridToMatrix(grid);
            const drawnInts = this.parseDrawnNumbers(drawnNumbers);
            const won = bingo_matrix_util_1.BingoMatrixUtil.checkWinningPattern(matrix, drawnInts);
            if (won) {
                return true;
            }
        }
        return false;
    }
    async claimBingo(telegramId, lobbyId) {
        const drawnSetKey = `drawn:${lobbyId}`;
        const drawnNumbers = await this.redisClient.smembers(drawnSetKey);
        const dbUserId = await this.getDbUserId(telegramId);
        if (!dbUserId)
            throw new common_1.BadRequestException('User not found');
        const tickets = await this.prisma.ticket.findMany({
            where: { userId: dbUserId, gameInstanceId: lobbyId },
            include: { template: true },
        });
        if (!tickets.length) {
            throw new common_1.BadRequestException('No active tickets found');
        }
        const drawnInts = this.parseDrawnNumbers(drawnNumbers);
        for (const ticket of tickets) {
            if (!ticket.template)
                continue;
            const grid = this.normalizeGrid(ticket.template.gridDefinition);
            const matrix = this.gridToMatrix(grid);
            const won = bingo_matrix_util_1.BingoMatrixUtil.checkWinningPattern(matrix, drawnInts);
            if (won) {
                await this.processWin([telegramId], lobbyId);
                return true;
            }
        }
        await this.redisClient.srem(`active:${lobbyId}`, telegramId);
        this.gateway.server.to(lobbyId).emit('falseBingo', { userId: telegramId });
        throw new common_1.BadRequestException('False Bingo! You have been removed from the game.');
    }
    async processWin(userIds, lobbyId) {
        const stateKey = `state:${lobbyId}`;
        const alreadyFinished = await this.redisClient.get(stateKey);
        if (alreadyFinished === 'FINISHED')
            return;
        await this.redisClient.set(stateKey, 'FINISHED');
        const instance = await this.prisma.gameInstance.findUnique({ where: { id: lobbyId } });
        if (instance && userIds.length > 0) {
            const prizePool = instance.totalPrizePool;
            const houseRake = prizePool.mul(0.15);
            const payout = prizePool.sub(houseRake).div(userIds.length);
            for (const winnerId of userIds) {
                await this.walletsService.refundGameFee(winnerId, payout, lobbyId);
            }
            await this.prisma.gameInstance.update({
                where: { id: lobbyId },
                data: {
                    state: 'FINISHED',
                    finishedAt: new Date(),
                    houseRevenue: houseRake,
                },
            });
        }
        this.gateway.server.to(lobbyId).emit('gameState', {
            state: 'FINISHED',
            winnerId: userIds[0],
        });
    }
    async drawSecureNumber(gameInstanceId) {
        await this.drawAndCheckAutoWin(gameInstanceId);
    }
    parseDrawnNumbers(drawnNumbers) {
        return drawnNumbers.map(str => parseInt(str, 10)).filter(n => !isNaN(n));
    }
    gridToMatrix(grid) {
        const matrix = [];
        for (let i = 0; i < 5; i++) {
            matrix.push([
                grid.B[i],
                grid.I[i],
                grid.N[i] === 0 ? 'FREE' : grid.N[i],
                grid.G[i],
                grid.O[i],
            ]);
        }
        return matrix;
    }
    async checkWinningPattern(ticketId, drawnNumbers) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { template: true },
        });
        if (!ticket || !ticket.template)
            return false;
        const grid = this.normalizeGrid(ticket.template.gridDefinition);
        const matrix = this.gridToMatrix(grid);
        const drawnInts = this.parseDrawnNumbers(drawnNumbers);
        return bingo_matrix_util_1.BingoMatrixUtil.checkWinningPattern(matrix, drawnInts);
    }
    mapNumberToLetter(num) {
        if (num <= 15)
            return `B-${num}`;
        if (num <= 30)
            return `I-${num}`;
        if (num <= 45)
            return `N-${num}`;
        if (num <= 60)
            return `G-${num}`;
        return `O-${num}`;
    }
};
exports.BingoService = BingoService;
exports.BingoService = BingoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => bingo_gateway_1.BingoGateway))),
    __metadata("design:paramtypes", [ioredis_1.Redis,
        bingo_gateway_1.BingoGateway,
        prisma_service_1.PrismaService,
        wallets_service_1.WalletsService])
], BingoService);
//# sourceMappingURL=bingo.service.js.map