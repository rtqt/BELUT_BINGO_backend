import { Test, TestingModule } from '@nestjs/testing';
import { BingoGateway } from './bingo.gateway';
import { BingoService } from './bingo.service';
import { Socket } from 'socket.io';

describe('BingoGateway', () => {
  let gateway: BingoGateway;

  const mockBingoService = {
    handlePlayerDisconnect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BingoGateway,
        {
          provide: BingoService,
          useValue: mockBingoService,
        },
      ],
    }).compile();

    gateway = module.get<BingoGateway>(BingoGateway);

    // Mock the WebSocket server
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinLobby', () => {
    it('should add the client to the correct lobby room', () => {
      const mockClient = {
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as Socket;

      const payload = { lobbyId: 'BINGO_10' };

      gateway.handleJoinLobby(mockClient, payload);

      expect(mockClient.join).toHaveBeenCalledWith('BINGO_10');
      expect(mockClient.emit).toHaveBeenCalledWith('lobbyJoined', {
        lobbyId: 'BINGO_10',
        status: 'success',
      });
    });
  });

  describe('broadcastNumber', () => {
    it('should emit numberDrawn event to the specified lobby', () => {
      const mockEmit = jest.fn();
      (gateway as any).server.to.mockReturnValue({ emit: mockEmit });

      gateway.broadcastNumber('BINGO_10_INSTANCE', 'N-42', 'https://translate.google.com/tts?q=N+42');

      expect((gateway as any).server.to).toHaveBeenCalledWith('BINGO_10_INSTANCE');
      expect(mockEmit).toHaveBeenCalledWith('numberDrawn', {
        number: 'N-42',
        audioUrl: 'https://translate.google.com/tts?q=N+42',
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should call handlePlayerDisconnect when an authenticated user disconnects', async () => {
      const mockClient = {
        data: { user: { id: 123 } },
      } as unknown as Socket;

      await gateway.handleDisconnect(mockClient);

      expect(mockBingoService.handlePlayerDisconnect).toHaveBeenCalledWith('123');
    });

    it('should not throw if unauthenticated client disconnects', async () => {
      const mockClient = {
        data: {},
      } as unknown as Socket;

      await expect(gateway.handleDisconnect(mockClient)).resolves.not.toThrow();
      expect(mockBingoService.handlePlayerDisconnect).not.toHaveBeenCalled();
    });
  });
});
