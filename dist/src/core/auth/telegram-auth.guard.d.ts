import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class TelegramAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
    private verifyTelegramInitData;
}
