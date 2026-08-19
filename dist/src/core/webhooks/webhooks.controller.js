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
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const sms_parser_service_1 = require("./sms-parser/sms-parser.service");
const prisma_service_1 = require("../prisma/prisma.service");
let WebhooksController = class WebhooksController {
    smsParser;
    prisma;
    constructor(smsParser, prisma) {
        this.smsParser = smsParser;
        this.prisma = prisma;
    }
    async handleTelebirrSms(payload) {
        if (!payload || !payload.smsText) {
            throw new common_1.BadRequestException('smsText is required');
        }
        const { amount, transactionId } = this.smsParser.parseTelebirrSms(payload.smsText);
        try {
            await this.prisma.transaction.create({
                data: {
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    amount: parseFloat(amount),
                    externalTxId: transactionId,
                    isClaimed: false
                }
            });
            return { success: true, transactionId };
        }
        catch (error) {
            console.error('Webhook error:', error);
            if (error.code === 'P2002') {
                return { success: true, message: 'Already processed' };
            }
            return { success: false, error: error.message, stack: error.stack, code: error.code };
        }
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Post)('telebirr'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleTelebirrSms", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [sms_parser_service_1.SmsParserService,
        prisma_service_1.PrismaService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map