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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WalletsService = class WalletsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWallet(telegramId) {
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
        }
        catch (e) {
            if (e.code === 'P2002') {
                user = await this.prisma.user.findUnique({
                    where: { telegramId },
                    include: { wallet: true },
                });
            }
            else {
                throw e;
            }
        }
        return user.wallet;
    }
    async deductGameFee(telegramId, amount, gameInstanceId) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { telegramId },
                include: { wallet: true }
            });
            if (!user || !user.wallet) {
                throw new common_1.BadRequestException('Wallet not found');
            }
            const wallet = user.wallet;
            if (wallet.balance.lessThan(amount)) {
                throw new common_1.BadRequestException('Insufficient funds');
            }
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { decrement: amount }
                },
            });
            if (updatedWallet.balance.lessThan(0)) {
                throw new common_1.BadRequestException('Insufficient balance (Concurrent Request Detected)');
            }
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
    async refundGameFee(telegramId, amount, gameInstanceId) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { telegramId }, include: { wallet: true } });
            if (!user || !user.wallet)
                return null;
            const wallet = user.wallet;
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } },
            });
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
    async claimDeposit(telegramId, externalTxId) {
        return this.prisma.$transaction(async (tx) => {
            const deposit = await tx.transaction.findUnique({
                where: { externalTxId },
            });
            if (!deposit) {
                throw new common_1.BadRequestException('Deposit not found.');
            }
            if (deposit.isClaimed) {
                throw new common_1.BadRequestException('This deposit has already been claimed.');
            }
            if (deposit.type !== 'DEPOSIT') {
                throw new common_1.BadRequestException('Invalid transaction type.');
            }
            let user = await tx.user.findUnique({
                where: { telegramId },
                include: { wallet: true }
            });
            if (!user || !user.wallet) {
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
            const wallet = user.wallet;
            const baseAmount = deposit.amount.toNumber();
            let bonusAmount = 0;
            if (baseAmount === 50)
                bonusAmount = 5;
            if (baseAmount === 100)
                bonusAmount = 10;
            const totalAmount = baseAmount + bonusAmount;
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { increment: totalAmount },
                    wagerRequirementBalance: { increment: totalAmount }
                },
            });
            await tx.transaction.update({
                where: { id: deposit.id },
                data: {
                    isClaimed: true,
                    walletId: wallet.id,
                    balanceAfter: updatedWallet.balance,
                },
            });
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
};
exports.WalletsService = WalletsService;
exports.WalletsService = WalletsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletsService);
//# sourceMappingURL=wallets.service.js.map