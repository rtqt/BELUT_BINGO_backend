import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { SmsParserService } from './sms-parser/sms-parser.service';

@Module({
  controllers: [WebhooksController],
  providers: [SmsParserService]
})
export class WebhooksModule {}
