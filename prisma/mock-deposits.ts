import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/belut_bingo?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Creating 5 mock deposits...');
  for (let i = 1; i <= 5; i++) {
    const txId = `MOCK_TXN_${i}`;
    try {
      await prisma.transaction.create({
        data: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: 100,
          externalTxId: txId,
          isClaimed: false,
        },
      });
      console.log(`Created deposit: ${txId}`);
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log(`Deposit ${txId} already exists. Skipping.`);
      } else {
        throw e;
      }
    }
  }
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
