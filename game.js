// Main Game Controller
import { CONFIG } from './config.js';
import { web3Manager } from './web3.js';
import { PhysicsEngine } from './physics.js';

class CoinDropGame {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.canvas.width = CONFIG.canvas.width;
        this.canvas.height = CONFIG.canvas.height;

        // Physics engine
        this.physics = new PhysicsEngine(this.canvas, this.ctx);

        // Game state
        this.currentState = CONFIG.states.IDLE;
        this.currentAngle = 180;
        this.currentForce = 0.5;
        this.settleTimer = 0;
        this.settleDelay = 120; // frames to wait before checking result

        // UI elements
        this.initUIElements();

        // Event listeners
        this.setupEventListeners();

        // Start game loop
        this.lastTime = 0;
        this.gameLoop(0);

        // Set initial status
        this.updateStatus('Ready to play! (Demo mode - no wallet needed)');

        console.log('CoinDrop game initialized in demo mode');
    }

    // Initialize UI element references
    initUIElements() {
        this.elements = {
            // Buttons
            connectWallet: document.getElementById('connectWallet'),
            dropButton: document.getElementById('dropButton'),
            resetButton: document.getElementById('resetButton'),

            // Status
            networkStatus: document.getElementById('networkStatus'),
            statusText: document.getElementById('statusText'),
            gameStatus: document.getElementById('gameStatus'),

            // Controls
            angleSlider: document.getElementById('angleSlider'),
            angleValue: document.getElementById('angleValue'),
            forceSlider: document.getElementById('forceSlider'),
            forceValue: document.getElementById('forceValue'),

            // Stats
            totalGames: document.getElementById('totalGames'),
            totalWins: document.getElementById('totalWins'),
            winRate: document.getElementById('winRate'),
            betAmount: document.getElementById('betAmount'),

            // Result display
            resultDisplay: document.getElementById('resultDisplay'),
            resultIcon: document.getElementById('resultIcon'),
            resultTitle: document.getElementById('resultTitle'),
            resultMessage: document.getElementById('resultMessage'),
            resultReward: document.getElementById('resultReward'),

            // Angle indicator
            angleIndicator: document.getElementById('angleIndicator')
        };
    }

    // Setup event listeners
    setupEventListeners() {
        // Wallet connection
        this.elements.connectWallet.addEventListener('click', () => this.handleConnectWallet());

        // Game controls
        this.elements.dropButton.addEventListener('click', () => this.handleDropCoin());
        this.elements.resetButton.addEventListener('click', () => this.handleReset());

        // Sliders
        this.elements.angleSlider.addEventListener('input', (e) => {
            this.currentAngle = parseInt(e.target.value);
            this.elements.angleValue.textContent = `${this.currentAngle}°`;
            this.updateAngleIndicator();
        });

        this.elements.forceSlider.addEventListener('input', (e) => {
            this.currentForce = parseInt(e.target.value) / 100;
            this.elements.forceValue.textContent = `${this.currentForce.toFixed(1)}x`;
        });
    }

    // Handle wallet connection
    async handleConnectWallet() {
        this.elements.connectWallet.disabled = true;
        this.elements.connectWallet.innerHTML = '<span class="btn-icon">⏳</span>Connecting...';

        try {
            const result = await web3Manager.connectWallet();

            if (result.success) {
                this.onWalletConnected(result.account);
            } else {
                this.showError(result.error);
                this.elements.connectWallet.disabled = false;
                this.elements.connectWallet.innerHTML = '<span class="btn-icon">🔗</span>Connect Wallet';
            }
        } catch (error) {
            this.showError(error.message);
            this.elements.connectWallet.disabled = false;
            this.elements.connectWallet.innerHTML = '<span class="btn-icon">🔗</span>Connect Wallet';
        }
    }

    // Wallet connected callback
    async onWalletConnected(account) {
        console.log('Wallet connected:', account);

        // Update UI
        this.elements.connectWallet.innerHTML = `<span class="btn-icon">✓</span>${web3Manager.formatAddress(account)}`;
        this.elements.networkStatus.classList.add('connected');
        this.elements.networkStatus.innerHTML = '<div class="status-dot"></div><span>Monad Network</span>';

        // Enable drop button
        this.elements.dropButton.disabled = false;

        // Load player stats
        await this.loadPlayerStats();

        this.updateStatus('Connected! Ready to play');
    }

    // Load player statistics
    async loadPlayerStats() {
        try {
            const stats = await web3Manager.getPlayerStats();

            this.elements.totalGames.textContent = stats.totalGames;
            this.elements.totalWins.textContent = stats.wins;

            const winRate = stats.totalGames > 0
                ? ((stats.wins / stats.totalGames) * 100).toFixed(1)
                : 0;
            this.elements.winRate.textContent = `${winRate}%`;

        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    // Handle coin drop
    async handleDropCoin() {
        if (this.currentState !== CONFIG.states.IDLE) return;

        this.currentState = CONFIG.states.AIMING;
        this.elements.dropButton.disabled = true;

        // Check if wallet is connected
        if (!web3Manager.isWalletConnected()) {
            // Demo mode - no blockchain
            console.log('Playing in demo mode (no blockchain)');
            this.elements.dropButton.innerHTML = '<span class="btn-icon">🎯</span>Dropping...';
            this.updateStatus('Demo mode - Dropping coin...');

            // Simulate a small delay
            await this.delay(500);

            // Start physics simulation directly
            this.startDrop();
            return;
        }

        // Blockchain mode
        this.elements.dropButton.innerHTML = '<span class="btn-icon">⏳</span>Placing Bet...';

        try {
            // Place bet on blockchain
            this.updateStatus('Placing bet on blockchain...');
            const betResult = await web3Manager.placeBet(this.currentAngle, this.currentForce);

            if (betResult.success) {
                console.log('Bet placed, game ID:', betResult.gameId);
                this.updateStatus('Bet placed! Dropping coin...');

                // Start physics simulation
                this.startDrop();
            } else {
                throw new Error('Failed to place bet');
            }

        } catch (error) {
            console.error('Drop failed:', error);
            this.showError(error.message);
            this.currentState = CONFIG.states.IDLE;
            this.elements.dropButton.disabled = false;
            this.elements.dropButton.innerHTML = '<span class="btn-icon">🎯</span>Drop Coin';
        }
    }

    // Start the drop animation
    startDrop() {
        this.currentState = CONFIG.states.DROPPING;
        this.elements.dropButton.innerHTML = '<span class="btn-icon">🎯</span>Dropping...';

        // Drop the coin
        this.physics.dropCoin(this.currentAngle, this.currentForce);

        this.updateStatus('Coin is falling...');
    }

    // Handle reset
    handleReset() {
        this.physics.reset();
        this.currentState = CONFIG.states.IDLE;
        this.settleTimer = 0;

        this.elements.resultDisplay.classList.remove('show', 'win', 'loss');

        if (web3Manager.isWalletConnected()) {
            this.elements.dropButton.disabled = false;
            this.elements.dropButton.innerHTML = '<span class="btn-icon">🎯</span>Drop Coin';
            this.updateStatus('Ready to play');
        } else {
            this.updateStatus('Connect wallet to play');
        }
    }

    // Update game state
    updateGameState() {
        if (this.currentState === CONFIG.states.DROPPING) {
            // Check if coin has settled
            if (this.physics.isCoinSettled()) {
                this.settleTimer++;

                if (this.settleTimer >= this.settleDelay) {
                    this.currentState = CONFIG.states.SETTLING;
                    this.checkResult();
                }
            } else {
                this.settleTimer = 0;
            }
        }
    }

    // Check game result
    async checkResult() {
        this.currentState = CONFIG.states.RESULT;
        this.updateStatus('Checking result...');

        const won = this.physics.isCoinInTarget();
        const coinPos = this.physics.getCoinPosition();

        console.log('Game result:', won ? 'WIN' : 'LOSS', 'Position:', coinPos);

        // Show visual feedback
        if (won) {
            this.physics.celebrate();
        } else {
            this.physics.showLoss();
        }

        // Wait a moment for visual effect
        await this.delay(1000);

        // Check if in demo mode or blockchain mode
        if (!web3Manager.isWalletConnected()) {
            // Demo mode - show result without blockchain
            console.log('Demo mode - showing result without blockchain');
            const demoPayout = won ? CONFIG.web3.betAmount * 1.8 : 0;
            this.showResult(won, demoPayout.toFixed(3));

            // Re-enable controls
            this.elements.dropButton.disabled = false;
            this.elements.dropButton.innerHTML = '<span class="btn-icon">🎯</span>Drop Coin';
            return;
        }

        // Blockchain mode - submit result to blockchain
        try {
            this.updateStatus('Submitting result to blockchain...');

            const result = await web3Manager.submitResult(
                won,
                coinPos.x,
                coinPos.y
            );

            if (result.success) {
                this.showResult(won, result.payout);
                await this.loadPlayerStats();
            } else {
                throw new Error('Failed to submit result');
            }

        } catch (error) {
            console.error('Failed to submit result:', error);
            this.showError('Failed to verify result on blockchain');
        }

        // Re-enable controls
        this.elements.dropButton.disabled = false;
        this.elements.dropButton.innerHTML = '<span class="btn-icon">🎯</span>Drop Coin';
    }

    // Show game result
    showResult(won, payout) {
        this.elements.resultDisplay.classList.add('show');

        if (won) {
            this.elements.resultDisplay.classList.add('win');
            this.elements.resultIcon.textContent = '🎉';
            this.elements.resultTitle.textContent = 'You Win!';
            this.elements.resultMessage.textContent = 'Perfect drop! The coin landed in the target.';
            this.elements.resultReward.textContent = `+${payout} MON`;
            this.elements.resultReward.style.color = 'var(--success)';
            this.updateStatus('You won! 🎉');
        } else {
            this.elements.resultDisplay.classList.add('loss');
            this.elements.resultIcon.textContent = '😔';
            this.elements.resultTitle.textContent = 'You Lost';
            this.elements.resultMessage.textContent = 'So close! Try adjusting your angle or force.';
            this.elements.resultReward.textContent = `-${CONFIG.web3.betAmount} MON`;
            this.elements.resultReward.style.color = 'var(--danger)';
            this.updateStatus('Better luck next time!');
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.handleReset();
        }, 5000);
    }

    // Update angle indicator
    updateAngleIndicator() {
        const angleRad = (this.currentAngle * Math.PI) / 180;
        const centerX = this.canvas.width / 2;
        const centerY = CONFIG.containers.large.y - CONFIG.containers.large.height / 2;

        // Calculate indicator position
        const radius = 50;
        const x = centerX + Math.cos(angleRad) * radius;
        const y = centerY + Math.sin(angleRad) * radius;

        this.elements.angleIndicator.style.left = `${x}px`;
        this.elements.angleIndicator.style.top = `${y}px`;
        this.elements.angleIndicator.style.transform = `rotate(${this.currentAngle + 90}deg)`;
    }

    // Update status message
    updateStatus(message) {
        this.elements.statusText.textContent = message;
    }

    // Show error message
    showError(message) {
        alert(`Error: ${message}`);
        console.error(message);
    }

    // Delay helper
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Main game loop
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Update physics
        this.physics.update();

        // Update game state
        this.updateGameState();

        // Render
        this.physics.render();

        // Continue loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// Initialize game when DOM and libraries are loaded
function initializeGame() {
    console.log('Attempting to initialize game...');
    console.log('ethers available:', typeof ethers !== 'undefined');
    console.log('Matter available:', typeof Matter !== 'undefined');

    // Check for ethers.js
    if (typeof ethers === 'undefined') {
        console.error('ethers.js not loaded');
        alert('Failed to load ethers.js library.\n\nPlease refresh the page.\n\nIf the problem persists:\n- Check your internet connection\n- Disable ad blockers\n- Try a different browser');
        return;
    }

    // Check for Matter.js
    if (typeof Matter === 'undefined') {
        console.error('Matter.js not loaded');
        alert('Failed to load Matter.js physics engine.\n\nPlease refresh the page.\n\nIf the problem persists:\n- Check your internet connection\n- Disable ad blockers\n- Try a different browser');
        return;
    }

    // Initialize game
    try {
        window.game = new CoinDropGame();
        console.log('✓ Game initialized successfully!');
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error starting game: ' + error.message);
    }
}

// Wait for libraries to load with multiple attempts
let initAttempts = 0;
const maxInitAttempts = 10;

function tryInitialize() {
    initAttempts++;

    if (typeof ethers !== 'undefined' && typeof Matter !== 'undefined') {
        // Both libraries loaded
        initializeGame();
    } else if (initAttempts < maxInitAttempts) {
        // Try again
        console.log('Waiting for libraries... attempt', initAttempts);
        setTimeout(tryInitialize, 1000);
    } else {
        // Give up
        console.error('Libraries failed to load after', maxInitAttempts, 'attempts');
        alert('Failed to load required libraries after multiple attempts.\n\nPlease:\n1. Refresh the page\n2. Check your internet connection\n3. Disable browser extensions/ad blockers\n4. Try a different browser');
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(tryInitialize, 1000);
    });
} else {
    setTimeout(tryInitialize, 1000);
}

