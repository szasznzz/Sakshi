// Game Configuration
export const CONFIG = {
  // Canvas settings
  canvas: {
    width: 800,
    height: 600,
    backgroundColor: '#0a0e27'
  },

  // Physics settings
  physics: {
    gravity: 0.8,
    airResistance: 0.01,
    waterResistance: 0.3,
    coinRestitution: 0.4,
    coinFriction: 0.1
  },

  // Container dimensions (in pixels)
  containers: {
    large: {
      width: 400,
      height: 350,
      x: 400,
      y: 450,
      wallThickness: 8,
      waterLevel: 300 // height of water from bottom
    },
    small: {
      width: 120,
      height: 100,
      x: 400,
      y: 400,
      wallThickness: 6
    }
  },

  // Coin settings
  coin: {
    radius: 12,
    mass: 1,
    color: '#FFD700',
    glowColor: '#FFA500'
  },

  // Drop settings
  drop: {
    minAngle: 0,
    maxAngle: 360,
    defaultForce: 0.5,
    minForce: 0.3,
    maxForce: 1.5,
    dropHeight: 50 // pixels above container
  },

  // Visual effects
  effects: {
    particleCount: 30,
    splashThreshold: 5, // velocity threshold for splash
    glowIntensity: 0.8
  },

  // Web3 settings
  web3: {
    chainId: 41454, // Monad Devnet chain ID
    chainName: 'Monad Devnet',
    rpcUrl: 'https://devnet.monad.xyz', // Monad Devnet RPC
    blockExplorer: 'https://explorer.devnet.monad.xyz',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18
    },
    contractAddress: '0x0000000000000000000000000000000000000000', // To be updated after deployment
    betAmount: '0.01' // in MON
  },

  // Game states
  states: {
    IDLE: 'idle',
    AIMING: 'aiming',
    DROPPING: 'dropping',
    SETTLING: 'settling',
    RESULT: 'result'
  }
};
