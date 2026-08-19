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
require("dotenv/config");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/belut_bingo?schema=public';
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Seeding Database with GameModules and CardTemplates...');
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
    if (fs.existsSync('prisma/v1-cards.json')) {
        const cardsData = JSON.parse(fs.readFileSync('prisma/v1-cards.json', 'utf8'));
        let inserted = 0;
        for (const card of cardsData) {
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
            }
            catch (e) {
            }
        }
        console.log(`Seeded ${inserted} CardTemplates.`);
    }
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
//# sourceMappingURL=seed-db.js.map