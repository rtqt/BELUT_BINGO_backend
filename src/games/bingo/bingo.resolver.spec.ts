import { Test, TestingModule } from '@nestjs/testing';
import { BingoResolver } from './bingo.resolver';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WalletsService } from '../../core/wallets/wallets.service';
import { BingoService } from './bingo.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('BingoResolver', () => {
  let resolver: BingoResolver;

  const mockPrismaService = {
    gameModule: { findUnique: jest.fn() },
    gameInstance: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    ticket: { findFirst: jest.fn() },
  };

  const mockWalletsService = {
    deductGameFee: jest.fn(),
  };

  const mockBingoService = {
    setPlayerReady: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BingoResolver,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletsService, useValue: mockWalletsService },
        { provide: BingoService, useValue: mockBingoService },
      ],
    }).compile();

    resolver = module.get<BingoResolver>(BingoResolver);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
  describe('getMyTicket', () => {
    it('should throw UnauthorizedException if context has no user', async () => {
      const ctx = { req: { user: null } };
      await expect(resolver.getMyTicket('game-1', ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should return a normalised ticket grid for the authenticated user', async () => {
      const gridDefinition = {
        B: [5, 12, 3, 15, 8],
        I: [18, 22, 29, 16, 25],
        N: [35, 41, 'FREE', 31, 44],
        G: [46, 52, 58, 49, 60],
        O: [65, 72, 61, 68, 75],
      };
      mockPrismaService.ticket.findFirst.mockResolvedValueOnce({
        id: 'ticket-uuid-1',
        userId: 'user-uuid-1',
        gameInstanceId: 'game-1',
        template: { gridDefinition },
      });

      const ctx = { req: { user: { id: 123 } } };
      const result = await resolver.getMyTicket('game-1', ctx);

      expect(result.id).toBe('ticket-uuid-1');
      expect(result.userId).toBe('123'); // returns telegramId, not internal UUID
      // FREE should be normalised to 0
      expect(result.gridDefinition.N[2]).toBe(0);
    });

    it('should throw BadRequestException if no ticket is found', async () => {
      mockPrismaService.ticket.findFirst.mockResolvedValueOnce(null);
      const ctx = { req: { user: { id: 123 } } };
      await expect(resolver.getMyTicket('game-1', ctx)).rejects.toThrow(BadRequestException);
    });
  });


  describe('joinLobby', () => {
    it('should throw UnauthorizedException if context has no user', async () => {
      const ctx = { req: { user: null } };
      await expect(resolver.joinLobby('BINGO_10', ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if game module is not LIVE', async () => {
      mockPrismaService.gameModule.findUnique.mockResolvedValueOnce({
        id: 'BINGO_10',
        status: 'DEMO',
        entryFee: new Prisma.Decimal(10),
      });

      const ctx = { req: { user: { id: 123 } } };
      await expect(resolver.joinLobby('BINGO_10', ctx)).rejects.toThrow(BadRequestException);
    });

    it('should create a new GameInstance if none exists in LOBBY state', async () => {
      const gameModule = { id: 'BINGO_10', status: 'LIVE', entryFee: new Prisma.Decimal(10) };
      const newInstance = { id: 'instance-1', gameModuleId: 'BINGO_10', state: 'LOBBY' };
      const userWithWallet = {
        id: '123',
        telegramId: '123',
        wallet: { balance: new Prisma.Decimal(100) },
      };

      mockPrismaService.gameModule.findUnique.mockResolvedValueOnce(gameModule);
      mockPrismaService.gameInstance.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.gameInstance.create.mockResolvedValueOnce(newInstance);
      mockPrismaService.user.findUnique.mockResolvedValueOnce(userWithWallet);

      const ctx = { req: { user: { id: 123 } } };
      const result = await resolver.joinLobby('BINGO_10', ctx);

      expect(mockPrismaService.gameInstance.create).toHaveBeenCalledWith({
        data: { gameModuleId: 'BINGO_10', state: 'LOBBY' },
      });
      // Verify orderBy uses createdAt (not the nullable startedAt)
      expect(mockPrismaService.gameInstance.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
      // Fee is NOT deducted on lobby join — only at game start
      expect(mockWalletsService.deductGameFee).not.toHaveBeenCalled();
      expect(result.gameInstanceId).toBe('instance-1');
    });

    it('should throw if user has insufficient balance', async () => {
      const gameModule = { id: 'BINGO_10', status: 'LIVE', entryFee: new Prisma.Decimal(10) };
      const newInstance = { id: 'instance-1', gameModuleId: 'BINGO_10', state: 'LOBBY' };
      const userWithLowBalance = {
        id: '123',
        telegramId: '123',
        wallet: { balance: new Prisma.Decimal(5) }, // below entry fee
      };

      mockPrismaService.gameModule.findUnique.mockResolvedValueOnce(gameModule);
      mockPrismaService.gameInstance.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.gameInstance.create.mockResolvedValueOnce(newInstance);
      mockPrismaService.user.findUnique.mockResolvedValueOnce(userWithLowBalance);

      const ctx = { req: { user: { id: 123 } } };
      await expect(resolver.joinLobby('BINGO_10', ctx)).rejects.toThrow(BadRequestException);
    });
  });
});
