import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class SmsParserService {
  /**
   * Parses a raw Telebirr SMS string and extracts the transaction details.
   * Expects format: "...received ETB <AMOUNT>...transaction number is <TX_ID>."
   */
  parseTelebirrSms(smsText: string): { amount: string; transactionId: string } {
    // Extract Amount
    // Example: "You have received ETB 10.00 from..."
    const amountRegex = /received ETB (\d+(?:\.\d+)?)/i;
    const amountMatch = smsText.match(amountRegex);

    if (!amountMatch || !amountMatch[1]) {
      throw new BadRequestException(
        'Invalid SMS format: Could not extract amount.',
      );
    }

    // Extract Transaction ID
    // Example: "Your transaction number is DHE8RS6FT8."
    const txRegex = /transaction number is ([A-Z0-9]+)\./i;
    const txMatch = smsText.match(txRegex);

    if (!txMatch || !txMatch[1]) {
      throw new BadRequestException(
        'Invalid SMS format: Could not extract transaction ID.',
      );
    }

    return {
      amount: amountMatch[1],
      transactionId: txMatch[1],
    };
  }
}
