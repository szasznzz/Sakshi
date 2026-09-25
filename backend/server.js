// Express server for CoinDrop backend
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
require('dotenv').config();

const DatabaseManager = require('./database');
const BlockchainListener = require('./blockchain-listener');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new DatabaseManager(process.env.DB_PATH || './database/coindrop.db');

// Initialize blockchain listener
const blockchainListener = new BlockchainListener(db);

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    credentials: true
}));
app.use(bodyParser.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        blockchain: blockchainListener.isListening
    });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const orderBy = req.query.orderBy || 'total_wins';

        const leaderboard = db.getLeaderboard(limit, orderBy);

        res.json({
            success: true,
            data: leaderboard,
            count: leaderboard.length
        });
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard'
        });
    }
});

// Get recent games
app.get('/api/recent-games', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const games = db.getRecentGames(limit);

        res.json({
            success: true,
            data: games,
            count: games.length
        });
    } catch (error) {
        console.error('Error getting recent games:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent games'
        });
    }
});

// Get player stats
app.get('/api/player/:address', (req, res) => {
    try {
        const address = req.params.address;

        if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid address format'
            });
        }

        const stats = db.getPlayerStats(address);

        if (!stats) {
            return res.json({
                success: true,
                data: {
                    address: address.toLowerCase(),
                    total_games: 0,
                    total_wins: 0,
                    total_losses: 0,
                    total_winnings: '0',
                    win_rate: 0
                }
            });
        }

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting player stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player stats'
        });
    }
});

// Get player games
app.get('/api/player/:address/games', (req, res) => {
    try {
        const address = req.params.address;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);

        if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid address format'
            });
        }

        const games = db.getPlayerGames(address, limit);

        res.json({
            success: true,
            data: games,
            count: games.length
        });
    } catch (error) {
        console.error('Error getting player games:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player games'
        });
    }
});

// Get specific game
app.get('/api/game/:id', (req, res) => {
    try {
        const gameId = parseInt(req.params.id);

        if (isNaN(gameId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid game ID'
            });
        }

        const game = db.getGame(gameId);

        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        res.json({
            success: true,
            data: game
        });
    } catch (error) {
        console.error('Error getting game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game'
        });
    }
});

// Get global statistics
app.get('/api/stats', (req, res) => {
    try {
        const stats = db.getGlobalStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting global stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

// Admin: Sync blockchain events
app.post('/api/admin/sync', async (req, res) => {
    try {
        // Check admin API key
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.ADMIN_API_KEY) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        const fromBlock = parseInt(req.body.fromBlock) || 0;

        // Sync in background
        blockchainListener.syncPastEvents(fromBlock).catch(console.error);

        res.json({
            success: true,
            message: 'Sync started'
        });
    } catch (error) {
        console.error('Error starting sync:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start sync'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ==================== SERVER STARTUP ====================

async function startServer() {
    console.log('🚀 Starting CoinDrop Backend Server...\n');

    // Initialize blockchain listener
    const initialized = await blockchainListener.initialize();

    if (initialized && process.env.CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        // Start listening for new events
        blockchainListener.startListening();

        // Optionally sync past events on startup
        if (process.env.SYNC_ON_START === 'true') {
            const latestBlock = await blockchainListener.getLatestBlock();
            const fromBlock = Math.max(0, latestBlock - 10000); // Last ~10k blocks
            blockchainListener.syncPastEvents(fromBlock).catch(console.error);
        }
    } else {
        console.log('⚠️  Blockchain listener not started (contract not deployed or configured)');
        console.log('   Backend will work in API-only mode');
    }

    // Start Express server
    app.listen(PORT, () => {
        console.log(`\n✓ Server running on http://localhost:${PORT}`);
        console.log(`✓ API endpoints available at http://localhost:${PORT}/api`);
        console.log(`\n📚 Available endpoints:`);
        console.log(`   GET  /health`);
        console.log(`   GET  /api/leaderboard`);
        console.log(`   GET  /api/recent-games`);
        console.log(`   GET  /api/player/:address`);
        console.log(`   GET  /api/player/:address/games`);
        console.log(`   GET  /api/game/:id`);
        console.log(`   GET  /api/stats`);
        console.log(`   POST /api/admin/sync (requires API key)`);
        console.log(`\n🎮 Ready to serve CoinDrop game data!\n`);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    blockchainListener.stopListening();
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    blockchainListener.stopListening();
    db.close();
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
