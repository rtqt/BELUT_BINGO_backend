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
exports.BingoGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const ws_auth_guard_1 = require("../../core/auth/ws-auth.guard");
const bingo_service_1 = require("./bingo.service");
let BingoGateway = class BingoGateway {
    bingoService;
    server;
    constructor(bingoService) {
        this.bingoService = bingoService;
    }
    async handleDisconnect(client) {
        const user = client.data?.user;
        if (user && user.id) {
            await this.bingoService.handlePlayerDisconnect(user.id.toString());
        }
    }
    async handleJoinLobby(client, payload) {
        client.join(payload.lobbyId);
        const user = client.data?.user;
        if (user) {
            await this.bingoService.trackUserSession(user.id.toString(), payload.lobbyId);
        }
        client.emit('lobbyJoined', {
            lobbyId: payload.lobbyId,
            status: 'success',
        });
    }
    broadcastNumber(lobbyId, number, audioUrl) {
        this.server.to(lobbyId).emit('numberDrawn', { number, audioUrl });
    }
    async handleReserveCard(client, payload) {
        const user = client.data?.user;
        if (!user)
            return;
        try {
            const result = await this.bingoService.toggleCardReservation(user.id.toString(), payload.lobbyId, payload.templateId);
            this.server.to(payload.lobbyId).emit('cardToggled', {
                templateId: payload.templateId,
                userId: user.id,
                action: result.action,
            });
            const grids = await this.bingoService.getUserCardGrids(user.id.toString(), payload.lobbyId);
            client.emit('myCardsUpdated', {
                templateIds: result.templateIds,
                grids,
            });
        }
        catch (e) {
            client.emit('cardReservedError', { message: e.message });
        }
    }
    async handleCallBingo(client, payload) {
        const user = client.data?.user;
        if (!user)
            return;
        try {
            await this.bingoService.claimBingo(user.id.toString(), payload.lobbyId);
        }
        catch (e) {
        }
    }
};
exports.BingoGateway = BingoGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], BingoGateway.prototype, "server", void 0);
__decorate([
    (0, common_1.UseGuards)(ws_auth_guard_1.WsAuthGuard),
    (0, websockets_1.SubscribeMessage)('joinLobby'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], BingoGateway.prototype, "handleJoinLobby", null);
__decorate([
    (0, common_1.UseGuards)(ws_auth_guard_1.WsAuthGuard),
    (0, websockets_1.SubscribeMessage)('reserveCard'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], BingoGateway.prototype, "handleReserveCard", null);
__decorate([
    (0, common_1.UseGuards)(ws_auth_guard_1.WsAuthGuard),
    (0, websockets_1.SubscribeMessage)('callBingo'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], BingoGateway.prototype, "handleCallBingo", null);
exports.BingoGateway = BingoGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/bingo',
        cors: {
            origin: '*',
        },
    }),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => bingo_service_1.BingoService))),
    __metadata("design:paramtypes", [bingo_service_1.BingoService])
], BingoGateway);
//# sourceMappingURL=bingo.gateway.js.map