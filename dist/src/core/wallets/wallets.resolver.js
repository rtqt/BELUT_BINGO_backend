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
exports.WalletsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const wallets_service_1 = require("./wallets.service");
const withdrawals_service_1 = require("./withdrawals.service");
const client_1 = require("@prisma/client");
const wallet_model_1 = require("./models/wallet.model");
const transaction_model_1 = require("./models/transaction.model");
let WalletsResolver = class WalletsResolver {
    walletsService;
    withdrawalsService;
    constructor(walletsService, withdrawalsService) {
        this.walletsService = walletsService;
        this.withdrawalsService = withdrawalsService;
    }
    async getWallet(userId) {
        return this.walletsService.getWallet(userId);
    }
    async deductGameFee(userId, amount, gameInstanceId) {
        return this.walletsService.deductGameFee(userId, new client_1.Prisma.Decimal(amount), gameInstanceId);
    }
    async claimDeposit(userId, transactionId) {
        return this.walletsService.claimDeposit(userId, transactionId);
    }
    async requestWithdrawal(userId, amount, phone) {
        return this.withdrawalsService.requestWithdrawal(userId, amount, phone);
    }
};
exports.WalletsResolver = WalletsResolver;
__decorate([
    (0, graphql_1.Query)(() => wallet_model_1.Wallet),
    __param(0, (0, graphql_1.Args)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WalletsResolver.prototype, "getWallet", null);
__decorate([
    (0, graphql_1.Mutation)(() => transaction_model_1.Transaction),
    __param(0, (0, graphql_1.Args)('userId')),
    __param(1, (0, graphql_1.Args)('amount')),
    __param(2, (0, graphql_1.Args)('gameInstanceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", Promise)
], WalletsResolver.prototype, "deductGameFee", null);
__decorate([
    (0, graphql_1.Mutation)(() => wallet_model_1.Wallet),
    __param(0, (0, graphql_1.Args)('userId')),
    __param(1, (0, graphql_1.Args)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WalletsResolver.prototype, "claimDeposit", null);
__decorate([
    (0, graphql_1.Mutation)(() => transaction_model_1.Transaction),
    __param(0, (0, graphql_1.Args)('userId')),
    __param(1, (0, graphql_1.Args)('amount')),
    __param(2, (0, graphql_1.Args)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", Promise)
], WalletsResolver.prototype, "requestWithdrawal", null);
exports.WalletsResolver = WalletsResolver = __decorate([
    (0, graphql_1.Resolver)(() => wallet_model_1.Wallet),
    __metadata("design:paramtypes", [wallets_service_1.WalletsService,
        withdrawals_service_1.WithdrawalsService])
], WalletsResolver);
//# sourceMappingURL=wallets.resolver.js.map