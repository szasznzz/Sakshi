// Web3 Integration Module
import { CONFIG } from './config.js';
import { CONTRACT_ABI } from './contract-abi.js';

class Web3Manager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
        this.isConnected = false;
        this.currentGameId = null;
    }

    // Initialize Web3
    async init() {
        if (typeof window.ethereum !== 'undefined') {
            console.log('MetaMask detected');
            return true;
        } else {
            console.error('Please install MetaMask');
            return false;
        }
    }

    // Connect Wallet
    async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('MetaMask is not installed. Please install MetaMask to play.');
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.account = accounts[0];

            // Create provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();

            // Check network
            const network = await this.provider.getNetwork();

            // If not on Monad network, try to switch
            if (network.chainId !== CONFIG.web3.chainId) {
                await this.switchToMonadNetwork();
            }

            // Initialize contract
            this.contract = new ethers.Contract(
                CONFIG.web3.contractAddress,
                CONTRACT_ABI,
                this.signer
            );

            this.isConnected = true;
            this.setupEventListeners();

            console.log('Wallet connected:', this.account);
            return {
                success: true,
                account: this.account
            };

        } catch (error) {
            console.error('Failed to connect wallet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Switch to Monad Network
    async switchToMonadNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${CONFIG.web3.chainId.toString(16)}` }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    // Try to add the network
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: `0x${CONFIG.web3.chainId.toString(16)}`,
                            chainName: CONFIG.web3.chainName,
                            nativeCurrency: CONFIG.web3.nativeCurrency,
                            rpcUrls: [CONFIG.web3.rpcUrl],
                            blockExplorerUrls: [CONFIG.web3.blockExplorer]
                        }],
                    });
                } catch (addError) {
                    console.error('Failed to add Monad network:', addError);

                    // Provide helpful error message
                    const errorMsg = addError.message || '';
                    if (errorMsg.includes('RPC') || errorMsg.includes('endpoint')) {
                        throw new Error(
                            'The Monad RPC endpoint is currently unavailable.\n\n' +
                            'Options:\n' +
                            '1. Try again later when the network is available\n' +
                            '2. Use a different RPC endpoint if you have one\n' +
                            '3. Deploy your own Monad node\n\n' +
                            'The game will work in demo mode without blockchain features.'
                        );
                    } else if (addError.code === 4001) {
                        throw new Error('Network addition rejected by user');
                    } else {
                        throw new Error('Failed to add Monad network: ' + errorMsg);
                    }
                }
            } else if (switchError.code === 4001) {
                throw new Error('Network switch rejected by user');
            } else {
                throw switchError;
            }
        }
    }

    // Setup event listeners for account/network changes
    setupEventListeners() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.account = accounts[0];
                    window.location.reload();
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }

    // Disconnect wallet
    disconnect() {
        this.account = null;
        this.isConnected = false;
        this.contract = null;
        console.log('Wallet disconnected');
    }

    // Place a bet and start game
    async placeBet(angle, force) {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const betAmount = ethers.utils.parseEther(CONFIG.web3.betAmount);

            // Convert angle and force to uint256 (multiply by 100 to preserve decimals)
            const angleInt = Math.floor(angle);
            const forceInt = Math.floor(force * 100);

            console.log('Placing bet...', { angle: angleInt, force: forceInt, betAmount: betAmount.toString() });

            const tx = await this.contract.placeBet(angleInt, forceInt, {
                value: betAmount
            });

            console.log('Transaction sent:', tx.hash);

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt);

            // Extract game ID from event
            const event = receipt.events?.find(e => e.event === 'GameStarted');
            if (event) {
                this.currentGameId = event.args.gameId.toNumber();
                console.log('Game started with ID:', this.currentGameId);
            }

            return {
                success: true,
                gameId: this.currentGameId,
                txHash: tx.hash
            };

        } catch (error) {
            console.error('Failed to place bet:', error);

            // Handle user rejection
            if (error.code === 4001) {
                throw new Error('Transaction rejected by user');
            }

            throw new Error(error.message || 'Failed to place bet');
        }
    }

    // Submit game result
    async submitResult(won, finalX, finalY) {
        if (!this.isConnected || !this.currentGameId) {
            throw new Error('No active game');
        }

        try {
            console.log('Submitting result...', {
                gameId: this.currentGameId,
                won,
                finalX: Math.floor(finalX),
                finalY: Math.floor(finalY)
            });

            const tx = await this.contract.submitResult(
                this.currentGameId,
                won,
                Math.floor(finalX),
                Math.floor(finalY)
            );

            console.log('Result transaction sent:', tx.hash);

            const receipt = await tx.wait();
            console.log('Result confirmed:', receipt);

            // Extract payout from event
            const event = receipt.events?.find(e => e.event === 'GameEnded');
            let payout = 0;
            if (event && event.args.payout) {
                payout = ethers.utils.formatEther(event.args.payout);
            }

            return {
                success: true,
                won,
                payout,
                txHash: tx.hash
            };

        } catch (error) {
            console.error('Failed to submit result:', error);
            throw new Error(error.message || 'Failed to submit result');
        }
    }

    // Get player statistics
    async getPlayerStats() {
        if (!this.isConnected) {
            return {
                totalGames: 0,
                wins: 0,
                totalWinnings: '0'
            };
        }

        try {
            const stats = await this.contract.getPlayerStats();

            return {
                totalGames: stats.totalGames.toNumber(),
                wins: stats.wins.toNumber(),
                totalWinnings: ethers.utils.formatEther(stats.totalWinnings)
            };

        } catch (error) {
            console.error('Failed to get player stats:', error);
            return {
                totalGames: 0,
                wins: 0,
                totalWinnings: '0'
            };
        }
    }

    // Get game result
    async getGameResult(gameId) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const result = await this.contract.getGameResult(gameId);

            return {
                player: result.player,
                won: result.won,
                betAmount: ethers.utils.formatEther(result.betAmount),
                timestamp: result.timestamp.toNumber()
            };

        } catch (error) {
            console.error('Failed to get game result:', error);
            throw error;
        }
    }

    // Get account balance
    async getBalance() {
        if (!this.isConnected || !this.provider) {
            return '0';
        }

        try {
            const balance = await this.provider.getBalance(this.account);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error('Failed to get balance:', error);
            return '0';
        }
    }

    // Format address for display
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // Check if wallet is connected
    isWalletConnected() {
        return this.isConnected && this.account !== null;
    }

    // Get current account
    getCurrentAccount() {
        return this.account;
    }
}

// Create singleton instance
export const web3Manager = new Web3Manager();

// Initialize on load
web3Manager.init();
