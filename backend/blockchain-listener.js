// Blockchain event listener for CoinDrop contract
const { ethers } = require('ethers');
require('dotenv').config();

class BlockchainListener {
    constructor(database) {
        this.db = database;
        this.provider = null;
        this.contract = null;
        this.isListening = false;
    }

    async initialize() {
        try {
            // Connect to Monad network
            this.provider = new ethers.providers.JsonRpcProvider(
                process.env.MONAD_RPC_URL
            );

            // Contract ABI (simplified - only events we need)
            const contractABI = [
                "event GameStarted(address indexed player, uint256 gameId, uint256 betAmount)",
                "event GameEnded(address indexed player, uint256 gameId, bool won, uint256 payout)",
                "function getGameResult(uint256 gameId) view returns (address player, bool won, uint256 betAmount, uint256 timestamp)",
                "function games(uint256) view returns (address player, uint256 angle, uint256 force, bool won, int256 finalX, int256 finalY, uint256 betAmount, uint256 payout, uint256 timestamp)"
            ];

            this.contract = new ethers.Contract(
                process.env.CONTRACT_ADDRESS,
                contractABI,
                this.provider
            );

            console.log('✓ Blockchain listener initialized');
            console.log('  Contract:', process.env.CONTRACT_ADDRESS);
            console.log('  Network:', await this.provider.getNetwork());

            return true;
        } catch (error) {
            console.error('✗ Failed to initialize blockchain listener:', error.message);
            return false;
        }
    }

    async startListening() {
        if (!this.contract) {
            console.error('Contract not initialized');
            return;
        }

        this.isListening = true;
        console.log('🎧 Listening for blockchain events...');

        // Listen for GameEnded events
        this.contract.on('GameEnded', async (player, gameId, won, payout, event) => {
            try {
                console.log(`📡 GameEnded event: Game #${gameId} - Player: ${player} - Won: ${won}`);

                // Get full game details from contract
                const gameDetails = await this.contract.games(gameId);

                // Prepare game data
                const gameData = {
                    gameId: gameId.toNumber(),
                    playerAddress: player,
                    angle: gameDetails.angle.toNumber(),
                    force: gameDetails.force.toNumber(),
                    won: won,
                    finalX: gameDetails.finalX.toNumber(),
                    finalY: gameDetails.finalY.toNumber(),
                    betAmount: ethers.utils.formatEther(gameDetails.betAmount),
                    payout: won ? ethers.utils.formatEther(payout) : '0',
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: gameDetails.timestamp.toNumber()
                };

                // Ensure player exists in database
                this.db.upsertPlayer(player);

                // Add game to database
                this.db.addGame(gameData);

                // Update player stats
                this.db.updatePlayerStats(player);

                console.log(`✓ Game #${gameId} recorded in database`);

            } catch (error) {
                console.error('Error processing GameEnded event:', error);
            }
        });

        // Listen for GameStarted events (optional, for tracking)
        this.contract.on('GameStarted', (player, gameId, betAmount, event) => {
            console.log(`🎮 GameStarted: Game #${gameId} - Player: ${player}`);
        });
    }

    stopListening() {
        if (this.contract) {
            this.contract.removeAllListeners();
            this.isListening = false;
            console.log('🔇 Stopped listening for blockchain events');
        }
    }

    // Sync past events (for initial database population)
    async syncPastEvents(fromBlock = 0) {
        if (!this.contract) {
            console.error('Contract not initialized');
            return;
        }

        try {
            console.log(`🔄 Syncing past events from block ${fromBlock}...`);

            const filter = this.contract.filters.GameEnded();
            const events = await this.contract.queryFilter(filter, fromBlock);

            console.log(`Found ${events.length} past GameEnded events`);

            for (const event of events) {
                const { player, gameId, won, payout } = event.args;

                try {
                    // Check if game already exists
                    const existing = this.db.getGame(gameId.toNumber());
                    if (existing) {
                        console.log(`  Skipping Game #${gameId} (already in database)`);
                        continue;
                    }

                    // Get full game details
                    const gameDetails = await this.contract.games(gameId);

                    const gameData = {
                        gameId: gameId.toNumber(),
                        playerAddress: player,
                        angle: gameDetails.angle.toNumber(),
                        force: gameDetails.force.toNumber(),
                        won: won,
                        finalX: gameDetails.finalX.toNumber(),
                        finalY: gameDetails.finalY.toNumber(),
                        betAmount: ethers.utils.formatEther(gameDetails.betAmount),
                        payout: won ? ethers.utils.formatEther(payout) : '0',
                        txHash: event.transactionHash,
                        blockNumber: event.blockNumber,
                        timestamp: gameDetails.timestamp.toNumber()
                    };

                    this.db.upsertPlayer(player);
                    this.db.addGame(gameData);
                    this.db.updatePlayerStats(player);

                    console.log(`  ✓ Synced Game #${gameId}`);

                } catch (error) {
                    console.error(`  ✗ Error syncing Game #${gameId}:`, error.message);
                }
            }

            console.log('✓ Past events sync complete');

        } catch (error) {
            console.error('Error syncing past events:', error);
        }
    }

    async getLatestBlock() {
        if (!this.provider) return 0;
        try {
            return await this.provider.getBlockNumber();
        } catch (error) {
            return 0;
        }
    }
}

module.exports = BlockchainListener;
