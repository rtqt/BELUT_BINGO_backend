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
var TelegramAdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramAdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TelegramAdminService = TelegramAdminService_1 = class TelegramAdminService {
    prisma;
    logger = new common_1.Logger(TelegramAdminService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async notifyWithdrawalRequest(withdrawal) {
        this.logger.log(`New withdrawal request: ${withdrawal.id}`);
    }
    async handleApprove(withdrawalId) {
        await this.prisma.transaction.update({
            where: { id: withdrawalId },
            data: { status: 'COMPLETED' },
        });
    }
    async handleReject(withdrawalId) {
        await this.prisma.$transaction(async (tx) => {
            const withdrawal = await tx.transaction.findUnique({
                where: { id: withdrawalId },
            });
            if (!withdrawal || withdrawal.status !== 'PENDING' || !withdrawal.walletId) {
                return;
            }
            await tx.transaction.update({
                where: { id: withdrawalId },
                data: { status: 'REJECTED' },
            });
            await tx.wallet.update({
                where: { id: withdrawal.walletId },
                data: { balance: { increment: withdrawal.amount } },
            });
        });
    }
};
exports.TelegramAdminService = TelegramAdminService;
exports.TelegramAdminService = TelegramAdminService = TelegramAdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelegramAdminService);
//# sourceMappingURL=telegram-admin.service.js.map