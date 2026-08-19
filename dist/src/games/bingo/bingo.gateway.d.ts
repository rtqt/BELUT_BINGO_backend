import { OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BingoService } from './bingo.service';
export declare class BingoGateway implements OnGatewayDisconnect {
    private readonly bingoService;
    server: Server;
    constructor(bingoService: BingoService);
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinLobby(client: Socket, payload: {
        lobbyId: string;
    }): Promise<void>;
    broadcastNumber(lobbyId: string, number: string, audioUrl: string): void;
    handleReserveCard(client: Socket, payload: {
        lobbyId: string;
        templateId: number;
    }): Promise<void>;
    handleCallBingo(client: Socket, payload: {
        lobbyId: string;
    }): Promise<void>;
}
