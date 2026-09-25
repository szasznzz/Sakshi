// Simplified backend server (no SQLite dependency)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage (temporary until database is set up)
const games = [];
const players = new Map();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080'
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        blockchain: false,
        mode: 'in-memory'
    });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const leaderboard = Array.from(players.values())
        .sort((a, b) => b.total_wins - a.total_wins)
        .slice(0, limit);

    res.json({
        success: true,
        data: leaderboard,
        count: leaderboard.length
    });
});

// Get recent games
app.get('/api/recent-games', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const recentGames = games
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

    res.json({
        success: true,
        data: recentGames,
        count: recentGames.length
    });
});

// Get player stats
app.get('/api/player/:address', (req, res) => {
    const address = req.params.address.toLowerCase();

    const stats = players.get(address) || {
        address: address,
        total_games: 0,
        total_wins: 0,
        total_losses: 0,
        total_winnings: '0',
        win_rate: 0
    };

    res.json({
        success: true,
        data: stats
    });
});

// Get player games
app.get('/api/player/:address/games', (req, res) => {
    const address = req.params.address.toLowerCase();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const playerGames = games
        .filter(g => g.player_address.toLowerCase() === address)
        .slice(0, limit);

    res.json({
        success: true,
        data: playerGames,
        count: playerGames.length
    });
});

// Get game details
app.get('/api/game/:id', (req, res) => {
    const gameId = parseInt(req.params.id);
    const game = games.find(g => g.game_id === gameId);

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
});

// Get global statistics
app.get('/api/stats', (req, res) => {
    const totalGames = games.length;
    const totalWins = games.filter(g => g.won).length;
    const totalPlayers = players.size;

    res.json({
        success: true,
        data: {
            total_games: totalGames,
            total_players: totalPlayers,
            total_wins: totalWins,
            global_win_rate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0
        }
    });
});

// Add game (for testing)
app.post('/api/game', (req, res) => {
    const game = {
        game_id: games.length + 1,
        player_address: req.body.player_address,
        angle: req.body.angle,
        force: req.body.force,
        won: req.body.won,
        bet_amount: req.body.bet_amount || '0.01',
        payout: req.body.won ? '0.018' : '0',
        timestamp: Date.now()
    };

    games.push(game);

    // Update player stats
    const address = game.player_address.toLowerCase();
    let player = players.get(address);

    if (!player) {
        player = {
            address: address,
            total_games: 0,
            total_wins: 0,
            total_losses: 0,
            total_winnings: '0',
            win_rate: 0
        };
        players.set(address, player);
    }

    player.total_games++;
    if (game.won) {
        player.total_wins++;
        player.total_winnings = (parseFloat(player.total_winnings) + parseFloat(game.payout)).toFixed(3);
    } else {
        player.total_losses++;
    }
    player.win_rate = (player.total_wins / player.total_games) * 100;

    res.json({
        success: true,
        data: game
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('========================================');
    console.log('  CoinDrop Backend Server (Simplified)');
    console.log('========================================');
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log('✓ Mode: In-Memory Storage');
    console.log('\n📚 Available endpoints:');
    console.log('   GET  /health');
    console.log('   GET  /api/leaderboard');
    console.log('   GET  /api/recent-games');
    console.log('   GET  /api/player/:address');
    console.log('   GET  /api/player/:address/games');
    console.log('   GET  /api/game/:id');
    console.log('   GET  /api/stats');
    console.log('   POST /api/game (testing)');
    console.log('\n⚠️  Note: Data is stored in memory (will reset on restart)');
    console.log('   For persistent storage, install Python and run full backend\n');
});
