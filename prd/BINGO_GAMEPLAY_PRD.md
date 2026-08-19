# BELUT GAMES: Bingo Module (V1) - Gameplay PRD

## 1. Overview
The **Bingo Module** is the first game launched on the BELUT GAMES platform. It is designed for high frequency, fast-paced action. 
- **Game Type:** 75-Ball Bingo.
- **Entry Tiers (Rooms):** Players can choose between three distinct lobby tiers: **10 ETB**, **20 ETB**, or **50 ETB** per ticket.
- **Client Interface:** Telegram Mini App (Web App) communicating via WebSockets.

---

## 2. Matchmaking & The Lobbies

To maximize revenue and cater to different player budgets, the server maintains **three isolated lobbies** running concurrently (10 ETB, 20 ETB, and 50 ETB rooms). The matchmaking rules below apply independently to each lobby.

- **The Queue:** The server maintains an active queue for each of the three lobby tiers.
- **Card Selection (Reservation):** Inside a specific lobby tier, players see a visual list of the **200 available tickets** for that room. Clicking an available ticket places it in the player's "cart" and prevents others in that lobby from selecting it (entry fee is **not** deducted yet).
  - *Expiry:* To prevent AFK players from hoarding cards, a reservation expires automatically after **60 seconds** if the player hasn't clicked "Start Game". The card is then returned to the available pool.
- **Ready State ("Start Game"):** After reserving their tickets, a player must click the **"Start Game"** button. The system performs an initial balance check, then locks in their participation (marking them as "Ready").
- **Cancel Ready:** A player who is "Ready" can click a "Cancel" button to un-ready themselves. This does *not* drop their reserved cards; it simply puts them back into the selection phase to pick more cards. *If a player cancelling drops the total number of "Ready" players below 2, the game countdown is immediately aborted and reset.*
- **The Countdown:** Once there are **2 or more players** who are in the "Ready" state, a **40-second countdown** timer begins. (Additional players can join and ready-up during this window).
- **Start Condition:** When the 40-second timer hits `0`, the lobby is locked. The system then **atomically deducts the total entry fees** from all readied players' wallets and the game immediately begins. (If a player's balance has dropped below the required amount before the timer hits `0`, their reservation is voided). 

---

## 3. The Game Board (ካርቴላ)

There is a fixed pool of **200 pre-defined, unique tickets**. During the lobby phase, players select their cards from this limited pool.

Each ticket (ካርቴላ) is a standard 5x5 grid with 24 numbers and 1 Free Space.
- **Column B**: 5 random numbers between 1 and 15.
- **Column I**: 5 random numbers between 16 and 30.
- **Column N**: 4 random numbers between 31 and 45 (Center square is "FREE").
- **Column G**: 5 random numbers between 46 and 60.
- **Column O**: 5 random numbers between 61 and 75.

---

## 4. Winning Conditions

A player wins the prize pool (Total Pool - House Rake) if they are the first to achieve any of the following patterns:

1. **Horizontal Line:** 5 consecutive marked spaces in a row.
2. **Vertical Line:** 5 consecutive marked spaces in a column.
3. **Diagonal Line:** 5 consecutive marked spaces from corner to corner.
4. **Four Corners:** The top-left, top-right, bottom-left, and bottom-right spaces are marked.

*Note: The center "FREE" space automatically counts towards any line passing through it.*

### Tie-Breakers
- If multiple players achieve a winning condition on the *exact same drawn number*, the total prize pool is **split equally** among all winners.

---

## 5. Gameplay Loop & Automation Features

Once the game starts, the NestJS backend handles the logic securely, and WebSockets stream the data to the Telegram Mini App.

1. **Number Calling:** The server draws a random number (e.g., "G-54") every **4 seconds** and broadcasts it via WebSocket to all active clients.
2. **Manual vs. Auto Daubing:** 
   - *Default:* Players must actively watch the numbers and tap their screens to mark their "ካርቴላ".
   - *Auto-Features:* If a player purchases **3 or more tickets** for a single game, the system automatically unlocks **Auto-Mark** (numbers are stamped instantly without tapping) and **Auto-BINGO** (the server automatically claims the win for them). 
   - *Security Note:* Regardless of whether a user is playing manually or using Auto-Mark, **the server acts as the single source of truth**. A client cannot fake a "BINGO" call; the server independently verifies if their ticket actually has the required winning pattern.
3. **Game End:** Once a winner is detected, the server halts the number drawing, broadcasts the winner(s) to all players, credits the central wallets via the platform architecture, and returns players to the lobby to wait for the next 40-second countdown.

---

## 6. Mini App UI Architecture

- **Visuals:** Sleek, responsive grid design optimized for mobile screens within Telegram. High contrast for drawn numbers vs unmarked numbers. Amharic localization for all buttons (e.g., "ግዛ" for Buy, "ካርቴላ" for Ticket).
- **Audio & Voice Calling (Amharic):** A "loud caller" system must be implemented. When the server broadcasts a number every 4 seconds, the Mini App will instantly play a corresponding Amharic voice clip (e.g., "ቢ - አንድ" for B-1). We will first search for an existing Amharic Bingo voice library; if one is unavailable, a custom asset library of 75 distinct audio clips will be recorded/generated.
- **WebSockets:** Used strictly for real-time state synchronization (e.g., `numberDrawn`, `gameStarted`, `winnerDeclared` events).
- **GraphQL:** Used during the lobby/40-second countdown phase to execute mutations (e.g., `reserveTicket(gameId: ID!, ticketId: String!)`, `setPlayerReady(gameId: ID!)`) and fetch historical data.
