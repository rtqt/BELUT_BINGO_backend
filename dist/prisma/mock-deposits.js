"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/belut_bingo?schema=public';
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
        }
        catch (e) {
            if (e.code === 'P2002') {
                console.log(`Deposit ${txId} already exists. Skipping.`);
            }
            else {
                throw e;
            }
        }
    }
    console.log('Done!');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=mock-deposits.js.map