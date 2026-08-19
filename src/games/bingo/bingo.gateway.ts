import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../../core/auth/ws-auth.guard';
import { BingoService } from './bingo.service';

@WebSocketGateway({
  namespace: '/bingo',
  cors: {
    origin: '*',
  },
})
export class BingoGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => BingoService))
    private readonly bingoService: BingoService,
  ) {}

  async handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user && user.id) {
      await this.bingoService.handlePlayerDisconnect(user.id.toString());
    }
  }

  /**
   * Handles clients joining a specific matchmaking lobby room.
   * The server uses Socket.IO rooms to isolate broadcasts per game instance.
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinLobby')
  async handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lobbyId: string },
  ) {
    client.join(payload.lobbyId);

    const user = client.data?.user;
    if (user) {
      await this.bingoService.trackUserSession(user.id.toString(), payload.lobbyId);
    }

    client.emit('lobbyJoined', {
      lobbyId: payload.lobbyId,
      status: 'success',
    });
  }

  /**
   * Broadcasts a drawn number and its TTS audio URL to all clients in a lobby.
   * Called by the BingoService game loop every 4 seconds.
   */
  broadcastNumber(lobbyId: string, number: string, audioUrl: string) {
    this.server.to(lobbyId).emit('numberDrawn', { number, audioUrl });
  }

  /**
   * Toggles a card reservation for a player.
   *
   * On success, broadcasts cardToggled to everyone in the lobby (so all
   * players see which cards are taken) and sends the updated card list back
   * to the requesting player only.
   *
   * The countdown starts automatically inside BingoService once ≥ 2 distinct
   * players have at least one card reserved — no separate "setReady" step needed.
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('reserveCard')
  async handleReserveCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lobbyId: string; templateId: number },
  ) {
    const user = client.data?.user;
    if (!user) return;
    try {
      const result = await this.bingoService.toggleCardReservation(
        user.id.toString(),
        payload.lobbyId,
        payload.templateId,
      );

      // Broadcast reservation change to everyone in the lobby
      this.server.to(payload.lobbyId).emit('cardToggled', {
        templateId: payload.templateId,
        userId: user.id,
        action: result.action,
      });

      // Send updated card grids to this specific player only
      const grids = await this.bingoService.getUserCardGrids(user.id.toString(), payload.lobbyId);
      client.emit('myCardsUpdated', {
        templateIds: result.templateIds,
        grids,
      });
    } catch (e: any) {
      client.emit('cardReservedError', { message: e.message });
    }
  }

  /**
   * Manual BINGO claim.
   * The service validates the claim, pays out on a win, or penalises a false call.
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('callBingo')
  async handleCallBingo(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lobbyId: string },
  ) {
    const user = client.data?.user;
    if (!user) return;
    try {
      await this.bingoService.claimBingo(user.id.toString(), payload.lobbyId);
    } catch (e: any) {
      // claimBingo already emits falseBingo via server.to(); nothing more to do here.
    }
  }
}
