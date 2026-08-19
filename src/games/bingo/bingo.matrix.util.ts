export class BingoMatrixUtil {
  /**
   * Evaluates a 5x5 Bingo Card grid against an array of drawn numbers to
   * determine if a valid winning pattern (Line or Corners) has been achieved.
   *
   * @param grid - A 5x5 array containing numbers and the 'FREE' string.
   * @param drawnNumbers - An array of integer numbers drawn by the server.
   * @returns boolean - True if a winning condition is met.
   */
  static checkWinningPattern(
    grid: (number | string)[][],
    drawnNumbers: number[],
  ): boolean {
    // Helper to check if a specific cell is marked
    const isMarked = (r: number, c: number): boolean => {
      const cell = grid[r][c];
      return cell === 'FREE' || drawnNumbers.includes(cell as number);
    };

    // 1. Check Horizontal Rows
    for (let r = 0; r < 5; r++) {
      let rowWin = true;
      for (let c = 0; c < 5; c++) {
        if (!isMarked(r, c)) {
          rowWin = false;
          break;
        }
      }
      if (rowWin) return true;
    }

    // 2. Check Vertical Columns
    for (let c = 0; c < 5; c++) {
      let colWin = true;
      for (let r = 0; r < 5; r++) {
        if (!isMarked(r, c)) {
          colWin = false;
          break;
        }
      }
      if (colWin) return true;
    }

    // 3. Check Diagonals
    let diag1Win = true;
    let diag2Win = true;
    for (let i = 0; i < 5; i++) {
      if (!isMarked(i, i)) diag1Win = false; // Top-Left to Bottom-Right
      if (!isMarked(i, 4 - i)) diag2Win = false; // Top-Right to Bottom-Left
    }
    if (diag1Win || diag2Win) return true;

    // 4. Check Four Corners
    const cornersWin =
      isMarked(0, 0) && // Top-Left
      isMarked(0, 4) && // Top-Right
      isMarked(4, 0) && // Bottom-Left
      isMarked(4, 4);   // Bottom-Right

    if (cornersWin) return true;

    return false;
  }
}
