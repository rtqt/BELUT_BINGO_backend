# BELUT GAMES: Product Requirements Document (PRD)

## 1. Executive Summary

**Problem Statement:** Ethiopian smartphone users lack a centralized, frictionless ecosystem for casual gaming that integrates seamlessly with familiar platforms and local mobile money. Single-game applications suffer from low long-term retention.
**Proposed Solution:** **BELUT GAMES**, a unified Telegram Gaming Platform. The platform provides a centralized wallet and a main "Arcade Lobby" where users can access various games. The underlying architecture supports unlimited game modules (Bingo, Chess, etc.), but the initial **MVP (V1) will launch exclusively with Bingo** to get to market quickly.
**Success Criteria (V1):**
- Achieve **200 active users** during the MVP phase.
- Generate **2,000 ETB** in total revenue.

---

## 2. Business Model Canvas

By pivoting from a single-game bot to a unified platform, we significantly increase user Lifetime Value (LTV).

- **Key Partners**: Telegram (Platform). (Note: Telebirr is the payment rail, but we use SMS interception, not direct API partnership).
- **Key Activities**: Platform maintenance, SMS webhook monitoring, modular game development, fraud prevention.
- **Key Resources**: Node.js Backend, PostgreSQL Database, Android SMS Forwarding Gateway.
- **Value Proposition**: A frictionless gaming hub directly inside Telegram. Deposit once, play any game. Amharic UI localization (e.g., using "ካርቴላ" for Bingo). No app downloads required.
- **Customer Relationships**: Automated bot interactions, unified platform leaderboards, incentivized referral engine.
- **Channels**: Telegram Bot, Word of Mouth (via Referrals).
- **Customer Segments**: Ethiopian smartphone users who use Telegram and Telebirr.
- **Cost Structure**: Server hosting, Android SMS gateway device upkeep, promotional bonuses.
- **Revenue Streams**: **The Rake:** The house takes a fixed percentage (e.g., 10% to 15%) of the entry fees/prize pool across all games on the platform.

---

## 3. User Experience & Functionality

### Platform Flow (The Hub)

**1. The Arcade Lobby & Leaderboard**
- **Story**: As a player, I want to see my balance and choose which game to play from a central menu.
- **AC**: The bot responds to `/start` with the "BELUT GAMES Arcade Lobby".
- **AC**: Displays the user's Central Wallet Balance.
- **AC**: Displays a **Unified Leaderboard** that ranks top earners/players across *all* games on the platform.
- **AC**: User can click "Play Bingo" (MVP) to enter the specific game module.

**2. Centralized Deposits & Bonuses**
- **Story**: As a player, I want to deposit money into my central wallet to use on any game.
- **AC**: Player sends money via Telebirr and submits `/claim [TX_ID]` to the bot.
- **AC**: System verifies `TX_ID` via the SMS parser (see Technical Specs) and credits the wallet.
- **AC**: **Bonus Tier 1:** Exactly 50 ETB deposit = 5 ETB bonus.
- **AC**: **Bonus Tier 2:** Exactly 100 ETB deposit = 10 ETB bonus.

