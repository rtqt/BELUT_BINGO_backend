# BELUT GAMES: Growth & Support PRD

## 1. Overview
This document outlines the features designed to scale the player base (Referral Engine) and retain users by providing seamless assistance (Customer Support Tunnel). 

---

## 2. The Referral System (Growth Engine)
The platform uses an affiliate system to encourage players to invite their friends.

### 2.1 The Mechanism
- **Unique Links:** Every registered player is automatically assigned a unique referral link (e.g., `t.me/belut_bot?start=ref_123456`).
- **UI Access:** Players can access their link, view their total invited friends, and see their total earned referral bonuses via a "🎁 Refer & Earn" button in the Main Menu.

### 2.2 The Payout Trigger (Anti-Sybil Security)
To prevent attackers from using bots to create fake Telegram accounts and drain the house balance, bonuses are strictly tied to real financial activity.
- **The Rule:** The referrer earns a flat **10 ETB bonus**.
- **The Trigger:** The 10 ETB is *only* credited to the referrer's wallet after the invited friend links a unique Telebirr phone number AND successfully makes their **first cumulative deposit of at least 50 ETB**.
- (Clicking the link or registering the account yields exactly 0 ETB).

---

## 3. The Customer Support System (Support Tunnel)
To handle disputes, missing deposits, or general inquiries without forcing users to leave the Telegram bot.

### 3.1 Tier 1: Automated FAQ Chatbot
- When a user clicks the "📞 Support" button on the Main Menu, they are presented with automated, instant answers to common questions (e.g., "How to Deposit", "Withdrawal Rules", "Game Rules").

### 3.2 Tier 2: Live Admin Tunnel
- If the FAQ does not resolve their issue, the user can click **"Talk to a Human"**.
- This initiates a secure messaging tunnel between the User's bot interface and the private **BELUT Admin Telegram Group**.
- **User -> Admin:** The user's typed message is forwarded to the Admin Group, tagged with their `TelegramID` and current `WalletBalance` for context.
- **Admin -> User:** An Admin simply "Replies" to that forwarded message inside the Admin Group. The backend intercepts the reply and seamlessly sends it back to the user via the bot.
- This allows a team of admins to provide live customer support directly from one central Telegram group.
