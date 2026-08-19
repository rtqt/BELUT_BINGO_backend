import { Test, TestingModule } from '@nestjs/testing';
import { TelegramAdminService } from './telegram-admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TelegramAdminService', () => {
  let service: TelegramAdminService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    transaction: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    wallet: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramAdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TelegramAdminService>(TelegramAdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleApprove', () => {
    it('should update transaction status to COMPLETED', async () => {
      mockPrismaService.transaction.update.mockResolvedValueOnce({
        id: 'tx-1',
        status: 'COMPLETED',
      });

      await service.handleApprove('tx-1');

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: 'COMPLETED' },
      });
    });
  });

  describe('handleReject', () => {
    it('should atomically update transaction to REJECTED and refund wallet', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValueOnce({
        id: 'tx-1',
        status: 'PENDING',
        amount: 50,
        walletId: 'wallet-1',
      });

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      await service.handleReject('tx-1');

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: 'REJECTED' },
      });

      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { increment: 50 } },
      });
    });
  });
});
