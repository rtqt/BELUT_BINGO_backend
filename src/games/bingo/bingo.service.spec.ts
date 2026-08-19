import { Test, TestingModule } from '@nestjs/testing';
import { BingoService } from './bingo.service';
import { BadRequestException } from '@nestjs/common';
import { BingoGateway } from './bingo.gateway';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WalletsService } from '../../core/wallets/wallets.service';

describe('BingoService', () => {
  let service: BingoService;
  let mockRedis: any;

  const mockPrismaService = {
    ticket: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    gameInstance: { findUnique: jest.fn(), update: jest.fn() },
    cardTemplate: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    wallet: { update: jest.fn() },
    transaction: { create: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
  };

  const mockWalletsService = {
    refundGameFee: jest.fn(),
    deductGameFee: jest.fn(),
  };

  const mockGateway = {
    server: {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    },
    broadcastNumber: jest.fn(),
  };

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      scard: jest.fn().mockResolvedValue(0),
      srem: jest.fn().mockResolvedValue(1),
      sismember: jest.fn().mockResolvedValue(0),
      smembers: jest.fn().mockResolvedValue([]),
      expire: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BingoService,
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: BingoGateway, useValue: mockGateway },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    }).compile();

    service = module.get<BingoService>(BingoService);

    jest.clearAllMocks();
    (service as any).gateway = mockGateway;
    // Restore mocks after clearAllMocks
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.scard.mockResolvedValue(0);
    mockRedis.srem.mockResolvedValue(1);
    mockRedis.sismember.mockResolvedValue(0);
    mockRedis.smembers.mockResolvedValue([]);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockPrismaService.gameInstance.update.mockResolvedValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Card Toggle', () => {
    it('should successfully reserve a card and return templateIds', async () => {
      mockRedis.get.mockResolvedValueOnce(null);       // no existing owner
      mockRedis.sismember.mockResolvedValueOnce(0);    // not already selected
      mockRedis.scard
        .mockResolvedValueOnce(0)  // cap check: 0 current cards
        .mockResolvedValueOnce(1); // player count after sadd = 1 (no countdown yet)
      mockRedis.smembers.mockResolvedValueOnce(['5']); // updated card list

      const result = await service.toggleCardReservation('user-1', 'lobby-1', 5);

      expect(result.action).toBe('reserved');
      expect(result.templateIds).toContain(5);
      expect(mockRedis.set).toHaveBeenCalledWith('reserve:lobby-1:5', 'user-1', 'EX', 600);
    });

    it('should throw BadRequestException if the card is reserved by another user', async () => {
      mockRedis.get.mockResolvedValueOnce('user-2'); // owned by another
      mockRedis.sismember.mockResolvedValueOnce(0);

      await expect(
        service.toggleCardReservation('user-1', 'lobby-1', 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should deselect a card if the user already has it selected (toggle off)', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.sismember.mockResolvedValueOnce(1);   // already in set
      mockRedis.scard.mockResolvedValueOnce(1);        // 1 card remaining after release (not 0, so no player removal)
      mockRedis.smembers.mockResolvedValueOnce(['7']); // other cards still selected

      const result = await service.toggleCardReservation('user-1', 'lobby-1', 5);

      expect(result.action).toBe('released');
      expect(mockRedis.srem).toHaveBeenCalledWith('usercards:lobby-1:user-1', '5');
      expect(mockRedis.del).toHaveBeenCalledWith('reserve:lobby-1:5');
    });

    it('should enforce MAX_CARDS_PER_PLAYER limit', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.sismember.mockResolvedValueOnce(0);
      mockRedis.scard.mockResolvedValueOnce(10); // already at max

      await expect(
        service.toggleCardReservation('user-1', 'lobby-1', 11),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Countdown Trigger (via card reservation)', () => {
    it('should NOT start countdown when only 1 player has cards', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.sismember.mockResolvedValueOnce(0);
      mockRedis.scard
        .mockResolvedValueOnce(0)  // cap check
        .mockResolvedValueOnce(1); // only 1 player in lobby
      mockRedis.smembers.mockResolvedValueOnce(['5']);

      jest.spyOn(service as any, 'startCountdown').mockImplementation(() => Promise.resolve());

      await service.toggleCardReservation('user-1', 'lobby-1', 5);

      expect((service as any).startCountdown).not.toHaveBeenCalled();
    });

    it('should start countdown when the 2nd player reserves their first card', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.sismember.mockResolvedValueOnce(0);
      mockRedis.scard
        .mockResolvedValueOnce(0)  // cap check: user-2 has 0 cards
        .mockResolvedValueOnce(2); // 2 players now have cards → trigger
      mockRedis.smembers.mockResolvedValueOnce(['7']);

      jest.spyOn(service as any, 'startCountdown').mockImplementation(() => Promise.resolve());

      await service.toggleCardReservation('user-2', 'lobby-1', 7);

      expect((service as any).startCountdown).toHaveBeenCalledWith('lobby-1');
    });

    it('should abort countdown when a player releases their last card', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.sismember.mockResolvedValueOnce(1);  // releasing an existing card
      mockRedis.scard
        .mockResolvedValueOnce(0)  // 0 cards remaining — remove from players set
        .mockResolvedValueOnce(1); // 1 player remaining → below threshold
      mockRedis.smembers.mockResolvedValueOnce([]);

      jest.spyOn(service as any, 'abortCountdownIfNeeded').mockImplementation(() => Promise.resolve());

      await service.toggleCardReservation('user-1', 'lobby-1', 5);

      expect(mockRedis.srem).toHaveBeenCalledWith('players:lobby-1', 'user-1');
      expect((service as any).abortCountdownIfNeeded).toHaveBeenCalledWith('lobby-1');
    });

    it('should NOT abort countdown if another player still has cards when one leaves', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.sismember.mockResolvedValueOnce(1);  // releasing
      mockRedis.scard
        .mockResolvedValueOnce(0)  // 0 cards remaining
        .mockResolvedValueOnce(2); // still 2 players in lobby → no abort
      mockRedis.smembers.mockResolvedValueOnce([]);

      jest.spyOn(service as any, 'abortCountdownIfNeeded').mockImplementation(() => Promise.resolve());

      await service.toggleCardReservation('user-1', 'lobby-1', 5);

      expect((service as any).abortCountdownIfNeeded).not.toHaveBeenCalled();
    });

    it('startCountdown should be idempotent — no-op if already COUNTDOWN or IN_PROGRESS', async () => {
      // Simulate lobby already past LOBBY phase
      mockRedis.get.mockResolvedValueOnce('COUNTDOWN');

      // Should return without setting state or spawning interval
      await (service as any).startCountdown('lobby-1');

      expect(mockRedis.set).not.toHaveBeenCalledWith('state:lobby-1', 'COUNTDOWN');
    });
  });

  describe('False Bingo Penalty', () => {
    it('should kick the player if claimBingo pattern is false', async () => {
      // claimBingo resolves telegramId → DB UUID before querying tickets
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: 'user-db-uuid-1' });
      mockRedis.smembers.mockResolvedValueOnce(['5', '18', '42']);
      mockPrismaService.ticket.findMany.mockResolvedValueOnce([
        {
          id: 'ticket-1',
          template: {
            gridDefinition: {
              B: [5, 2, 3, 4, 6],
              I: [18, 19, 20, 21, 22],
              N: [0, 32, 33, 34, 35],
              G: [46, 47, 48, 49, 50],
              O: [61, 62, 63, 64, 65],
            },
          },
        },
      ]);
      mockRedis.srem.mockResolvedValueOnce(1);

      await expect(
        service.claimBingo('telegram-user-1', 'lobby-1'),
      ).rejects.toThrow('False Bingo');

      // Must query by the resolved UUID, not the raw telegramId
      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-db-uuid-1' }),
        }),
      );
      expect(mockRedis.srem).toHaveBeenCalledWith('active:lobby-1', 'telegram-user-1');
    });
  });
  describe('processLobbyStart', () => {
    it('should pay 5 ETB referral bonus to referrer if it is the users first game', async () => {
      mockRedis.smembers.mockImplementation((key) => {
        if (key === 'players:lobby-1') return ['user-1'];
        if (key === 'usercards:lobby-1:user-1') return ['5'];
        return [];
      });

      mockPrismaService.gameInstance.findUnique.mockResolvedValueOnce({
        id: 'lobby-1',
        module: { entryFee: { mul: () => 10 } },
      });

      // User has 0 previous tickets (first game) and a referrer
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'db-user-1',
        telegramId: 'user-1',
        referredById: 'referrer-1',
        tickets: [], // length 0 means first game
      });

      // We need to spy on Prisma transaction for the referral bonus
      mockPrismaService.wallet.findUnique = jest.fn().mockResolvedValueOnce({ id: 'referrer-wallet-1' });
      mockPrismaService.wallet.update.mockResolvedValueOnce({ balance: 50 });

      await (service as any).processLobbyStart('lobby-1');

      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'referrer-wallet-1' },
        data: { balance: { increment: 5 } },
      });
      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'REFERRAL_BONUS', amount: 5 }),
      });
    });
  });

  describe('checkAutoWin', () => {
    it('should ignore users with less than 3 tickets', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['B-1', 'B-2', 'B-3', 'B-4', 'B-5']); // drawn
      
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: 'db-user-1' });

      // User only has 2 tickets
      mockPrismaService.ticket.findMany.mockResolvedValueOnce([
        { id: 't1', template: { gridDefinition: { B: [1,2,3,4,5], I: [], N: [], G: [], O: [] } } },
        { id: 't2', template: { gridDefinition: { B: [], I: [], N: [], G: [], O: [] } } }
      ]);

      const processWinSpy = jest.spyOn(service as any, 'processWin').mockResolvedValue(null);

      await (service as any).checkAutoWin('user-1', 'lobby-1');

      // Even though ticket 1 won, user has < 3 tickets, so auto-win shouldn't trigger
      expect(processWinSpy).not.toHaveBeenCalled();
    });
  });

  describe('processWin', () => {
    it('should split the prize pool equally among multiple winners', async () => {
      mockPrismaService.gameInstance.findUnique.mockResolvedValueOnce({
        id: 'lobby-1',
        totalPrizePool: {
          mul: () => ({}),
          sub: () => ({ div: () => 42.5 }),
          toNumber: () => 100,
        },
        houseRevenue: { toNumber: () => 0 },
      });

      mockPrismaService.user.findUnique.mockImplementation(async ({ where }) => {
         return { telegramId: `tg-${where.id}` };
      });

      // 100 pool, 15% rake = 15 house, 85 prize. 85 / 2 winners = 42.5 each.
      await (service as any).processWin(['winner-1', 'winner-2'], 'lobby-1');

      expect(mockWalletsService.refundGameFee).toHaveBeenCalledWith('winner-1', 42.5, 'lobby-1');
      expect(mockWalletsService.refundGameFee).toHaveBeenCalledWith('winner-2', 42.5, 'lobby-1');
    });
  });
});
