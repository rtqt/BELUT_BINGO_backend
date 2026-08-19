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
exports.GameModuleModel = void 0;
const graphql_1 = require("@nestjs/graphql");
let GameModuleModel = class GameModuleModel {
    id;
    name;
    entryFee;
    status;
};
exports.GameModuleModel = GameModuleModel;
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], GameModuleModel.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], GameModuleModel.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], GameModuleModel.prototype, "entryFee", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], GameModuleModel.prototype, "status", void 0);
exports.GameModuleModel = GameModuleModel = __decorate([
    (0, graphql_1.ObjectType)()
], GameModuleModel);
//# sourceMappingURL=game-module.model.js.map