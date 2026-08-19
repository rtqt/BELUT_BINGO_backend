"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
function generateUniqueNumbers(min, max, count) {
    const nums = new Set();
    while (nums.size < count) {
        nums.add((0, crypto_1.randomInt)(min, max + 1));
    }
    return Array.from(nums);
}
function generateCardGrid() {
    const b = generateUniqueNumbers(1, 15, 5);
    const i = generateUniqueNumbers(16, 30, 5);
    const n = generateUniqueNumbers(31, 45, 5);
    const g = generateUniqueNumbers(46, 60, 5);
    const o = generateUniqueNumbers(61, 75, 5);
    const grid = [
        [b[0], i[0], n[0], g[0], o[0]],
        [b[1], i[1], n[1], g[1], o[1]],
        [b[2], i[2], 'FREE', g[2], o[2]],
        [b[3], i[3], n[3], g[3], o[3]],
        [b[4], i[4], n[4], g[4], o[4]],
    ];
    return grid;
}
async function main() {
    console.log('Generating 200 unique Bingo Cards for V1 Launch...');
    const cards = [];
    for (let c = 1; c <= 200; c++) {
        cards.push({
            id: `CARD_V1_${c.toString().padStart(3, '0')}`,
            grid: generateCardGrid()
        });
    }
    fs.writeFileSync('prisma/v1-cards.json', JSON.stringify(cards, null, 2));
    console.log('Successfully generated 200 mathematically unique cards!');
    console.log('Saved to: prisma/v1-cards.json');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=seed-cards.js.map