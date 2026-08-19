# BELUT GAMES: Super Admin Dashboard PRD

## 1. Overview
The **Super Admin Dashboard** is a standalone Web Application that serves as the central control plane for the BELUT GAMES platform. It provides complete visibility into system operations, financial health, and allows for the safe deployment of new game modules.

- **Frontend Framework:** Next.js (React)
- **Styling:** TailwindCSS
- **Component Library:** Shadcn UI (for sleek, accessible tables, charts, and modal components)
- **Backend Connection:** GraphQL to the core NestJS backend.

---

## 2. Authentication & Access Control
Because this dashboard controls real financial data and game states, it requires strict authentication.
- **Method:** Secure Email and Password login.
- **Roles:** The backend must support an `ADMIN` role. Standard users cannot access this dashboard or its underlying GraphQL queries.
- **Session:** Secure HTTP-only cookies (e.g., using JWTs) to maintain the admin session.

---

## 3. Core Modules

### 3.1 User Management & Tracking
- **User List:** A comprehensive data table (built with Shadcn UI) listing all Telegram users registered on the platform.
- **User Detail View:**
  - Current Wallet Balance.
  - Lifetime Deposits & Withdrawals.
  - **Activity Log:** A chronological list of every action (game joined, card reserved, claim attempted).

### 3.2 Financial Dashboard
- **Platform Health Metrics:**
  - Total ETB currently held in all user wallets (Liability).
  - Total House Rake collected (Revenue).
- **Transaction Queue:**
  - View all parsed SMS deposits.
  - View all Withdrawal requests.
  - Ability for Admins to manually approve/reject withdrawals (augmenting the Telegram Admin group buttons).

### 3.3 Game Instance Logs (The "Black Box")
To resolve disputes or audit system integrity, the admin can view historical records of every game played.
- **Bingo History:** Select a specific `gameInstanceId` to see:
  - Exact sequence and timestamps of the drawn numbers.
  - List of all players who bought tickets.
  - The winning player, their winning card, and the exact timestamp the server detected the win.

---

## 4. Game Deployment & Demo Mode Engine
To safely scale "BELUT GAMES" into a multi-game platform (e.g., adding Chess, Crash, etc.), the dashboard includes a deployment engine.

### 4.1 Game Module Registry
The Admin can register a new Game Module in the database (e.g., `gameId: 'CHESS'`).

### 4.2 Status: DEMO MODE
- When a game is set to `DEMO`, it is **hidden** from the main public Telegram bot menu.
- It can only be accessed via a specific testing link or by Admin accounts.
- **Fake Economy:** The NestJS backend will automatically route transactions for a `DEMO` game to use "Test ETB" instead of the user's real wallet balance, allowing developers to playtest the full cycle without risking real money.

### 4.3 Status: LIVE (Production)
- Once testing is complete, the Admin clicks a "Deploy to Live" button in the dashboard.
- The game's status changes to `LIVE`.
- It instantly appears on the Telegram bot's main menu for all public users.
- The backend switches the game's routing to use **Real ETB** from the main wallet.
