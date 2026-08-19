# BELUT GAMES: NestJS Architecture PRD

## 1. Overview
This document specifies the internal architecture for the BELUT GAMES backend, strictly adhering to the `nestjs-best-practices` guidelines. It defines how the system is structured to be secure, maintainable, and highly scalable.

## 2. Core Patterns
- **Feature Modules (`arch-feature-modules`):** The application is divided by domain logic, not technical layers.
- **Dependency Injection (`di-prefer-constructor-injection`):** Strict constructor injection and the avoidance of massive "God Services" (`arch-single-responsibility`).
- **Repository Pattern (`arch-use-repository-pattern`):** Prisma logic is centralized to keep business logic pure.

## 3. Directory Structure
To ensure extensibility for future games, the codebase is split into **Core Platform** modules and isolated **Games Engine** modules.

```text
backend/
├── src/
│   ├── app.module.ts              // Root module
│   ├── common/                    // Global filters, guards, and decorators
│   │
│   // --- THE CORE PLATFORM --- //
│   ├── core/                      
│   │   ├── prisma/                // Database connection
│   │   ├── auth/                  // Admin/User guards
│   │   ├── users/                 // User profiles
│   │   ├── wallets/               // The Financial Engine (Deposits/Withdrawals/P2P)
│   │   └── webhooks/              // Telebirr SMS listeners
│   │
│   // --- THE GAMES ENGINE --- //
│   ├── games/
│   │   ├── games-core/            // Generic Game logic (Checking balance, GameStatus)
│   │   │
│   │   // --- THE BINGO MODULE (Plug & Play) --- //
│   │   └── bingo/                 
│   │       ├── bingo.module.ts
│   │       ├── bingo.gateway.ts   // Socket.io for Lobbies and live events
│   │       ├── bingo.service.ts   // Matchmaking & Number drawing
│   │       └── models/            // Tickets, Card Templates
```

## 4. GraphQL Implementation (Code-First)
- Uses `@nestjs/graphql` with Apollo Server.
- **Code-First Approach:** All GraphQL schemas are generated automatically from TypeScript classes decorated with `@ObjectType()`, `@InputType()`, and `@ArgsType()`.
- **Validation (`security-validate-all-input`):** All GraphQL mutations use `class-validator` decorators (e.g., `@IsUUID()`, `@IsNumber()`, `@Min(10)`) combined with NestJS `ValidationPipe` to strictly sanitize data before it hits the resolvers.

## 5. The WebSocket Gateway (Live Bingo)
The system requires a WebSocket gateway to push live game state (e.g., `numberDrawn`) down to the Telegram Mini App clients in real-time.

- **Technology Choice:** We will use **`socket.io`** (via `@nestjs/platform-socket.io`).
- **Why Socket.io?** It has built-in **Rooms** (crucial for keeping the 10 ETB Bingo Lobby separate from the 50 ETB Bingo Lobby) and built-in broadcasting functionality. This allows the backend to easily execute `server.to("BINGO_10_LOBBY").emit("numberDrawn", data)` without manually tracking hundreds of individual socket connections.
- **Resilience:** It provides automatic client reconnections if a mobile user's internet connection drops temporarily.

## 6. Financial Atomicity & Security
- **Atomic Execution (`db-use-transactions`):** Any service method that alters a Wallet balance (e.g., buying a Bingo ticket, P2P transfer) MUST be wrapped in a `prisma.$transaction .
- **Error Handling (`error-use-exception-filters`):** All errors (e.g., "Insufficient Funds", "Game Already Started") throw standard `HttpException` or `WsException` objects. A Global Exception Filter intercepts these to ensure the client receives a clean, standardized error message, completely preventing internal database stack traces from leaking to the frontend.

## 7. Extensibility & Future Games
The platform is explicitly designed to scale beyond Bingo into a multi-game ecosystem.

- **Plug-and-Play Structure:** The `src/games/core` module handles all the generic game logic (e.g., checking if a user has enough balance, deducting the entry fee, verifying Demo vs Live status).
- **Adding a New Game:** When you want to build a new game (like Crash, Slots, or Chess), you simply create a new isolated feature module (e.g., `src/games/crash`). This new module automatically inherits the financial security and deployment logic from the `core` module.
- **Shared Database Engine:** The Prisma schema uses abstract `GameModule` and `GameInstance` tables. A new game simply registers a new record in `GameModule` (e.g., `id: "CRASH_10"`). You will never need to rewrite the wallet, transaction, or user logic just to launch a new game!
