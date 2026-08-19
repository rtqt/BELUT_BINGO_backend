"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BingoModule = void 0;
const common_1 = require("@nestjs/common");
const bingo_gateway_1 = require("./bingo.gateway");
const bingo_service_1 = require("./bingo.service");
const bingo_resolver_1 = require("./bingo.resolver");
const wallets_module_1 = require("../../core/wallets/wallets.module");
const prisma_module_1 = require("../../core/prisma/prisma.module");
let BingoModule = class BingoModule {
};
exports.BingoModule = BingoModule;
exports.BingoModule = BingoModule = __decorate([
    (0, common_1.Module)({
        imports: [wallets_module_1.WalletsModule, prisma_module_1.PrismaModule],
        providers: [bingo_gateway_1.BingoGateway, bingo_service_1.BingoService, bingo_resolver_1.BingoResolver]
    })
], BingoModule);
//# sourceMappingURL=bingo.module.js.map