# BELUT GAMES: Database Schema Specification

This document defines the official Prisma schema for the PostgreSQL database powering BELUT GAMES. It translates all rules from the PRDs into normalized, strongly-typed database models.

---

## Prisma Schema

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ---------------------------------------------------------
// 1. IDENTITY & WALLETS
// ---------------------------------------------------------

model User {
  id                      String   @id @default(uuid())
  telegramId              String   @unique
  telebirrPhone           String?  @unique
  
  // 1-to-1 Relationship with Wallet
  wallet                  Wallet?
  
  // Referrals
  referredById            String?
  referredBy              User?    @relation("Referrals", fields: [referredById], references: [id])
  referredUsers           User[]   @relation("Referrals")

  // Account Security
  isActive                Boolean  @default(true)
  isBanned                Boolean  @default(false)
  banReason               String?

  // Relationships
  tickets                 Ticket[]
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}

model Wallet {
  id                      String   @id @default(uuid())
  userId                  String   @unique
  user                    User     @relation(fields: [userId], references: [id])
  
  balance                 Decimal  @default(0.00) @db.Decimal(10, 2)
  wagerRequirementBalance Decimal  @default(0.00) @db.Decimal(10, 2)
  
  transactions            Transaction[]
  
  updatedAt               DateTime @updatedAt
}

// ---------------------------------------------------------
// 2. FINANCIAL LEDGER
// ---------------------------------------------------------

enum TxType {
  DEPOSIT
  WITHDRAWAL
  P2P_SEND
  P2P_RECEIVE
  GAME_FEE
  GAME_WIN
  REFERRAL_BONUS
}

enum TxStatus {
  PENDING
  COMPLETED
  REJECTED
}

model Transaction {
  id               String   @id @default(uuid())
  walletId         String
  wallet           Wallet   @relation(fields: [walletId], references: [id])
  
  type             TxType
  amount           Decimal  @db.Decimal(10, 2)
  status           TxStatus
  
  // Audit Trail
  balanceAfter     Decimal? @db.Decimal(10, 2)
  
  // Webhook Security & Audit
  externalTxId     String?  @unique
  senderPhone      String?
  senderName       String?
  isClaimed        Boolean  @default(false)
  
  createdAt        DateTime @default(now())
}

// ---------------------------------------------------------
// 3. GAME ARCHITECTURE
// ---------------------------------------------------------

enum GameStatus {
  DEMO
  LIVE
  DISABLED
}

model GameModule {
  id          String       @id // e.g., 'BINGO_10', 'BINGO_20'
  name        String
  entryFee    Decimal      @db.Decimal(10, 2)
  status      GameStatus   @default(DEMO)
  
  instances   GameInstance[]
}

enum InstanceState {
  LOBBY
  COUNTDOWN
  IN_PROGRESS
  FINISHED
}

model GameInstance {
  id             String        @id @default(uuid())
  gameModuleId   String
  module         GameModule    @relation(fields: [gameModuleId], references: [id])
  
  state          InstanceState @default(LOBBY)
  drawnNumbers   String[]      // e.g., ["B-1", "O-65"]
  
  startedAt      DateTime?
  finishedAt     DateTime?
  
  // Financial Reporting
  totalPrizePool Decimal    @default(0.00) @db.Decimal(10, 2)
  houseRevenue   Decimal    @default(0.00) @db.Decimal(10, 2)
  
  tickets        Ticket[]
}

// ---------------------------------------------------------
// 4. BINGO SPECIFICS
// ---------------------------------------------------------

model CardTemplate {
  id             Int      @id @default(autoincrement()) // 1 to 200
  gridDefinition Json     // Structure: { B: [1,5...], I: [...], N: [...], G: [...], O: [...] }
  
  tickets        Ticket[]
}

model Ticket {
  id               String       @id @default(uuid())
  userId           String
  user             User         @relation(fields: [userId], references: [id])
  
  gameInstanceId   String
  instance         GameInstance @relation(fields: [gameInstanceId], references: [id])
  
  cardTemplateId   Int
  template         CardTemplate @relation(fields: [cardTemplateId], references: [id])
  
  isReady          Boolean      @default(false)
  isWinner         Boolean      @default(false)
  wonAt            DateTime?
  
  // Rule Enforcement: No two players can select the same card in the same game round
  @@unique([gameInstanceId, cardTemplateId])
}
```
