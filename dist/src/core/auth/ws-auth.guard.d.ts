import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class WsAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
    private verifyTelegramInitData;
}
