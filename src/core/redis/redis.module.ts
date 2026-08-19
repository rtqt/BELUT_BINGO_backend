import { Module, Global } from '@nestjs/common';
import { Redis } from 'ioredis';

const redisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    return new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  },
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}
