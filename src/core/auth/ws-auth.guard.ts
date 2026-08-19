import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    
    // Read initData from handshake query or auth
    const initData = client.handshake.query.initData as string || client.handshake.auth.initData as string;
    
    if (!initData) {
      client.disconnect();
      return false;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token === 'local_dev_mock_token' && initData.startsWith('mock_init_data')) {
      const parts = initData.split(':');
      const telegramId = parts[1] || 'local_dev_123';
      client.data.user = { id: telegramId };
      return true;
    }

    if (!this.verifyTelegramInitData(initData)) {
      client.disconnect();
      return false;
    }

    const urlParams = new URLSearchParams(initData);
    const userString = urlParams.get('user');
    if (userString) {
      client.data.user = JSON.parse(decodeURIComponent(userString));
    }

    return true;
  }

  private verifyTelegramInitData(initData: string): boolean {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;

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
