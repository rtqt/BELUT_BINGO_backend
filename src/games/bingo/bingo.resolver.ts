import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { TelegramAuthGuard } from '../../core/auth/telegram-auth.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WalletsService } from '../../core/wallets/wallets.service';
import { BingoService } from './bingo.service';
import { Ticket, BingoGrid } from './models/ticket.model';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class JoinLobbyResponse {
  @Field(() => String)
  gameInstanceId: string;
}

@Resolver(() => Ticket)
export class BingoResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
    private readonly bingoService: BingoService,
  ) {}

  /**
   * Returns the first active ticket belonging to the authenticated user
   * in the specified game instance, including the rendered bingo grid.
   */
  @UseGuards(TelegramAuthGuard)
  @Query(() => Ticket)
  async getMyTicket(
    @Args('gameId') gameId: string,
    @Context() context: any,
  ): Promise<Ticket> {
    const user = context.req.user;
    if (!user || !user.id) {
      throw new UnauthorizedException('User identity not found in Telegram token');
    }
    const telegramId = user.id.toString();

    // Find the user's ticket for this game (Ticket.userId = User.id UUID, not telegramId)
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        user: { telegramId },
        gameInstanceId: gameId,
      },
      include: { template: true },
    });

    if (!ticket || !ticket.template) {
      throw new BadRequestException('No active ticket found for this game');
    }

    const rawGrid = ticket.template.gridDefinition as any;

    // Normalize FREE center cell to 0 for GraphQL Int compatibility
    const normalizedN = (rawGrid.N as any[]).map((v: any) => (v === 'FREE' ? 0 : v));

    return {
      id: ticket.id,
      userId: telegramId,
      gameInstanceId: gameId,
      gridDefinition: {
        B: rawGrid.B,
        I: rawGrid.I,
        N: normalizedN,
        G: rawGrid.G,
        O: rawGrid.O,
      } as BingoGrid,
    };
  }

  /**
   * Finds or creates a LOBBY-state GameInstance for the requested module,
   * verifies the user has sufficient balance, and returns the instance ID.
   *
   * Fee is NOT deducted here — it is deducted atomically when the game
   * starts (inside processLobbyStart) to prevent balance lock-up if
   * the lobby is abandoned.
   */
  @UseGuards(TelegramAuthGuard)
  @Mutation(() => JoinLobbyResponse)
  async joinLobby(
    @Args('gameModuleId') gameModuleId: string,
    @Context() context: any,
  ): Promise<JoinLobbyResponse> {
    const user = context.req.user;
    if (!user || !user.id) {
      throw new UnauthorizedException('User identity not found in Telegram token');
    }

    const userId = user.id.toString();

    // 1. Fetch the Game Module to get the entry fee and verify it's live
    const module = await this.prisma.gameModule.findUnique({
      where: { id: gameModuleId },
    });

    if (!module || module.status !== 'LIVE') {
      throw new BadRequestException('Game module is not available');
    }

    // 2. Find an existing LOBBY-state GameInstance, or create a fresh one.
    //    Order by createdAt (not startedAt which is nullable) for stable ordering.
    let instance = await this.prisma.gameInstance.findFirst({
      where: { gameModuleId, state: 'LOBBY' },
      orderBy: { createdAt: 'desc' },
    });

    if (!instance) {
      instance = await this.prisma.gameInstance.create({
        data: { gameModuleId, state: 'LOBBY' },
      });
    }

    // 3. Balance check — actual deduction happens at game start, not here
    const userDb = await this.prisma.user.findUnique({
      where: { telegramId: userId },
      include: { wallet: true },
    });
    if (!userDb || !userDb.wallet || userDb.wallet.balance.lessThan(module.entryFee)) {
      throw new BadRequestException('Insufficient funds to join lobby');
    }

    return {
      gameInstanceId: instance.id,
    };
  }
}
