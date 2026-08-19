import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { SmsParserService } from './sms-parser/sms-parser.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly smsParser: SmsParserService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('telebirr')
  async handleTelebirrSms(@Body() payload: { smsText: string }) {
    if (!payload || !payload.smsText) {
      throw new BadRequestException('smsText is required');
    }

    // 1. Extract info from the raw SMS
    const { amount, transactionId } = this.smsParser.parseTelebirrSms(payload.smsText);

    // 2. Insert into the Transaction ledger autonomouly (Zero-Trust)
    try {
      await this.prisma.transaction.create({
        data: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: parseFloat(amount),
          externalTxId: transactionId,
          isClaimed: false
        }
      });
      return { success: true, transactionId };
    } catch (error: any) {
      console.error('Webhook error:', error);
      // If it's a unique constraint violation (P2002), it means we already received this SMS
      if (error.code === 'P2002') {
        return { success: true, message: 'Already processed' };
      }
      return { success: false, error: error.message, stack: error.stack, code: error.code };
    }
  }
}
// Trigger restart
