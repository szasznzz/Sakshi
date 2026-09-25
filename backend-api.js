// API client for CoinDrop backend
class BackendAPI {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get leaderboard
    async getLeaderboard(limit = 100, orderBy = 'total_wins') {
        return this.request(`/api/leaderboard?limit=${limit}&orderBy=${orderBy}`);
    }

    // Get recent games
    async getRecentGames(limit = 50) {
        return this.request(`/api/recent-games?limit=${limit}`);
    }

    // Get player stats
    async getPlayerStats(address) {
        return this.request(`/api/player/${address}`);
    }

    // Get player games
    async getPlayerGames(address, limit = 50) {
        return this.request(`/api/player/${address}/games?limit=${limit}`);
    }

    // Get game details
    async getGame(gameId) {
        return this.request(`/api/game/${gameId}`);
    }

    // Get global statistics
    async getGlobalStats() {
        return this.request(`/api/stats`);
    }

    // Check backend health
    async checkHealth() {
        return this.request('/health');
    }
}

// Export for use in game
export const backendAPI = new BackendAPI('http://localhost:3000');
