"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BingoMatrixUtil = void 0;
class BingoMatrixUtil {
    static checkWinningPattern(grid, drawnNumbers) {
        const isMarked = (r, c) => {
            const cell = grid[r][c];
            return cell === 'FREE' || drawnNumbers.includes(cell);
        };
        for (let r = 0; r < 5; r++) {
            let rowWin = true;
            for (let c = 0; c < 5; c++) {
                if (!isMarked(r, c)) {
                    rowWin = false;
                    break;
                }
            }
            if (rowWin)
                return true;
        }
        for (let c = 0; c < 5; c++) {
            let colWin = true;
            for (let r = 0; r < 5; r++) {
                if (!isMarked(r, c)) {
                    colWin = false;
                    break;
                }
            }
            if (colWin)
                return true;
        }
        let diag1Win = true;
        let diag2Win = true;
        for (let i = 0; i < 5; i++) {
            if (!isMarked(i, i))
                diag1Win = false;
            if (!isMarked(i, 4 - i))
                diag2Win = false;
        }
        if (diag1Win || diag2Win)
            return true;
        const cornersWin = isMarked(0, 0) &&
            isMarked(0, 4) &&
            isMarked(4, 0) &&
            isMarked(4, 4);
        if (cornersWin)
            return true;
        return false;
    }
}
exports.BingoMatrixUtil = BingoMatrixUtil;
//# sourceMappingURL=bingo.matrix.util.js.map