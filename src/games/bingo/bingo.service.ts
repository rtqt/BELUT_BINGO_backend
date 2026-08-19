import { Injectable, Inject, BadRequestException, forwardRef } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomInt } from 'crypto';
import { AmharicTtsUtil } from './amharic-tts.util';
import { BingoGateway } from './bingo.gateway';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WalletsService } from '../../core/wallets/wallets.service';
import { BingoMatrixUtil } from './bingo.matrix.util';

/** The max number of cards a player can select per game. */
const MAX_CARDS_PER_PLAYER = 10;
/** Auto-features unlock at this many cards. */
const AUTO_FEATURE_THRESHOLD = 3;
/** TTL (seconds) for card reservations and player slots — covers countdown + start processing. */
const RESERVATION_TTL = 600;

@Injectable()
export class BingoService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
    @Inject(forwardRef(() => BingoGateway))
    private readonly gateway: BingoGateway,
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
  ) {}

  /**
   * Returns a card template grid, with FREE normalized to 0.
   */
  async getTemplateGrid(templateId: number): Promise<any> {
    const template = await this.prisma.cardTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new BadRequestException('Template not found');
    return this.normalizeGrid(template.gridDefinition as any);
  }

  /** Normalize the FREE center square to 0 for GraphQL Int compatibility. */
  private normalizeGrid(grid: any): any {
    const g = { ...grid };
    if (g.N && Array.isArray(g.N)) {
      g.N = g.N.map((val: any) => (val === 'FREE' ? 0 : val));
    }
    return g;
  }

  /**
   * Toggles a card reservation for a user.
   *
   * - If the card is already reserved by another user → throws.
   * - If the card is already in the user's set → deselects it.
   * - Otherwise → adds it to the user's set (up to MAX_CARDS_PER_PLAYER).
   *
   * Countdown trigger: once ≥ 2 distinct players have at least one card
   * reserved in this lobby, the 40-second countdown starts automatically.
   * If a player releases all their cards and the count drops below 2,
   * any running countdown is aborted.
   *
   * Returns: { action: 'reserved' | 'released', templateIds: number[] }
   */
  async toggleCardReservation(
    userId: string,
    lobbyId: string,
    templateId: number,
  ): Promise<{ action: 'reserved' | 'released'; templateIds: number[] }> {
    const cardOwnerKey = `reserve:${lobbyId}:${templateId}`;
    const userCardsKey = `usercards:${lobbyId}:${userId}`;
    const playersKey   = `players:${lobbyId}`;

    // 1. Reject if another user already owns this card
    const existingOwner = await this.redisClient.get(cardOwnerKey);
    if (existingOwner && existingOwner !== userId) {
      throw new BadRequestException('Card is already reserved by another player');
    }

    const alreadySelected = await this.redisClient.sismember(userCardsKey, templateId.toString());

    if (alreadySelected) {
      // --- RELEASE ---
      await this.redisClient.srem(userCardsKey, templateId.toString());
      await this.redisClient.del(cardOwnerKey);

      // If this user now has no cards at all, remove them from the players set
      const remaining = await this.redisClient.scard(userCardsKey);
      if (remaining === 0) {
        await this.redisClient.srem(playersKey, userId);

        // If active player count drops below 2, abort the countdown
        const playerCount = await this.redisClient.scard(playersKey);
        if (playerCount < 2) {
          await this.abortCountdownIfNeeded(lobbyId);
        }
      }
    } else {
      // --- RESERVE ---
      // Enforce card cap
      const currentCount = await this.redisClient.scard(userCardsKey);
      if (currentCount >= MAX_CARDS_PER_PLAYER) {
        throw new BadRequestException(`You can only select up to ${MAX_CARDS_PER_PLAYER} cards`);
      }

      await this.redisClient.set(cardOwnerKey, userId, 'EX', RESERVATION_TTL);
      await this.redisClient.sadd(userCardsKey, templateId.toString());
      await this.redisClient.expire(userCardsKey, RESERVATION_TTL);

      // Register this user as an active player in the lobby
      await this.redisClient.sadd(playersKey, userId);
      await this.redisClient.expire(playersKey, RESERVATION_TTL);

      // Start the 40-second countdown once a second player has joined
      const playerCount = await this.redisClient.scard(playersKey);
      if (playerCount >= 2) {
        this.startCountdown(lobbyId);
      }
    }

    const updatedCards = await this.redisClient.smembers(userCardsKey);
    const templateIds = updatedCards.map(id => parseInt(id, 10));

    return {
      action: alreadySelected ? 'released' : 'reserved',
      templateIds,
    };
  }

  /**
   * Returns a list of all template grids for a user's selected cards.
   */
  async getUserCardGrids(userId: string, lobbyId: string): Promise<{ templateId: number; grid: any }[]> {
    const userCardsKey = `usercards:${lobbyId}:${userId}`;
    const ids = await this.redisClient.smembers(userCardsKey);
    const results: { templateId: number; grid: any }[] = [];
    for (const idStr of ids) {
      const templateId = parseInt(idStr, 10);
      const grid = await this.getTemplateGrid(templateId);
      results.push({ templateId, grid });
    }
    return results;
  }

  /**
   * Aborts a running COUNTDOWN, resetting the lobby back to LOBBY state.
   * Called when the active player count drops below 2.
   */
  private async abortCountdownIfNeeded(lobbyId: string): Promise<void> {
    const stateKey = `state:${lobbyId}`;
    const currentState = await this.redisClient.get(stateKey);
    if (currentState !== 'COUNTDOWN') return;

    await this.redisClient.set(stateKey, 'LOBBY');
    await this.prisma.gameInstance.update({
      where: { id: lobbyId },
      data: { state: 'LOBBY' },
    });

    this.gateway.server.to(lobbyId).emit('gameState', {
      state: 'LOBBY',
      message: 'Countdown aborted. Waiting for more players.',
      drawnNumbers: [],
    });
  }

  /**
   * Triggers the 40-second countdown before the game begins.
   * Idempotent: a no-op if the lobby is already past the LOBBY phase.
   */
  private async startCountdown(lobbyId: string): Promise<void> {
    const stateKey = `state:${lobbyId}`;
    const currentState = await this.redisClient.get(stateKey);
    // Guard: only start if we're still in the waiting LOBBY phase
    if (currentState && currentState !== 'LOBBY') return;

    await this.redisClient.set(stateKey, 'COUNTDOWN');
    await this.prisma.gameInstance.update({
      where: { id: lobbyId },
      data: { state: 'COUNTDOWN' },
    });

    let secondsLeft = 40;

    const interval = setInterval(async () => {
      // If another process aborted the countdown, stop the tick
      const state = await this.redisClient.get(stateKey);
      if (state !== 'COUNTDOWN') {
        clearInterval(interval);
        return;
      }

      secondsLeft--;
      this.gateway.server.to(lobbyId).emit('gameState', {
        state: 'COUNTDOWN',
        countdown: secondsLeft,
        drawnNumbers: [],
      });

      if (secondsLeft <= 0) {
        clearInterval(interval);
        this.processLobbyStart(lobbyId);
      }
    }, 1000);
  }

  /**
   * Called when the countdown reaches 0.
   * Deducts fees for each card selected, creates Ticket records, and
   * enables auto-features for players with 3+ cards.
   */
  private async processLobbyStart(lobbyId: string) {
    const playersKey = `players:${lobbyId}`;
    const activePlayers = await this.redisClient.smembers(playersKey);

    const instance = await this.prisma.gameInstance.findUnique({
      where: { id: lobbyId },
      include: { module: true },
    });

    if (!instance) return;

    for (const userId of activePlayers) {
      const userCardsKey = `usercards:${lobbyId}:${userId}`;
      const cardIds = await this.redisClient.smembers(userCardsKey);

      if (cardIds.length === 0) {
        this.gateway.server.to(lobbyId).emit('lobbyKick', { userId, reason: 'No card selected' });
        await this.redisClient.srem(playersKey, userId);
        continue;
      }

      const templateIds = cardIds.map(id => parseInt(id, 10));
      const totalFee = instance.module.entryFee.mul(templateIds.length);

      try {
        // 1. Deduct total fee (all cards at once)
        await this.walletsService.deductGameFee(userId, totalFee, lobbyId);

        // 1.5 Process Referral Bonus if First Game
        const dbUser = await this.prisma.user.findUnique({
          where: { telegramId: userId },
          include: { tickets: { select: { id: true } } },
        });

        if (dbUser && dbUser.tickets.length === 0 && dbUser.referredById) {
          // This is their very first ticket/game, payout referral bonus to referrer
          await this.prisma.$transaction(async (tx) => {
            const referrerWallet = await tx.wallet.findUnique({
              where: { userId: dbUser.referredById! },
            });
            if (referrerWallet) {
              const updatedWallet = await tx.wallet.update({
                where: { id: referrerWallet.id },
                data: { balance: { increment: 5 } },
              });
              await tx.transaction.create({
                data: {
                  walletId: referrerWallet.id,
                  type: 'REFERRAL_BONUS',
                  amount: 5,
                  status: 'COMPLETED',
                  balanceAfter: updatedWallet.balance,
                },
              });
            }
          });
        }

        // 2. Update prize pool
        await this.prisma.gameInstance.update({
          where: { id: lobbyId },
          data: { totalPrizePool: { increment: totalFee } },
        });

        // 3. Create one Ticket per card
        for (const templateId of templateIds) {
          await this.prisma.ticket.create({
            data: {
              user: { connect: { telegramId: userId } },
              instance: { connect: { id: lobbyId } },
              template: { connect: { id: templateId } },
            },
          });
        }

        // 4. Store auto-feature flag in Redis
        const autoEnabled = templateIds.length >= AUTO_FEATURE_THRESHOLD;
        if (autoEnabled) {
          await this.redisClient.set(`auto:${lobbyId}:${userId}`, '1');
        }

        // 5. Mark as active
        await this.redisClient.sadd(`active:${lobbyId}`, userId);

        this.gateway.server.to(lobbyId).emit('playerConfirmed', {
          userId,
          cardCount: templateIds.length,
          autoEnabled,
        });
      } catch (e: any) {
        this.gateway.server.to(lobbyId).emit('lobbyKick', { userId, reason: 'Insufficient funds' });
        await this.redisClient.srem(playersKey, userId);
      }
    }

    const activeCount = await this.redisClient.scard(`active:${lobbyId}`);
    if (activeCount > 0) {
      this.startGameLoop(lobbyId);
    } else {
      await this.redisClient.set(`state:${lobbyId}`, 'LOBBY');
      await this.prisma.gameInstance.update({
        where: { id: lobbyId },
        data: { state: 'LOBBY' },
      });
      this.gateway.server.to(lobbyId).emit('gameState', {
        state: 'LOBBY',
        message: 'Game aborted — not enough players.',
        drawnNumbers: [],
      });
    }
  }

  private async startGameLoop(lobbyId: string) {
    const stateKey = `state:${lobbyId}`;
    await this.redisClient.set(stateKey, 'IN_PROGRESS');
    await this.prisma.gameInstance.update({
      where: { id: lobbyId },
      data: { state: 'IN_PROGRESS', startedAt: new Date() },
    });
    this.gateway.server.to(lobbyId).emit('gameState', { state: 'IN_PROGRESS', drawnNumbers: [] });

    const loopInterval = setInterval(async () => {
      const currentState = await this.redisClient.get(stateKey);
      if (currentState !== 'IN_PROGRESS') {
        clearInterval(loopInterval);
        return;
      }
      await this.drawAndCheckAutoWin(lobbyId);
    }, 4000); // 4 seconds as per PRD
  }

  async handlePlayerDisconnect(userId: string) {
    const userSessionKey = `session:${userId}`;
    const lobbyId = await this.redisClient.get(userSessionKey);
    if (!lobbyId) return;

    const stateKey = `state:${lobbyId}`;
    const currentState = await this.redisClient.get(stateKey);

    if (!currentState || currentState === 'LOBBY' || currentState === 'COUNTDOWN') {
      // Release all card reservations
      const userCardsKey = `usercards:${lobbyId}:${userId}`;
      const cardIds = await this.redisClient.smembers(userCardsKey);
      for (const cardId of cardIds) {
        await this.redisClient.del(`reserve:${lobbyId}:${cardId}`);
      }
      await this.redisClient.del(userCardsKey);
      await this.redisClient.srem(`players:${lobbyId}`, userId);

      // Abort countdown if not enough players remain
      const playerCount = await this.redisClient.scard(`players:${lobbyId}`);
      if (playerCount < 2) {
        await this.abortCountdownIfNeeded(lobbyId);
      }

      console.log(`Cleared reservations for disconnected user ${userId} in lobby ${lobbyId}`);
    }

    await this.redisClient.del(userSessionKey);
  }

  /**
   * Stores the user's current lobby session for disconnect tracking.
   */
  async trackUserSession(userId: string, lobbyId: string): Promise<void> {
    await this.redisClient.set(`session:${userId}`, lobbyId, 'EX', 3600);
  }

  /**
   * Draws a cryptographically secure random number and:
   * 1. Broadcasts it to all players in the lobby.
   * 2. Auto-checks win for any player with 3+ cards.
   */
  private async drawAndCheckAutoWin(lobbyId: string) {
    const drawnSetKey = `drawn:${lobbyId}`;

    let isUnique = false;
    let drawnNum = 0;

    while (!isUnique) {
      drawnNum = randomInt(1, 76);
      const exists = await this.redisClient.sismember(drawnSetKey, drawnNum.toString());
      if (exists === 0) {
        await this.redisClient.sadd(drawnSetKey, drawnNum.toString());
        isUnique = true;
      }
    }

    const bingoString = this.mapNumberToLetter(drawnNum);
    const audioUrl = AmharicTtsUtil.getAudioUrl(bingoString);

    if (this.gateway) {
      this.gateway.broadcastNumber(lobbyId, bingoString, audioUrl);
    }

    // Auto-BINGO check for users who have 3+ cards
    const activeUsers = await this.redisClient.smembers(`active:${lobbyId}`);
    const autoWinners: string[] = [];
    for (const userId of activeUsers) {
      const hasAuto = await this.redisClient.get(`auto:${lobbyId}:${userId}`);
      if (hasAuto) {
        const won = await this.checkAutoWin(userId, lobbyId);
        if (won) autoWinners.push(userId);
      }
    }

    if (autoWinners.length > 0) {
      await this.processWin(autoWinners, lobbyId);
    }
  }

  /**
   * Resolves a Telegram user ID to the internal User UUID used in the DB.
   * Ticket.userId references User.id (UUID), not User.telegramId.
   */
  private async getDbUserId(telegramId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  /**
   * Checks all tickets owned by a user in a lobby for a win.
   * Called automatically for 3+ card users after each draw.
   */
  private async checkAutoWin(telegramId: string, lobbyId: string): Promise<boolean> {
    const drawnSetKey = `drawn:${lobbyId}`;
    const drawnNumbers = await this.redisClient.smembers(drawnSetKey);

    // Ticket.userId is the User UUID, not the Telegram ID
    const dbUserId = await this.getDbUserId(telegramId);
    if (!dbUserId) return false;

    const tickets = await this.prisma.ticket.findMany({
      where: { userId: dbUserId, gameInstanceId: lobbyId },
      include: { template: true },
    });

    if (tickets.length < 3) return false; // Enforce 3+ ticket rule for auto-win

    for (const ticket of tickets) {
      if (!ticket.template) continue;
      const grid = this.normalizeGrid(ticket.template.gridDefinition as any);
      const matrix = this.gridToMatrix(grid);
      const drawnInts = this.parseDrawnNumbers(drawnNumbers);
      const won = BingoMatrixUtil.checkWinningPattern(matrix, drawnInts);

      if (won) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Verifies a manual BINGO claim. Checks ALL tickets the user owns in the lobby.
   */
  async claimBingo(telegramId: string, lobbyId: string): Promise<boolean> {
    const drawnSetKey = `drawn:${lobbyId}`;
    const drawnNumbers = await this.redisClient.smembers(drawnSetKey);

    // Ticket.userId is the User UUID, not the Telegram ID
    const dbUserId = await this.getDbUserId(telegramId);
    if (!dbUserId) throw new BadRequestException('User not found');

    const tickets = await this.prisma.ticket.findMany({
      where: { userId: dbUserId, gameInstanceId: lobbyId },
      include: { template: true },
    });

    if (!tickets.length) {
      throw new BadRequestException('No active tickets found');
    }

    const drawnInts = this.parseDrawnNumbers(drawnNumbers);

    for (const ticket of tickets) {
      if (!ticket.template) continue;
      const grid = this.normalizeGrid(ticket.template.gridDefinition as any);
      const matrix = this.gridToMatrix(grid);
      const won = BingoMatrixUtil.checkWinningPattern(matrix, drawnInts);
      if (won) {
        await this.processWin([telegramId], lobbyId);
        return true;
      }
    }

    // False BINGO penalty
    await this.redisClient.srem(`active:${lobbyId}`, telegramId);
    this.gateway.server.to(lobbyId).emit('falseBingo', { userId: telegramId });
    throw new BadRequestException('False Bingo! You have been removed from the game.');
  }

  private async processWin(userIds: string[], lobbyId: string): Promise<void> {
    const stateKey = `state:${lobbyId}`;
    const alreadyFinished = await this.redisClient.get(stateKey);
    if (alreadyFinished === 'FINISHED') return;

    await this.redisClient.set(stateKey, 'FINISHED');

    const instance = await this.prisma.gameInstance.findUnique({ where: { id: lobbyId } });
    if (instance && userIds.length > 0) {
      const prizePool = instance.totalPrizePool;
      const houseRake = prizePool.mul(0.15);
      const payout = prizePool.sub(houseRake).div(userIds.length);

      for (const winnerId of userIds) {
        await this.walletsService.refundGameFee(winnerId, payout, lobbyId);
      }

      await this.prisma.gameInstance.update({
        where: { id: lobbyId },
        data: {
          state: 'FINISHED',
          finishedAt: new Date(),
          houseRevenue: houseRake,
        },
      });
    }

    this.gateway.server.to(lobbyId).emit('gameState', {
      state: 'FINISHED',
      winnerId: userIds[0], // Can be expanded in UI to show multiple winners
    });
  }

  /** Draws a number and broadcasts (also used in tests). */
  async drawSecureNumber(gameInstanceId: string) {
    await this.drawAndCheckAutoWin(gameInstanceId);
  }

  /**
   * Parses drawn numbers from Redis.
   * Numbers are stored as plain integer strings (e.g. "15", "42") —
   * NOT as "B-15" strings (those are only used for the broadcast payload).
   */
  private parseDrawnNumbers(drawnNumbers: string[]): number[] {
    return drawnNumbers.map(str => parseInt(str, 10)).filter(n => !isNaN(n));
  }

  private gridToMatrix(grid: any): (number | string)[][] {
    const matrix: (number | string)[][] = [];
    for (let i = 0; i < 5; i++) {
      matrix.push([
        grid.B[i],
        grid.I[i],
        grid.N[i] === 0 ? 'FREE' : grid.N[i],
        grid.G[i],
        grid.O[i],
      ]);
    }
    return matrix;
  }

  private async checkWinningPattern(ticketId: string, drawnNumbers: string[]): Promise<boolean> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { template: true },
    });
    if (!ticket || !ticket.template) return false;
    const grid = this.normalizeGrid(ticket.template.gridDefinition as any);
    const matrix = this.gridToMatrix(grid);
    const drawnInts = this.parseDrawnNumbers(drawnNumbers);
    return BingoMatrixUtil.checkWinningPattern(matrix, drawnInts);
  }

  private mapNumberToLetter(num: number): string {
    if (num <= 15) return `B-${num}`;
    if (num <= 30) return `I-${num}`;
    if (num <= 45) return `N-${num}`;
    if (num <= 60) return `G-${num}`;
    return `O-${num}`;
  }
}
