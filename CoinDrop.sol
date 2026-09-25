// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CoinDrop
 * @dev Smart contract for CoinDrop physics-based game on Monad
 */
contract CoinDrop {
    
    // Game result structure
    struct GameResult {
        address player;
        uint256 angle;
        uint256 force;
        bool won;
        int256 finalX;
        int256 finalY;
        uint256 betAmount;
        uint256 payout;
        uint256 timestamp;
    }
    
    // Player statistics
    struct PlayerStats {
        uint256 totalGames;
        uint256 wins;
        uint256 totalWinnings;
    }
    
    // State variables
    mapping(uint256 => GameResult) public games;
    mapping(address => PlayerStats) public playerStats;
    uint256 public nextGameId;
    uint256 public minBet;
    uint256 public maxBet;
    uint256 public houseEdge; // Percentage (e.g., 10 = 10%)
    address public owner;
    
    // Events
    event GameStarted(
        address indexed player,
        uint256 gameId,
        uint256 betAmount
    );
    
    event GameEnded(
        address indexed player,
        uint256 gameId,
        bool won,
        uint256 payout
    );
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier validBet() {
        require(msg.value >= minBet, "Bet too small");
        require(msg.value <= maxBet, "Bet too large");
        _;
    }
    
    /**
     * @dev Constructor
     */
    constructor() {
        owner = msg.sender;
        nextGameId = 1;
        minBet = 0.001 ether;  // Minimum bet
        maxBet = 1 ether;      // Maximum bet
        houseEdge = 10;        // 10% house edge
    }
    
    /**
     * @dev Place a bet and start a new game
     * @param _angle Drop angle (0-360)
     * @param _force Drop force (multiplied by 100, e.g., 50 = 0.5x)
     * @return gameId The ID of the created game
     */
    function placeBet(uint256 _angle, uint256 _force) 
        external 
        payable 
        validBet 
        returns (uint256) 
    {
        require(_angle <= 360, "Invalid angle");
        require(_force >= 30 && _force <= 150, "Invalid force");
        
        uint256 gameId = nextGameId++;
        
        games[gameId] = GameResult({
            player: msg.sender,
            angle: _angle,
            force: _force,
            won: false,
            finalX: 0,
            finalY: 0,
            betAmount: msg.value,
            payout: 0,
            timestamp: block.timestamp
        });
        
        emit GameStarted(msg.sender, gameId, msg.value);
        
        return gameId;
    }
    
    /**
     * @dev Submit game result after physics simulation
     * @param _gameId The game ID
     * @param _won Whether the player won
     * @param _finalX Final X position of coin
     * @param _finalY Final Y position of coin
     */
    function submitResult(
        uint256 _gameId,
        bool _won,
        int256 _finalX,
        int256 _finalY
    ) external {
        GameResult storage game = games[_gameId];
        
        require(game.player == msg.sender, "Not your game");
        require(game.payout == 0, "Game already settled");
        require(block.timestamp <= game.timestamp + 5 minutes, "Game expired");
        
        game.won = _won;
        game.finalX = _finalX;
        game.finalY = _finalY;
        
        uint256 payout = 0;
        
        if (_won) {
            // Calculate payout with house edge
            // Win multiplier: 1.8x (100% - 10% house edge = 90%, so 2x * 0.9 = 1.8x)
            payout = (game.betAmount * 180) / 100;
            
            require(address(this).balance >= payout, "Insufficient contract balance");
            
            game.payout = payout;
            
            // Update player stats
            playerStats[msg.sender].wins++;
            playerStats[msg.sender].totalWinnings += payout;
            
            // Transfer payout
            payable(msg.sender).transfer(payout);
        }
        
        // Update player stats
        playerStats[msg.sender].totalGames++;
        
        emit GameEnded(msg.sender, _gameId, _won, payout);
    }
    
    /**
     * @dev Get player statistics
     * @return totalGames Total games played
     * @return wins Total wins
     * @return totalWinnings Total winnings in wei
     */
    function getPlayerStats() external view returns (
        uint256 totalGames,
        uint256 wins,
        uint256 totalWinnings
    ) {
        PlayerStats memory stats = playerStats[msg.sender];
        return (stats.totalGames, stats.wins, stats.totalWinnings);
    }
    
    /**
     * @dev Get game result
     * @param _gameId The game ID
     * @return player Player address
     * @return won Whether player won
     * @return betAmount Bet amount
     * @return timestamp Game timestamp
     */
    function getGameResult(uint256 _gameId) external view returns (
        address player,
        bool won,
        uint256 betAmount,
        uint256 timestamp
    ) {
        GameResult memory game = games[_gameId];
        return (game.player, game.won, game.betAmount, game.timestamp);
    }
    
    /**
     * @dev Update minimum bet (owner only)
     */
    function setMinBet(uint256 _minBet) external onlyOwner {
        minBet = _minBet;
    }
    
    /**
     * @dev Update maximum bet (owner only)
     */
    function setMaxBet(uint256 _maxBet) external onlyOwner {
        maxBet = _maxBet;
    }
    
    /**
     * @dev Update house edge (owner only)
     */
    function setHouseEdge(uint256 _houseEdge) external onlyOwner {
        require(_houseEdge <= 50, "House edge too high");
        houseEdge = _houseEdge;
    }
    
    /**
     * @dev Fund the contract (anyone can add funds)
     */
    function fundContract() external payable {
        require(msg.value > 0, "Must send funds");
    }
    
    /**
     * @dev Withdraw funds (owner only)
     */
    function withdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");
        payable(owner).transfer(_amount);
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
