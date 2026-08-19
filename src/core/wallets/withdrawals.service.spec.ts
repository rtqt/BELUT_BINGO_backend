import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalsService } from './withdrawals.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('WithdrawalsService', () => {
  let service: WithdrawalsService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WithdrawalsService>(WithdrawalsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestWithdrawal', () => {
    it('should throw BadRequestException if amount < 50', async () => {
      await expect(service.requestWithdrawal('user-1', 40, '0911223344'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if wallet has insufficient balance', async () => {
      // Simulate transaction execution
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockPrismaService.wallet.findUnique.mockResolvedValueOnce({
        id: 'wallet-1',
        balance: { lessThan: (val: number) => 30 < val }, // Simulate 30 ETB balance
      });

      await expect(service.requestWithdrawal('user-1', 50, '0911223344'))
        .rejects.toThrow(new BadRequestException('Insufficient balance'));
    });

    it('should atomically deduct balance and create PENDING transaction', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockPrismaService.wallet.findUnique.mockResolvedValueOnce({
        id: 'wallet-1',
        userId: 'user-1',
        balance: { lessThan: () => false },
      });

      mockPrismaService.wallet.update.mockResolvedValueOnce({
        id: 'wallet-1',
        balance: { lessThan: () => false, toNumber: () => 50, toJSON: () => 50 },
      });

      mockPrismaService.transaction.create.mockResolvedValueOnce({
        id: 'tx-1',
        status: 'PENDING',
      });

      const result = await service.requestWithdrawal('user-1', 50, '0911223344');

      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { decrement: 50 } },
      });

      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'WITHDRAWAL',
          amount: 50,
          status: 'PENDING',
          senderPhone: '0911223344',
          balanceAfter: expect.any(Object),
        },
      });

      expect(result.status).toBe('PENDING');
    });
  });
});
