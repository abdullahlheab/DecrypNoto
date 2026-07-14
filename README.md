# Decrypnoto 🔐

A live, shared note-taker for the board game **Decrypto**. One person runs it; everyone else joins from their phone browser and takes notes together in real time — no installs, no accounts, no dependencies. Just Node.

Built for the classic problem: taking Decrypto notes on your phone is miserable, and half the game is remembering which clues the enemy gave for which keyword slot. Decrypnoto does that bookkeeping for you.

## Features

- **Lobbies** — create a room, friends tap it from the lobby list and join a team. Each lobby is a fully independent game with a live roster (green dot = online right now). Several groups can play at once.
- **Two game modes per lobby:**
  - 🃏 **Physical cards** (pure note-taking) — you play with the real box. No turns, no roles: anyone types the clues being said out loud, for either team. When a code card is revealed, anyone punches in the 3 digits — and every clue is instantly **auto-filed under the right keyword column**. Manual 🕵️/💥 token counters mirror the physical tokens.
  - 📱 **App codes** (full digital flow) — the app replaces the code cards. One teammate claims the **encryptor** role and draws a secret code only they can see, types the clues, both teams lock in guesses, then reveal auto-scores interception/miscommunication tokens and win/lose banners.
- **The intercept sheet** — every enemy clue, grouped under word slots 1–4 with round tags, plus a hypothesis field per word and a shared team notepad. Your own sheet shows which clues *you've* already used per keyword, so you notice when you're being too predictable.
- **Team secrets stay secret** — keywords, hypotheses, notes, unrevealed codes and guesses are filtered **server-side** per player. The other team can't peek, even in the network tab.
- **Anti-cheat team switching** — switching teams requires every online member of the destination team to accept (they're about to show you their words). Leaving and rejoining on the other team is blocked too.
- **English / Arabic** — 🌐 button toggles the whole UI, with proper RTL layout for Arabic. Per-device choice; clue text is direction-aware in both.
- **Live everything** — server-sent events push every keystroke to every phone. State persists to disk, so a server restart never loses a game.

## Run it

```
node server.js
```

No `npm install` — the server is a single zero-dependency file. It prints the addresses:

```
On this PC:   http://localhost:4321
Friends join: http://192.168.x.x:4321
```

Friends on the same Wi-Fi open that second URL. On Windows, allow Node through the firewall the first time (Private networks is enough).

### Docker

```
docker compose up -d --build
```

Runs with `restart: unless-stopped`; game state lives in the `decrypnoto-data` volume (`STATE_FILE` env var controls the path).

### Playing with remote friends

Any tunnel works. With Cloudflare:

```
cloudflared tunnel --url http://localhost:4321
```

gives a throwaway public URL. Or add a public hostname on a named Cloudflare Tunnel pointing at `http://localhost:4321` (path empty) for a permanent one.

> ⚠️ The app is deliberately account-free, which means anyone with the URL can open your lobbies. Share the link privately.

## How a round works (app-codes mode)

1. One teammate taps **"I'm giving the clues"** — only they can see the code (🎲 draws a random one).
2. They type the 3 clues; everyone sees them live.
3. Your team taps in its decode guess; from round 2 the enemy taps in an intercept guess.
4. **Reveal** — tokens are scored automatically (2 🕵️ interceptions wins, 2 💥 miscommunications loses) and the clues are filed into the keyword columns.

In physical-cards mode steps 1–4 happen at the table; the app just captures clues + revealed codes and does the filing and token math.

## Tech

- **Server:** one file, zero dependencies — Node HTTP + Server-Sent Events, JSON state file, per-client filtered views.
- **Client:** vanilla JS single page, mobile-first, dark theme, i18n (en/ar) with RTL.
- **State:** everything lives in `game-state.json` (or the Docker volume) — delete it for a factory reset.
