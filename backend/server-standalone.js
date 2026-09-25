// Standalone Backend Server (No Dependencies)
const http = require('http');
const url = require('url');

const PORT = 3001;

// In-memory storage
const games = [];
const players = new Map();

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:8080',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Handle requests
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const query = parsedUrl.query;

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    // Health check
    if (path === '/health') {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            status: 'ok',
            timestamp: Date.now(),
            blockchain: false,
            mode: 'standalone'
        }));
        return;
    }

    // Leaderboard
    if (path === '/api/leaderboard') {
        const limit = Math.min(parseInt(query.limit) || 100, 500);
        const leaderboard = Array.from(players.values())
            .sort((a, b) => b.total_wins - a.total_wins)
            .slice(0, limit);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            success: true,
            data: leaderboard,
            count: leaderboard.length
        }));
        return;
    }

    // Recent games
    if (path === '/api/recent-games') {
        const limit = Math.min(parseInt(query.limit) || 50, 200);
        const recent = games.slice(-limit).reverse();

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            success: true,
            data: recent,
            count: recent.length
        }));
        return;
    }

    // Player stats
    if (path.startsWith('/api/player/')) {
        const parts = path.split('/');
        const address = parts[3]?.toLowerCase();

        if (parts.length === 4) {
            // Get player stats
            const stats = players.get(address) || {
                address: address,
                total_games: 0,
                total_wins: 0,
                total_losses: 0,
                total_winnings: '0',
                win_rate: 0
            };

            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({ success: true, data: stats }));
            return;
        } else if (parts[4] === 'games') {
            // Get player games
            const limit = Math.min(parseInt(query.limit) || 50, 200);
            const playerGames = games
                .filter(g => g.player_address.toLowerCase() === address)
                .slice(-limit).reverse();

            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
                success: true,
                data: playerGames,
                count: playerGames.length
            }));
            return;
        }
    }

    // Game details
    if (path.startsWith('/api/game/')) {
        const gameId = parseInt(path.split('/')[3]);
        const game = games.find(g => g.game_id === gameId);

        if (game) {
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({ success: true, data: game }));
        } else {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ success: false, error: 'Game not found' }));
        }
        return;
    }

    // Global stats
    if (path === '/api/stats') {
        const totalGames = games.length;
        const totalWins = games.filter(g => g.won).length;

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            success: true,
            data: {
                total_games: totalGames,
                total_players: players.size,
                total_wins: totalWins,
                global_win_rate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0
            }
        }));
        return;
    }

    // Add test game
    if (path === '/api/game' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const game = {
                    game_id: games.length + 1,
                    player_address: data.player_address,
                    angle: data.angle,
                    force: data.force,
                    won: data.won,
                    bet_amount: data.bet_amount || '0.01',
                    payout: data.won ? '0.018' : '0',
                    timestamp: Date.now()
                };

                games.push(game);

                // Update player
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

                res.writeHead(200, corsHeaders);
                res.end(JSON.stringify({ success: true, data: game }));
            } catch (error) {
                res.writeHead(400, corsHeaders);
                res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
            }
        });
        return;
    }

    // 404
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
    console.log('========================================');
    console.log('  CoinDrop Backend API (Standalone)');
    console.log('========================================');
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log('✓ Mode: In-Memory Storage (No Dependencies)');
    console.log('\n📚 Available endpoints:');
    console.log('   GET  /health');
    console.log('   GET  /api/leaderboard');
    console.log('   GET  /api/recent-games');
    console.log('   GET  /api/player/:address');
    console.log('   GET  /api/player/:address/games');
    console.log('   GET  /api/game/:id');
    console.log('   GET  /api/stats');
    console.log('   POST /api/game');
    console.log('\n⚠️  Data stored in memory (resets on restart)');
    console.log('   Press Ctrl+C to stop\n');
});