**3. Global Referral Engine**
- **Story**: As a referrer, I want to invite friends to BELUT GAMES and earn rewards.
- **AC**: Player uses `/refer` to get a platform-wide link.
- **AC**: The referrer is credited **5 ETB** *only after* the referred user plays their first paid game (whether it's Bingo or a future game).

### Modular Game Flow: Bingo (V1)
- **Story**: As a player, I want to play Bingo using my central wallet funds.
- **AC**: Inside the Bingo menu, player buys a "ካርቴላ" (ticket).
- **AC**: Entry fee is deducted from the central wallet.
- **AC**: A unique 5x5 matrix is generated. The bot calls numbers every 10 seconds, auto-detects winners, and credits the central wallet.

### Non-Goals (MVP)
- No additional games (Chess, etc.) will be launched in V1.
- No direct B2C API integration for Telebirr payouts (manual payouts for MVP).

---

## 4. Technical Architecture & SMS Checking Logic

- **Backend Architecture**: NestJS (Node.js/TypeScript) for a highly modular, scalable platform architecture.
- **API & Real-time**: GraphQL with Apollo (for strict typing and structured querying) and WebSockets (for real-time game events, such as live Bingo number streaming).
- **Database (PostgreSQL via Prisma)**: Must include modular tables (`Game`, `Transaction`, `Ticket`). Transactions and tickets must reference a `gameId` to track revenue sources.
- **Payment Gateway (SMS Interception)**: Telebirr deposits are handled by parsing incoming SMS webhooks from an Android forwarder device.

### The Extraction Logic
The following TypeScript logic will extract data points from the raw Telebirr SMS sent by the Android forwarder:

```typescript
const incomingSms = `Dear Adam 
You have received ETB 10.00 from Wondale Begizaw(2519****3201)  on 14/08/2026 08:53:32. Your transaction number is DHE8RS6FT8. Your current E-Money Account balance is ETB 502.63.
Thank you for using telebirr
Ethio telecom`;

// Regex Pattern for data extraction
const telebirrPattern = /received ETB\s+(?<amount>[\d,.]+)\s+from\s+(?<sender>[A-Za-z\s]+?)\((?<phone>\d+\*+\d+)\)\s+on\s+(?<date>[\d\/\s:]+)\.\s+Your transaction number is\s+(?<txId>[A-Z0-9]+)/i;

const match = incomingSms.match(telebirrPattern);

if (match && match.groups) {
    const transactionData = {
        transactionId: match.groups.txId,           // "DHE8RS6FT8"
        amountReceived: parseFloat(match.groups.amount), // 10.00
        senderName: match.groups.sender.trim(),     // "Wondale Begizaw"
        senderPhoneMasked: match.groups.phone,      // "2519****3201"
        date: match.groups.date.trim(),             // "14/08/2026 08:53:32"
        isClaimed: false                            // Flag for your database
    };
    // Insert 'transactionData' into database
}
```

### Business Logic Defense: The Triple Check
When a user submits `/claim [TX_ID]` via Telegram, the backend must execute the **Triple Check** before crediting funds:
1. **Does the transaction exist?** (Lookup by `transactionId`).
2. **Is `isClaimed === false`?**
3. **Does `amountReceived` match expectations?** (If a game requires 50 ETB, and the deposit was 10 ETB, handle partial wallet credit correctly).
*The Lock:* Update the row to `isClaimed: true` inside a strict database transaction before crediting the Telegram user's wallet.

### The Withdrawal Logic (MVP - Manual Payouts)
Since V1 avoids direct B2C API integration with Telebirr, withdrawals are handled securely via an Admin Queue system to ensure funds aren't double-spent.

**The Fulfillment Flow:**
1. **User Command:** The player requests a payout by sending `/withdraw [amount] [phone_number]`.
2. **Business Logic Defense (Triple Check):**
   - **Balance Check:** `user.balance >= requestedAmount`.
   - **Minimum Threshold:** `requestedAmount >= 50` (prevents overwhelming the admin with micro-transactions).
   - **Type Check:** `requestedAmount` must be a positive, absolute integer (prevents negative amount float manipulation).
3. **Atomic Deduction:** Using a Prisma `$transaction`, the system immediately deducts `requestedAmount` from `user.balance` and creates a `Withdrawal` record in the database with `status: "PENDING"`. *This is critical: it prevents the user from using those funds to buy a game ticket while the withdrawal is processing.*
4. **Admin Queue:** The bot forwards a formatted alert to a private Admin Telegram Group:
   ```text
   🚨 NEW WITHDRAWAL REQUEST
   ID: W-10293
   User ID: 123456789
   Amount: 200 ETB
   Telebirr Phone: 0911234567
   ```
   The bot attaches two Inline Keyboard Buttons to this message: `[ ✅ Mark as Paid ]` and `[ ❌ Reject & Refund ]`.
5. **Manual Payout:** 
   - The Admin opens their personal Telebirr app and manually transfers 200 ETB to `0911234567`.
   - Once sent, the Admin clicks `[ ✅ Mark as Paid ]` in Telegram. The backend updates the record to `status: "COMPLETED"` and notifies the user.
   - *If rejected* (e.g., the phone number is unregistered), clicking `[ ❌ Reject & Refund ]` atomically restores the 200 ETB to the user's wallet and updates the status to `REJECTED`.

---

## 5. Security & Business Logic Vulnerabilities

| Threat / Vulnerability | Attack Vector | Mitigation Strategy |
| :--- | :--- | :--- |
| **Transaction Replay** | User claims the same `TX_ID` from a secondary account. | The Triple Check (see above) enforces `isClaimed === false`. DB strictly enforces `UNIQUE` on `transactionId`. |
| **Concurrency / Race Conditions** | User clicks "Buy Ticket" 50 times in one second. | Use Prisma `$transaction` with row-level locking (`SELECT ... FOR UPDATE`). Deduct balance and register game entry atomically. |
| **Referral Loop Abuse** | Attacker creates fake accounts, deposits, and withdraws immediately to farm the 5 ETB bonus. | Bonus is state-dependent; credited *only after* the referee's `gamesPlayed` count transitions from 0 to 1. |
| **Webhook Forgery** | Attacker sends fake POST requests directly to the webhook endpoint. | The Android forwarder app must include a strong secret token in the headers. Backend rejects requests without it. |
| **Regex / SMS Spoofing** | Attacker spoofs an SMS to the forwarder phone. | Android forwarder app is strictly configured to only accept messages from sender `127` (Telebirr). |

---

## 6. Risks & Roadmap

- **Phase 1 (V1)**: Launch **BELUT GAMES Platform** + **Bingo** module. Manual payouts, SMS gateway deposits.
- **Phase 2 (V1.x)**: Develop and plug in new casual games (Chess, Tic-Tac-Toe) using the existing Central Wallet.
- **Phase 3 (V2.0)**: Telebirr API integration for automated B2C withdrawals.
