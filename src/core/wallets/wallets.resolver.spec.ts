import { Test, TestingModule } from '@nestjs/testing';
import { WalletsResolver } from './wallets.resolver';
import { WalletsService } from './wallets.service';
import { WithdrawalsService } from './withdrawals.service';
import { Prisma } from '@prisma/client';

describe('WalletsResolver', () => {
  let resolver: WalletsResolver;
  let service: WalletsService;

  const mockWalletsService = {
    getWallet: jest.fn(),
    deductGameFee: jest.fn(),
    claimDeposit: jest.fn(),
  };

  const mockWithdrawalsService = {
    requestWithdrawal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsResolver,
        {
          provide: WalletsService,
          useValue: mockWalletsService,
        },
        {
          provide: WithdrawalsService,
          useValue: mockWithdrawalsService,
        },
      ],
    }).compile();

    resolver = module.get<WalletsResolver>(WalletsResolver);
    service = module.get<WalletsService>(WalletsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getWallet', () => {
    it('should return the wallet for the provided user ID', async () => {
      const expectedWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Prisma.Decimal(500),
      };

      mockWalletsService.getWallet.mockResolvedValue(expectedWallet);

      const result = await resolver.getWallet('user-1');
      expect(result).toEqual(expectedWallet);
      expect(mockWalletsService.getWallet).toHaveBeenCalledWith('user-1');
    });
  });

  describe('deductGameFee', () => {
    it('should call the service to deduct the fee and return the updated wallet', async () => {
      const updatedWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Prisma.Decimal(490),
      };

      mockWalletsService.deductGameFee.mockResolvedValue(updatedWallet);

      const result = await resolver.deductGameFee('user-1', 10, 'game-id');
      expect(result).toEqual(updatedWallet);
      expect(mockWalletsService.deductGameFee).toHaveBeenCalledWith(
        'user-1',
        expect.any(Prisma.Decimal),
        'game-id',
      );
    });
  });
});
