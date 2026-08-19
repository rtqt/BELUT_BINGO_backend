import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/belut_bingo?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Database with GameModules and CardTemplates...');

  // 1. Seed Game Modules
  await prisma.gameModule.upsert({
    where: { id: 'BINGO_10' },
    update: { status: 'LIVE', entryFee: 10.00 },
    create: {
      id: 'BINGO_10',
      name: 'Bingo 10 ETB',
      entryFee: 10.00,
      status: 'LIVE'
    }
  });

  await prisma.gameModule.upsert({
    where: { id: 'BINGO_20' },
    update: { status: 'LIVE', entryFee: 20.00 },
    create: {
      id: 'BINGO_20',
      name: 'Bingo 20 ETB',
      entryFee: 20.00,
      status: 'LIVE'
    }
  });

  await prisma.gameModule.upsert({
    where: { id: 'BINGO_50' },
    update: { status: 'LIVE', entryFee: 50.00 },
    create: {
      id: 'BINGO_50',
      name: 'Bingo 50 ETB',
      entryFee: 50.00,
      status: 'LIVE'
    }
  });

  // 2. Load and Seed V1 Cards
  if (fs.existsSync('prisma/v1-cards.json')) {
    const cardsData = JSON.parse(fs.readFileSync('prisma/v1-cards.json', 'utf8'));
    let inserted = 0;
    
    for (const card of cardsData) {
      // The grid in v1-cards is a 5x5 array. We convert to the object format expected by our GraphQL model.
      // B: [col0...], I: [col1...], N: [col2...], G: [col3...], O: [col4...]
      const b = [card.grid[0][0], card.grid[1][0], card.grid[2][0], card.grid[3][0], card.grid[4][0]];
      const i = [card.grid[0][1], card.grid[1][1], card.grid[2][1], card.grid[3][1], card.grid[4][1]];
      const n = [card.grid[0][2], card.grid[1][2], card.grid[2][2], card.grid[3][2], card.grid[4][2]];
      const g = [card.grid[0][3], card.grid[1][3], card.grid[2][3], card.grid[3][3], card.grid[4][3]];
      const o = [card.grid[0][4], card.grid[1][4], card.grid[2][4], card.grid[3][4], card.grid[4][4]];

      const objGrid = { B: b, I: i, N: n, G: g, O: o };

      try {
        await prisma.cardTemplate.create({
          data: {
            gridDefinition: objGrid
          }
        });
        inserted++;
      } catch (e) {
        // Skip if exists
      }
    }
    console.log(`Seeded ${inserted} CardTemplates.`);
  }

  // 3. Create dummy users for testing
  await prisma.user.upsert({
    where: { telegramId: '123456789' },
    update: {},
    create: {
      telegramId: '123456789',
      telebirrPhone: '+251911111111',
      wallet: {
        create: {
          balance: 100.00
        }
      }
    }
  });
  
  await prisma.user.upsert({
    where: { telegramId: '987654321' },
    update: {},
    create: {
      telegramId: '987654321',
      telebirrPhone: '+251911222222',
      wallet: {
        create: {
          balance: 100.00
        }
      }
    }
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
