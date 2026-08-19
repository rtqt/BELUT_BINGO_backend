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
exports.Ticket = exports.BingoGrid = void 0;
const graphql_1 = require("@nestjs/graphql");
let BingoGrid = class BingoGrid {
    B;
    I;
    N;
    G;
    O;
};
exports.BingoGrid = BingoGrid;
__decorate([
    (0, graphql_1.Field)(() => [graphql_1.Int]),
    __metadata("design:type", Array)
], BingoGrid.prototype, "B", void 0);
__decorate([
    (0, graphql_1.Field)(() => [graphql_1.Int]),
    __metadata("design:type", Array)
], BingoGrid.prototype, "I", void 0);
__decorate([
    (0, graphql_1.Field)(() => [graphql_1.Int]),
    __metadata("design:type", Array)
], BingoGrid.prototype, "N", void 0);
__decorate([
    (0, graphql_1.Field)(() => [graphql_1.Int]),
    __metadata("design:type", Array)
], BingoGrid.prototype, "G", void 0);
__decorate([
    (0, graphql_1.Field)(() => [graphql_1.Int]),
    __metadata("design:type", Array)
], BingoGrid.prototype, "O", void 0);
exports.BingoGrid = BingoGrid = __decorate([
    (0, graphql_1.ObjectType)()
], BingoGrid);
let Ticket = class Ticket {
    id;
    userId;
    gameInstanceId;
    gridDefinition;
};
exports.Ticket = Ticket;
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], Ticket.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], Ticket.prototype, "userId", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], Ticket.prototype, "gameInstanceId", void 0);
__decorate([
    (0, graphql_1.Field)(() => BingoGrid),
    __metadata("design:type", BingoGrid)
], Ticket.prototype, "gridDefinition", void 0);
exports.Ticket = Ticket = __decorate([
    (0, graphql_1.ObjectType)()
], Ticket);
//# sourceMappingURL=ticket.model.js.map