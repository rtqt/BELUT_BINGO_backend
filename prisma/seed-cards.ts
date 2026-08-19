import { randomInt } from 'crypto';
import * as fs from 'fs';

/**
 * Helper to generate an array of unique random numbers within a range.
 */
function generateUniqueNumbers(min: number, max: number, count: number): number[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(randomInt(min, max + 1)); // randomInt is max-exclusive, so +1
  }
  return Array.from(nums);
}

/**
 * Generates a valid 75-Ball Bingo 5x5 grid with the center marked as 'FREE'.
 */
function generateCardGrid(): (number | string)[][] {
  const b = generateUniqueNumbers(1, 15, 5);
  const i = generateUniqueNumbers(16, 30, 5);
  const n = generateUniqueNumbers(31, 45, 5); // We draw 5, but overwrite index 2 with FREE
  const g = generateUniqueNumbers(46, 60, 5);
  const o = generateUniqueNumbers(61, 75, 5);

  const grid: (number | string)[][] = [
    [b[0], i[0], n[0], g[0], o[0]],
    [b[1], i[1], n[1], g[1], o[1]],
    [b[2], i[2], 'FREE', g[2], o[2]], // Center is always FREE
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

  // We write them to a JSON payload which can be imported safely or seeded via Prisma later
  fs.writeFileSync('prisma/v1-cards.json', JSON.stringify(cards, null, 2));
  console.log('Successfully generated 200 mathematically unique cards!');
  console.log('Saved to: prisma/v1-cards.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
