import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import * as crypto from 'crypto';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Telegram initData in Bearer token');
    }

    const initData = authHeader.split(' ')[1];

    // Local dev mock bypass — must check BEFORE verifyTelegramInitData so we don't
    // crash on missing TELEGRAM_BOT_TOKEN in dev environments.
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token === 'local_dev_mock_token' && initData.startsWith('mock_init_data')) {
      // Parse userId out of the initData string (e.g. "mock_init_data:local_dev_123")
      const parts = initData.split(':');
      const telegramId = parts[1] || 'local_dev_123';
      req.user = { id: telegramId };
      return true;
    }

    if (!this.verifyTelegramInitData(initData)) {
      throw new UnauthorizedException('Invalid Telegram initData signature');
    }

    // Attach the parsed user data to the request for resolvers to use
    const urlParams = new URLSearchParams(initData);
    const userString = urlParams.get('user');
    if (userString) {
      req.user = JSON.parse(decodeURIComponent(userString));
    }

    return true;
  }

  private verifyTelegramInitData(initData: string): boolean {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return computedHash === hash;
  }
}
