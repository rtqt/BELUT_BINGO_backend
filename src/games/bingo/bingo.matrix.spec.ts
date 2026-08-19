import { BingoMatrixUtil } from './bingo.matrix.util';

describe('BingoMatrixUtil', () => {
  const mockCardGrid = [
    [5, 23, 40, 52, 68], 
    [12, 18, 35, 47, 72], 
    [4, 28, 'FREE', 60, 65], 
    [15, 20, 31, 58, 62], 
    [2, 16, 42, 49, 75]  
  ];

  describe('checkWinningPattern', () => {
    it('should detect a Horizontal Line win', () => {
      // Row 1 is fully drawn
      const drawnNumbers = [12, 18, 35, 47, 72, 99];
      const isWinner = BingoMatrixUtil.checkWinningPattern(mockCardGrid, drawnNumbers);
      expect(isWinner).toBe(true);
    });

    it('should detect a Vertical Line win', () => {
      // Column 0 is fully drawn
      const drawnNumbers = [5, 12, 4, 15, 2];
      const isWinner = BingoMatrixUtil.checkWinningPattern(mockCardGrid, drawnNumbers);
      expect(isWinner).toBe(true);
    });

    it('should detect a Diagonal win (Top-Left to Bottom-Right) using FREE space', () => {
      // 5, 18, FREE, 58, 75
      const drawnNumbers = [5, 18, 58, 75];
      const isWinner = BingoMatrixUtil.checkWinningPattern(mockCardGrid, drawnNumbers);
      expect(isWinner).toBe(true);
    });

    it('should detect a 4-Corners win', () => {
      // Corners: [0][0]=5, [0][4]=68, [4][0]=2, [4][4]=75
      const drawnNumbers = [5, 68, 2, 75];
      const isWinner = BingoMatrixUtil.checkWinningPattern(mockCardGrid, drawnNumbers);
      expect(isWinner).toBe(true);
    });

    it('should return false if no winning condition is met', () => {
      const drawnNumbers = [5, 23, 40, 52]; // 1 short of top horizontal line
      const isWinner = BingoMatrixUtil.checkWinningPattern(mockCardGrid, drawnNumbers);
      expect(isWinner).toBe(false);
    });
  });
});
