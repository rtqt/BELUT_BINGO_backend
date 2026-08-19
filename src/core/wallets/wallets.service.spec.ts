import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('WalletsService', () => {
  let service: WalletsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWallet', () => {
    it('should return an existing wallet for a given telegramId', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Prisma.Decimal(100.0),
        wagerRequirementBalance: new Prisma.Decimal(0.0),
      };

      mockPrismaService.user.upsert.mockResolvedValue({
        id: 'user-1',
        telegramId: 'tg-1',
        wallet: mockWallet,
      });

      const result = await service.getWallet('tg-1');
      expect(result).toEqual(mockWallet);
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { telegramId: 'tg-1' },
        })
      );
    });

    it('should create and return a new wallet if user does not exist', async () => {
      const newWallet = {
        id: 'wallet-new',
        userId: 'user-new',
        balance: new Prisma.Decimal(0.0),
        wagerRequirementBalance: new Prisma.Decimal(0.0),
      };

      mockPrismaService.user.upsert.mockResolvedValue({
        id: 'user-new',
        telegramId: 'tg-new',
        wallet: newWallet,
      });

      const result = await service.getWallet('tg-new');
      expect(result).toEqual(newWallet);
      expect(result.balance).toEqual(new Prisma.Decimal(0.0));
    });
  });

  describe('deductGameFee', () => {
    it('should deduct fee successfully when balance is sufficient', async () => {
      const initialWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Prisma.Decimal(100.0),
      };

      const updatedWallet = {
        ...initialWallet,
        balance: new Prisma.Decimal(90.0), // 10 ETB deducted
      };

      // Mock the transaction callback behavior
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      // Mock the findUnique inside the transaction
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        telegramId: 'tg-1',
        wallet: initialWallet,
      });

      // Mock the wallet update to simulate the atomic return
      mockPrismaService.wallet.update.mockResolvedValueOnce(updatedWallet);

      // Mock the transaction creation
      mockPrismaService.transaction.create.mockResolvedValueOnce({});

      const result = await service.deductGameFee(
        'tg-1',
        new Prisma.Decimal(10.0),
        'game-instance-1',
      );

      expect(result.balance).toEqual(new Prisma.Decimal(90.0));
      // Enforce the use of atomic decrement instead of read-modify-write
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wallet-1' },
          data: {
            balance: { decrement: new Prisma.Decimal(10.0) },
          },
        })
      );
      expect(mockPrismaService.transaction.create).toHaveBeenCalled();
    });

    it('should throw InsufficientFunds exception when balance is too low', async () => {
      const initialWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Prisma.Decimal(5.0), // Only 5 ETB available
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        telegramId: 'tg-1',
        wallet: initialWallet,
      });

      await expect(
        service.deductGameFee(
          'tg-1',
          new Prisma.Decimal(10.0), // Trying to deduct 10 ETB
          'game-instance-1',
        ),
      ).rejects.toThrow(BadRequestException);
      
      // Ensure it throws before attempting an update
      expect(mockPrismaService.wallet.update).not.toHaveBeenCalled();
    });
  });

  describe('claimDeposit', () => {
    it('should successfully add funds when user input matches an Unclaimed record', async () => {
      const initialWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: new Prisma.Decimal(100.0),
      };

      const unclaimedDeposit = {
        id: 'tx-1',
        externalTxId: 'DHE8RS6FT8',
        amount: new Prisma.Decimal(10.0),
        isClaimed: false,
        type: 'DEPOSIT',
      };

      // Mock the transaction callback behavior
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      // Mock the findUnique for the unclaimed deposit
      mockPrismaService.transaction.findUnique.mockResolvedValueOnce(unclaimedDeposit);

      // Mock the wallet lookup
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        telegramId: 'tg-1',
        wallet: initialWallet,
      });

      // Mock the transaction update
      mockPrismaService.transaction.update.mockResolvedValueOnce({ ...unclaimedDeposit, isClaimed: true });

      // Mock the wallet update returning the final balance
      mockPrismaService.wallet.update.mockResolvedValueOnce({
        ...initialWallet,
        balance: new Prisma.Decimal(110.0),
        wagerRequirementBalance: new Prisma.Decimal(10.0),
      });

      const result = await service.claimDeposit('tg-1', 'DHE8RS6FT8');

      expect(result.balance).toEqual(new Prisma.Decimal(110.0));
      expect(mockPrismaService.transaction.update).toHaveBeenCalled();
      
      // Enforce atomic increments for both balance and wager requirements
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wallet-1' },
          data: {
            balance: { increment: 10 },
            wagerRequirementBalance: { increment: 10 },
          },
        })
      );
    });

    it('should automatically create the user and wallet if they do not exist', async () => {
      const unclaimedDeposit = {
        id: 'tx-2',
        externalTxId: 'NEW_TXN',
        amount: new Prisma.Decimal(10.0),
        isClaimed: false,
        type: 'DEPOSIT',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockPrismaService.transaction.findUnique.mockResolvedValueOnce(unclaimedDeposit);

      // User doesn't exist
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      // Mock user creation
      const createdWallet = {
        id: 'wallet-new',
        userId: 'user-new',
        balance: new Prisma.Decimal(0.0),
      };
      
      mockPrismaService.user.create.mockResolvedValueOnce({
        id: 'user-new',
        telegramId: 'tg-new',
        wallet: createdWallet,
      });

      mockPrismaService.transaction.update.mockResolvedValueOnce({ ...unclaimedDeposit, isClaimed: true });

      mockPrismaService.wallet.update.mockResolvedValueOnce({
        ...createdWallet,
        balance: new Prisma.Decimal(10.0),
        wagerRequirementBalance: new Prisma.Decimal(10.0),
      });

      const result = await service.claimDeposit('tg-new', 'NEW_TXN');

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          telegramId: 'tg-new',
          wallet: {
            create: { balance: 0, wagerRequirementBalance: 0 },
          },
        },
        include: { wallet: true },
      });
      expect(result.balance).toEqual(new Prisma.Decimal(10.0));
    });

    it('should throw BadRequestException if the deposit is already claimed', async () => {
      const claimedDeposit = {
        id: 'tx-1',
        externalTxId: 'DHE8RS6FT8',
        amount: new Prisma.Decimal(10.0),
        isClaimed: true,
        type: 'DEPOSIT',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockPrismaService.transaction.findUnique.mockResolvedValueOnce(claimedDeposit);

      await expect(
        service.claimDeposit('tg-1', 'DHE8RS6FT8')
      ).rejects.toThrow(BadRequestException);
    });

  });
});
