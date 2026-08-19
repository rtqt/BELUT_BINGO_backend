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
exports.WithdrawalsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WithdrawalsService = class WithdrawalsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async requestWithdrawal(userId, amount, phone) {
        if (amount < 50) {
            throw new common_1.BadRequestException('Minimum withdrawal amount is 50 ETB');
        }
        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({
                where: { userId },
            });
            if (!wallet) {
                throw new common_1.BadRequestException('Wallet not found');
            }
            if (wallet.balance.lessThan(amount)) {
                throw new common_1.BadRequestException('Insufficient balance');
            }
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } },
            });
            if (updatedWallet.balance.lessThan(0)) {
                throw new common_1.BadRequestException('Insufficient balance (Concurrent Request Detected)');
            }
            const withdrawal = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'WITHDRAWAL',
                    amount,
                    status: 'PENDING',
                    senderPhone: phone,
                    balanceAfter: updatedWallet.balance,
                },
            });
            return withdrawal;
        });
    }
};
exports.WithdrawalsService = WithdrawalsService;
exports.WithdrawalsService = WithdrawalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WithdrawalsService);
//# sourceMappingURL=withdrawals.service.js.map