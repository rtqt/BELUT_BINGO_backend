"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsParserService = void 0;
const common_1 = require("@nestjs/common");
let SmsParserService = class SmsParserService {
    parseTelebirrSms(smsText) {
        const amountRegex = /received ETB (\d+(?:\.\d+)?)/i;
        const amountMatch = smsText.match(amountRegex);
        if (!amountMatch || !amountMatch[1]) {
            throw new common_1.BadRequestException('Invalid SMS format: Could not extract amount.');
        }
        const txRegex = /transaction number is ([A-Z0-9]+)\./i;
        const txMatch = smsText.match(txRegex);
        if (!txMatch || !txMatch[1]) {
            throw new common_1.BadRequestException('Invalid SMS format: Could not extract transaction ID.');
        }
        return {
            amount: amountMatch[1],
            transactionId: txMatch[1],
        };
    }
};
exports.SmsParserService = SmsParserService;
exports.SmsParserService = SmsParserService = __decorate([
    (0, common_1.Injectable)()
], SmsParserService);
//# sourceMappingURL=sms-parser.service.js.map