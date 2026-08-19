# BELUT GAMES: Player Experience PRD

## 1. Overview
This document defines the exact capabilities, restrictions, and user journeys for players interacting with the **BELUT GAMES** Telegram Bot. It outlines the out-of-game experience, focusing on identity, wallet management, and peer-to-peer (P2P) interactions.

---

## 2. Registration & Identity
The platform aims for a frictionless onboarding experience utilizing Telegram's native data.

- **Automatic Account Creation:** A player's account is automatically created in the backend the moment they send `/start` to the bot. Their `telegramId` acts as their primary unique identifier.
- **Identity Verification (Mandatory):** To prevent fake bot accounts, users must first use Telegram's native **"Share Contact"** button to verify their Telegram phone number.
- **Financial Linking (Mandatory for Finance):** After verifying their identity, players must manually input their **Telebirr phone number** to unlock Deposits, Withdrawals, and P2P transfers.
  - *Identity Disconnect Handling:* The system anticipates that a user's Telegram phone number may differ entirely from their Telebirr phone number. The Telegram number is used strictly for Sybil-resistance, while the manual Telebirr number is used solely for financial routing.

---

## 3. The Main Menu (Bot UI)
When a user opens the bot (outside of a Mini App), they are presented with a persistent Inline Keyboard Menu:

1. **🎮 Play Games:** Opens the Web App launcher to select a game module (e.g., Bingo 10 ETB, 20 ETB, 50 ETB).
2. **💼 My Wallet:** Displays current virtual ETB balance and options to Deposit/Withdraw.
3. **💸 Send Money (P2P):** Initiates a peer-to-peer transfer.
4. **🏆 Leaderboard:** Displays the top players on the platform based on total winnings.

---

## 4. Wallet Capabilities (What Players CAN Do)
All funds on the platform are "Virtual ETB" stored in the NestJS database. 

### 4.1 Deposit & Withdraw
- **Deposit:** Players send real ETB via Telebirr. They use `/claim [TX_ID]` to convert it into Virtual ETB (validated securely via the Triple-Check system).
- **Withdraw:** Players request to convert Virtual ETB back to real ETB. This enters the Admin Queue for manual payout via Telebirr to their linked phone number.

### 4.2 P2P Balance Transfers
Players can send their Virtual ETB to other players instantly and with **zero fees**.
- **The Mechanism:** A player clicks "Send Money". The bot asks for the recipient's **Linked Phone Number** and the **Amount**.
- **Validation:** The backend verifies the target phone number exists in the database.
- **Atomic Execution:** The backend uses a Prisma `$transaction` to deduct the amount from the Sender's virtual wallet and instantly credit it to the Receiver's virtual wallet. 

---

## 5. Player Restrictions (What Players CANNOT Do)
To protect the platform from being exploited as an unregulated money transmitter or for money laundering, strict economic rules apply.

- **Rule 1: The Wager Requirement.** A player **cannot** deposit real ETB and immediately withdraw it. Funds must be played in a game (e.g., buying Bingo tickets) before they become eligible for withdrawal. (e.g., a 1x playthrough requirement).
- **Rule 2: P2P is not "Played" money.** Receiving Virtual ETB via a P2P transfer does *not* bypass the wager requirement. If Player A deposits 100 ETB and transfers it to Player B, Player B must still use that money to play games before they can withdraw it to their real Telebirr account.
- **Rule 3: Sybil Resistance.** The system strictly enforces a 1-to-1 mapping between a Telegram ID and a Telebirr Phone Number. A player cannot link the same Telebirr number to multiple Telegram accounts to farm bonuses or evade bans.
