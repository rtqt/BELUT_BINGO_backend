import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { SmsParserService } from './sms-parser/sms-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('WebhooksController', () => {
  let controller: WebhooksController;

  const mockSmsParser = {
    parseTelebirrSms: jest.fn(),
  };

  const mockPrismaService = {
    transaction: { create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: SmsParserService, useValue: mockSmsParser },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleTelebirrSms', () => {
    it('should throw BadRequestException if smsText is missing', async () => {
      await expect(controller.handleTelebirrSms({ smsText: '' })).rejects.toThrow(BadRequestException);
    });

    it('should parse SMS and create a DEPOSIT transaction record', async () => {
      const smsText = 'Dear Adam \nYou have received ETB 100.00 from Someone on 14/08/2026. Your transaction number is TXN123. Balance ETB 500.00.\nThank you for using telebirr\nEthio telecom';

      mockSmsParser.parseTelebirrSms.mockReturnValue({ amount: '100.00', transactionId: 'TXN123' });
      mockPrismaService.transaction.create.mockResolvedValue({ id: 'tx-1', externalTxId: 'TXN123' });

      const result = await controller.handleTelebirrSms({ smsText });

      expect(mockSmsParser.parseTelebirrSms).toHaveBeenCalledWith(smsText);
      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: 100,
          externalTxId: 'TXN123',
          isClaimed: false,
        },
      });
      expect(result).toEqual({ success: true, transactionId: 'TXN123' });
    });

    it('should return success:true with "Already processed" if transaction already exists (P2002)', async () => {
      mockSmsParser.parseTelebirrSms.mockReturnValue({ amount: '100.00', transactionId: 'TXN_DUPE' });
      
      const duplicateError = { code: 'P2002', message: 'Unique constraint failed' };
      mockPrismaService.transaction.create.mockRejectedValue(duplicateError);

      const result = await controller.handleTelebirrSms({
        smsText: 'You have received ETB 100.00 transaction number TXN_DUPE Thank you for using telebirr',
      });

      expect(result).toEqual({ success: true, message: 'Already processed' });
    });
  });
});
