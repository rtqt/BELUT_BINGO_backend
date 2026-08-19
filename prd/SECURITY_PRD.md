# BELUT GAMES: Security & Anti-Cheat PRD

## 1. Overview
As a real-money gaming platform, **BELUT GAMES** is a high-value target for exploitation. This document defines the strict, unyielding security architectures—heavily inspired by Web3 Smart Contract design—that must be implemented in the NestJS backend to ensure the house is mathematically protected against cheating, double-spending, and state manipulation.

---

## 2. Server Authority (The "Dumb Client" Paradigm)
The Telegram Mini App (Frontend) must be treated as entirely compromised. Attackers will use memory editors and custom WebSocket clients to attempt to send forged data.

- **Rule 1: No Client-Side Logic Checks.** The frontend *never* tells the backend "I won" or "I marked a number."
- **Rule 2: Read-Only WebSockets.** WebSockets are used strictly for the server to push data *down* to the client (e.g., `numberDrawn`, `gameFinished`). The client cannot emit gameplay state events upwards. 
- **Rule 3: Auto-Detection.** The NestJS backend independently cross-references every drawn number against the `Ticket` table in the database. When the backend detects a winning pattern (Line or 4 Corners), it unilaterally ends the game and credits the winner's wallet.

---

## 3. Deposit Security & The "Zero-Trust" Cross-Check
To prevent users from inflating deposits, faking SMS messages, or reusing old transaction IDs, the deposit architecture relies strictly on a **"Triple-Check" Validation** against our internal SMS Webhook database.

- **The Attack Vector:** A user pastes a completely fake, hand-typed SMS into the bot, or they try to submit a legitimate Transaction ID that they already claimed yesterday.
- **The Extraction:** If a user sends `/claim [ENTIRE_SMS_TEXT]`, the Telegram bot uses Regex to scan the text and strictly extract the 10-character alphanumeric transaction ID (e.g., `DHE8RS6FT8`). It completely discards the rest of the user's text.
- **The "Triple-Check" Defense:**
  1. **Existence Check:** The backend queries the `Transaction` table for `DHE8RS6FT8`. (Crucially, real transactions are inserted into this table *autonomously* by your Android SMS Forwarder app catching real bank SMSs). If the ID doesn't exist in our DB, the claim is rejected as fake.
  2. **Duplicate/Replay Check:** If the ID exists, the system checks the `isClaimed` boolean. If `isClaimed === true`, the user is trying to reuse an old transaction, and it is rejected.
  3. **Atomic Execution:** If it passes, the backend starts a Prisma `$transaction`. It updates the row to `isClaimed = true`, and then credits the user's wallet with the exact `amountReceived` that the *Android Forwarder* logged (ignoring whatever amount the user's pasted text claimed).

---

## 4. Atomic Transactions & Race Condition Prevention
Inspired by the Solidity **Checks-Effects-Interactions (CEI)** pattern, we must prevent double-spending where a user clicks "Start Game" and "Withdraw" simultaneously.

- **Row-Level Locking:** During the 40-second countdown resolution (when the game starts), the system must use Prisma's `$transaction` wrapper.
- It will execute a `SELECT ... FOR UPDATE` on the user's wallet row. This locks the row at the database level.
- **Checks:** Does the `user.balance` cover the reserved tickets?
- **Effects:** Deduct the balance.
- **Interactions:** Finalize the game entry.
- *Result:* If a parallel withdrawal request comes in, it will be blocked by the database lock until the game entry deduction is completed, at which point the withdrawal check will fail due to insufficient funds.

---

## 5. Cryptographic Random Number Generation (RNG)
Standard `Math.random()` in Node.js is predictable. An attacker who knows the server's uptime could mathematically predict the exact sequence of all 75 numbers and only buy tickets that match that sequence.

- **The Defense:** The backend must exclusively use Node.js's `crypto` module (e.g., `crypto.randomInt()`) to generate the Bingo numbers. This provides Cryptographically Secure Pseudo-Random Number Generation (CSPRNG), ensuring absolute unpredictability.

---

## 6. Application-Layer DoS & Abuse Protection
Because the platform runs fast-paced lobbies (40-second countdowns) and supports multiple entry tiers, it is vulnerable to malicious stalling.

- **Reservation Expiry:** As specified in the Gameplay PRD, a user reserving a card locks it. To prevent a bot account from reserving all 200 cards in the 50 ETB lobby and holding them hostage, reservations strictly expire in **60 seconds** if the "Start Game" button is not pressed.
- **GraphQL Rate Limiting:** Apply strict rate limits to the `@nestjs/graphql` endpoints. A user is physically incapable of making 50 `reserveTicket` mutations per second. Throttle these requests at the API Gateway or Middleware layer to prevent database exhaustion.
- **Velocity Restrictions:** There are *no* limits on how many games a legitimate player can play as long as they have funds, but instantaneous API flooding must result in a temporary IP/Telegram ID ban.
