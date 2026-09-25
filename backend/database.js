// Database initialization and management
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor(dbPath) {
        // Ensure database directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initTables();
    }

    initTables() {
        // Games table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER UNIQUE NOT NULL,
                player_address TEXT NOT NULL,
                angle INTEGER NOT NULL,
                force INTEGER NOT NULL,
                won BOOLEAN NOT NULL,
                final_x INTEGER,
                final_y INTEGER,
                bet_amount TEXT NOT NULL,
                payout TEXT,
                tx_hash TEXT,
                block_number INTEGER,
                timestamp INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Players table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS players (
                address TEXT PRIMARY KEY,
                total_games INTEGER DEFAULT 0,
                total_wins INTEGER DEFAULT 0,
                total_losses INTEGER DEFAULT 0,
                total_bet_amount TEXT DEFAULT '0',
                total_winnings TEXT DEFAULT '0',
                win_rate REAL DEFAULT 0,
                last_played INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Leaderboard view
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_games_player ON games(player_address);
            CREATE INDEX IF NOT EXISTS idx_games_timestamp ON games(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_players_wins ON players(total_wins DESC);
            CREATE INDEX IF NOT EXISTS idx_players_winrate ON players(win_rate DESC);
        `);

        console.log('✓ Database tables initialized');
    }

    // Add or update player
    upsertPlayer(address) {
        const stmt = this.db.prepare(`
            INSERT INTO players (address, total_games, total_wins, total_losses)
            VALUES (?, 0, 0, 0)
            ON CONFLICT(address) DO NOTHING
        `);
        stmt.run(address.toLowerCase());
    }

    // Add game
    addGame(gameData) {
        const stmt = this.db.prepare(`
            INSERT INTO games (
                game_id, player_address, angle, force, won,
                final_x, final_y, bet_amount, payout, tx_hash,
                block_number, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        return stmt.run(
            gameData.gameId,
            gameData.playerAddress.toLowerCase(),
            gameData.angle,
            gameData.force,
            gameData.won ? 1 : 0,
            gameData.finalX,
            gameData.finalY,
            gameData.betAmount,
            gameData.payout,
            gameData.txHash,
            gameData.blockNumber,
            gameData.timestamp
        );
    }

    // Update player stats
    updatePlayerStats(address) {
        const playerAddress = address.toLowerCase();

        // Calculate stats from games
        const stats = this.db.prepare(`
            SELECT 
                COUNT(*) as total_games,
                SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END) as total_wins,
                SUM(CASE WHEN won = 0 THEN 1 ELSE 0 END) as total_losses,
                SUM(bet_amount) as total_bet,
                SUM(CASE WHEN won = 1 THEN payout ELSE 0 END) as total_winnings,
                MAX(timestamp) as last_played
            FROM games
            WHERE player_address = ?
        `).get(playerAddress);

        const winRate = stats.total_games > 0
            ? (stats.total_wins / stats.total_games) * 100
            : 0;

        // Update player record
        this.db.prepare(`
            UPDATE players SET
                total_games = ?,
                total_wins = ?,
                total_losses = ?,
                total_bet_amount = ?,
                total_winnings = ?,
                win_rate = ?,
                last_played = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE address = ?
        `).run(
            stats.total_games,
            stats.total_wins,
            stats.total_losses,
            stats.total_bet || '0',
            stats.total_winnings || '0',
            winRate,
            stats.last_played,
            playerAddress
        );
    }

    // Get player stats
    getPlayerStats(address) {
        return this.db.prepare(`
            SELECT * FROM players WHERE address = ?
        `).get(address.toLowerCase());
    }

    // Get leaderboard
    getLeaderboard(limit = 100, orderBy = 'total_wins') {
        const validOrderBy = ['total_wins', 'win_rate', 'total_winnings'];
        const order = validOrderBy.includes(orderBy) ? orderBy : 'total_wins';

        return this.db.prepare(`
            SELECT 
                address,
                total_games,
                total_wins,
                total_losses,
                total_winnings,
                win_rate,
                last_played
            FROM players
            WHERE total_games > 0
            ORDER BY ${order} DESC, total_games DESC
            LIMIT ?
        `).all(limit);
    }

    // Get recent games
    getRecentGames(limit = 50) {
        return this.db.prepare(`
            SELECT 
                game_id,
                player_address,
                angle,
                force,
                won,
                bet_amount,
                payout,
                tx_hash,
                timestamp
            FROM games
            ORDER BY timestamp DESC
            LIMIT ?
        `).all(limit);
    }

    // Get game by ID
    getGame(gameId) {
        return this.db.prepare(`
            SELECT * FROM games WHERE game_id = ?
        `).get(gameId);
    }

    // Get player games
    getPlayerGames(address, limit = 50) {
        return this.db.prepare(`
            SELECT * FROM games
            WHERE player_address = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `).all(address.toLowerCase(), limit);
    }

    // Get statistics
    getGlobalStats() {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_games,
                COUNT(DISTINCT player_address) as total_players,
                SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END) as total_wins,
                SUM(bet_amount) as total_volume,
                SUM(CASE WHEN won = 1 THEN payout ELSE 0 END) as total_payouts,
                AVG(CASE WHEN won = 1 THEN 1.0 ELSE 0.0 END) * 100 as global_win_rate
            FROM games
        `).get();
    }

    close() {
        this.db.close();
    }
}

module.exports = DatabaseManager;
