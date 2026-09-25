# CoinDrop Backend API

Node.js/Express backend for the CoinDrop Web3 physics game. Provides leaderboards, player statistics, and game history.

## Features

- 🎮 **Game History** - Track all games played
- 🏆 **Leaderboard** - Rank players by wins, win rate, or earnings
- 📊 **Statistics** - Player and global game statistics
- ⛓️ **Blockchain Sync** - Automatically syncs with Monad blockchain
- 🔒 **Secure** - Rate limiting, CORS, and helmet protection
- 💾 **SQLite Database** - Lightweight, file-based storage

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
CONTRACT_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS
CORS_ORIGIN=http://localhost:8080
```

### 3. Start Server

```bash
npm start
```

Or with auto-reload during development:
```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1706097234567,
  "blockchain": true
}
```

### Leaderboard
```
GET /api/leaderboard?limit=100&orderBy=total_wins
```

Parameters:
- `limit` (optional): Number of players (default: 100, max: 500)
- `orderBy` (optional): `total_wins`, `win_rate`, or `total_winnings`

Response:
```json
{
  "success": true,
  "data": [
    {
      "address": "0x1234...5678",
      "total_games": 50,
      "total_wins": 30,
      "total_losses": 20,
      "total_winnings": "0.54",
      "win_rate": 60.0,
      "last_played": 1706097234
    }
  ],
  "count": 100
}
```

### Recent Games
```
GET /api/recent-games?limit=50
```

Parameters:
- `limit` (optional): Number of games (default: 50, max: 200)

Response:
```json
{
  "success": true,
  "data": [
    {
      "game_id": 123,
      "player_address": "0x1234...5678",
      "angle": 180,
      "force": 50,
      "won": true,
      "bet_amount": "0.01",
      "payout": "0.018",
      "tx_hash": "0xabc...",
      "timestamp": 1706097234
    }
  ],
  "count": 50
}
```

### Player Statistics
```
GET /api/player/:address
```

Response:
```json
{
  "success": true,
  "data": {
    "address": "0x1234...5678",
    "total_games": 50,
    "total_wins": 30,
    "total_losses": 20,
    "total_bet_amount": "0.5",
    "total_winnings": "0.54",
    "win_rate": 60.0,
    "last_played": 1706097234
  }
}
```

### Player Games
```
GET /api/player/:address/games?limit=50
```

Returns all games for a specific player.

### Game Details
```
GET /api/game/:id
```

Response:
```json
{
  "success": true,
  "data": {
    "game_id": 123,
    "player_address": "0x1234...5678",
    "angle": 180,
    "force": 50,
    "won": true,
    "final_x": 400,
    "final_y": 380,
    "bet_amount": "0.01",
    "payout": "0.018",
    "tx_hash": "0xabc...",
    "block_number": 12345,
    "timestamp": 1706097234
  }
}
```

### Global Statistics
```
GET /api/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "total_games": 1000,
    "total_players": 150,
    "total_wins": 450,
    "total_volume": "10.5",
    "total_payouts": "9.45",
    "global_win_rate": 45.0
  }
}
```

### Admin: Sync Blockchain
```
POST /api/admin/sync
Headers: X-API-Key: your-admin-key
Body: { "fromBlock": 0 }
```

Manually trigger blockchain event sync.

## Database Schema

### Games Table
- `game_id` - Unique game ID from contract
- `player_address` - Player wallet address
- `angle` - Drop angle (0-360)
- `force` - Drop force (30-150)
- `won` - Win/loss boolean
- `final_x`, `final_y` - Coin final position
- `bet_amount` - Bet in MON
- `payout` - Payout in MON (if won)
- `tx_hash` - Transaction hash
- `block_number` - Block number
- `timestamp` - Game timestamp

### Players Table
- `address` - Wallet address (primary key)
- `total_games` - Total games played
- `total_wins` - Total wins
- `total_losses` - Total losses
- `total_bet_amount` - Total amount bet
- `total_winnings` - Total winnings
- `win_rate` - Win percentage
- `last_played` - Last game timestamp

## Blockchain Integration

The backend automatically:
1. Listens for `GameEnded` events from the smart contract
2. Fetches full game details from blockchain
3. Stores in local database
4. Updates player statistics

### Event Syncing

On startup, the backend can sync past events:

Set in `.env`:
```env
SYNC_ON_START=true
```

Or manually trigger via admin API.

## Development

### Project Structure
```
backend/
├── server.js              # Main Express server
├── database.js            # SQLite database manager
├── blockchain-listener.js # Blockchain event listener
├── package.json           # Dependencies
├── .env.example           # Environment template
└── database/              # SQLite database files
    └── coindrop.db
```

### Running in Development
```bash
npm run dev
```

Uses `nodemon` for auto-reload on file changes.

## Production Deployment

### Environment Variables
- `NODE_ENV=production`
- `PORT=3000`
- `MONAD_RPC_URL` - Production RPC endpoint
- `CONTRACT_ADDRESS` - Deployed contract address
- `CORS_ORIGIN` - Frontend URL
- `ADMIN_API_KEY` - Secure admin key

### Process Manager (PM2)
```bash
npm install -g pm2
pm2 start server.js --name coindrop-backend
pm2 save
pm2 startup
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Security

- ✅ Helmet.js for security headers
- ✅ CORS configured for specific origin
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Input validation
- ✅ Admin endpoints protected by API key

## Troubleshooting

### "Contract not initialized"
- Ensure `CONTRACT_ADDRESS` is set in `.env`
- Verify contract is deployed on Monad network

### "Failed to connect to blockchain"
- Check `MONAD_RPC_URL` is correct
- Verify network connectivity
- Try alternative RPC endpoint

### Database errors
- Ensure `database/` directory exists
- Check file permissions
- Delete `coindrop.db` to reset (will lose data)

## License

MIT
