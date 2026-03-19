// ============================================================
// GAME DATA DEFINITIONS
// Ships, Star Systems, Resources, Upgrades
// ============================================================

// --- RESOURCE TYPES ---
const RESOURCES = {
  TRITANIUM: { id: 'tritanium', name: 'Tritanium', color: '#8B8B8B', description: 'Common metal used for hull plating' },
  DILITHIUM: { id: 'dilithium', name: 'Dilithium', color: '#9B59B6', description: 'Crystal used for warp drive systems' },
  PARSTEEL: { id: 'parsteel', name: 'Parsteel', color: '#E67E22', description: 'Refined alloy for ship construction' },
  LATINUM: { id: 'latinum', name: 'Latinum', color: '#F1C40F', description: 'Precious material for advanced upgrades' },
  PLASMA: { id: 'plasma', name: 'Plasma', color: '#E74C3C', description: 'Energy resource for weapons systems' },
};

// --- SHIP CLASSES ---
const SHIP_CLASSES = {
  // Combat Ships
  interceptor: {
    id: 'interceptor',
    name: 'Interceptor',
    class: 'combat',
    description: 'Fast light fighter, great for hit-and-run attacks',
    baseStats: {
      hull: 100,
      armor: 30,
      shields: 50,
      laserDamage: 15,
      torpedoDamage: 0,
      fireRate: 1.5,       // attacks per second
      speed: 120,           // pixels per second in system
      warpRange: 2,         // how many systems away it can warp
      cargo: 50,
    },
    cost: { parsteel: 200, tritanium: 100 },
    icon: '▲',
    color: '#3498DB',
  },
  frigate: {
    id: 'frigate',
    name: 'Frigate',
    class: 'combat',
    description: 'Balanced warship with shields and torpedoes',
    baseStats: {
      hull: 200,
      armor: 60,
      shields: 100,
      laserDamage: 20,
      torpedoDamage: 30,
      fireRate: 1.0,
      speed: 80,
      warpRange: 3,
      cargo: 100,
    },
    cost: { parsteel: 500, tritanium: 300, dilithium: 100 },
    icon: '◆',
    color: '#2980B9',
  },
  cruiser: {
    id: 'cruiser',
    name: 'Cruiser',
    class: 'combat',
    description: 'Heavy warship with strong armor and weapons',
    baseStats: {
      hull: 400,
      armor: 120,
      shields: 200,
      laserDamage: 35,
      torpedoDamage: 50,
      fireRate: 0.8,
      speed: 60,
      warpRange: 4,
      cargo: 200,
    },
    cost: { parsteel: 1200, tritanium: 800, dilithium: 400, plasma: 100 },
    icon: '⬟',
    color: '#1A5276',
  },
  battleship: {
    id: 'battleship',
    name: 'Battleship',
    class: 'combat',
    description: 'Massive capital ship, dominates the battlefield',
    baseStats: {
      hull: 800,
      armor: 250,
      shields: 400,
      laserDamage: 60,
      torpedoDamage: 100,
      fireRate: 0.5,
      speed: 40,
      warpRange: 5,
      cargo: 400,
    },
    cost: { parsteel: 3000, tritanium: 2000, dilithium: 1000, plasma: 500, latinum: 100 },
    icon: '⬢',
    color: '#0B3D91',
  },

  // Mining Ships
  mining_shuttle: {
    id: 'mining_shuttle',
    name: 'Mining Shuttle',
    class: 'mining',
    description: 'Small mining vessel, cheap and efficient',
    baseStats: {
      hull: 60,
      armor: 10,
      shields: 20,
      laserDamage: 5,
      torpedoDamage: 0,
      fireRate: 0.5,
      speed: 70,
      warpRange: 2,
      cargo: 200,
      miningRate: 10,  // resources per second
    },
    cost: { parsteel: 100 },
    icon: '⊞',
    color: '#27AE60',
  },
  mining_freighter: {
    id: 'mining_freighter',
    name: 'Mining Freighter',
    class: 'mining',
    description: 'Large mining vessel with massive cargo hold',
    baseStats: {
      hull: 150,
      armor: 30,
      shields: 40,
      laserDamage: 8,
      torpedoDamage: 0,
      fireRate: 0.3,
      speed: 45,
      warpRange: 3,
      cargo: 800,
      miningRate: 25,
    },
    cost: { parsteel: 400, tritanium: 200, dilithium: 50 },
    icon: '⊟',
    color: '#229954',
  },

  // Exploration / Utility
  scout: {
    id: 'scout',
    name: 'Scout',
    class: 'exploration',
    description: 'Long-range scout with extended warp capability',
    baseStats: {
      hull: 50,
      armor: 10,
      shields: 30,
      laserDamage: 8,
      torpedoDamage: 0,
      fireRate: 1.0,
      speed: 150,
      warpRange: 6,
      cargo: 30,
    },
    cost: { parsteel: 150, dilithium: 50 },
    icon: '►',
    color: '#1ABC9C',
  },
};

// --- UPGRADE TIERS ---
// Each component can be upgraded from tier 1 to tier 10
// Multipliers compound on base stats
const UPGRADE_TIERS = {
  armor: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.2, cost: { tritanium: 100 } },
    { tier: 3, multiplier: 1.5, cost: { tritanium: 250, parsteel: 100 } },
    { tier: 4, multiplier: 1.8, cost: { tritanium: 500, parsteel: 200 } },
    { tier: 5, multiplier: 2.2, cost: { tritanium: 1000, parsteel: 500, dilithium: 100 } },
    { tier: 6, multiplier: 2.7, cost: { tritanium: 2000, parsteel: 1000, dilithium: 300 } },
    { tier: 7, multiplier: 3.3, cost: { tritanium: 4000, parsteel: 2000, dilithium: 600 } },
    { tier: 8, multiplier: 4.0, cost: { tritanium: 8000, parsteel: 4000, dilithium: 1200, latinum: 50 } },
    { tier: 9, multiplier: 5.0, cost: { tritanium: 15000, parsteel: 8000, dilithium: 2500, latinum: 150 } },
    { tier: 10, multiplier: 6.5, cost: { tritanium: 30000, parsteel: 15000, dilithium: 5000, latinum: 500 } },
  ],
  shields: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.2, cost: { dilithium: 80 } },
    { tier: 3, multiplier: 1.5, cost: { dilithium: 200, parsteel: 80 } },
    { tier: 4, multiplier: 1.8, cost: { dilithium: 450, parsteel: 150 } },
    { tier: 5, multiplier: 2.2, cost: { dilithium: 900, parsteel: 400, plasma: 80 } },
    { tier: 6, multiplier: 2.7, cost: { dilithium: 1800, parsteel: 800, plasma: 200 } },
    { tier: 7, multiplier: 3.3, cost: { dilithium: 3500, parsteel: 1600, plasma: 500 } },
    { tier: 8, multiplier: 4.0, cost: { dilithium: 7000, parsteel: 3200, plasma: 1000, latinum: 50 } },
    { tier: 9, multiplier: 5.0, cost: { dilithium: 13000, parsteel: 6000, plasma: 2000, latinum: 150 } },
    { tier: 10, multiplier: 6.5, cost: { dilithium: 25000, parsteel: 12000, plasma: 4000, latinum: 500 } },
  ],
  lasers: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.3, cost: { plasma: 80 } },
    { tier: 3, multiplier: 1.6, cost: { plasma: 200, tritanium: 80 } },
    { tier: 4, multiplier: 2.0, cost: { plasma: 450, tritanium: 180 } },
    { tier: 5, multiplier: 2.5, cost: { plasma: 900, tritanium: 400, dilithium: 100 } },
    { tier: 6, multiplier: 3.0, cost: { plasma: 1800, tritanium: 800, dilithium: 250 } },
    { tier: 7, multiplier: 3.7, cost: { plasma: 3500, tritanium: 1600, dilithium: 500 } },
    { tier: 8, multiplier: 4.5, cost: { plasma: 7000, tritanium: 3200, dilithium: 1000, latinum: 50 } },
    { tier: 9, multiplier: 5.5, cost: { plasma: 13000, tritanium: 6000, dilithium: 2000, latinum: 150 } },
    { tier: 10, multiplier: 7.0, cost: { plasma: 25000, tritanium: 12000, dilithium: 4000, latinum: 500 } },
  ],
  torpedoes: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.3, cost: { plasma: 100, tritanium: 50 } },
    { tier: 3, multiplier: 1.7, cost: { plasma: 250, tritanium: 120 } },
    { tier: 4, multiplier: 2.1, cost: { plasma: 550, tritanium: 250 } },
    { tier: 5, multiplier: 2.6, cost: { plasma: 1100, tritanium: 500, dilithium: 150 } },
    { tier: 6, multiplier: 3.2, cost: { plasma: 2200, tritanium: 1000, dilithium: 350 } },
    { tier: 7, multiplier: 4.0, cost: { plasma: 4500, tritanium: 2000, dilithium: 700 } },
    { tier: 8, multiplier: 5.0, cost: { plasma: 9000, tritanium: 4000, dilithium: 1400, latinum: 80 } },
    { tier: 9, multiplier: 6.2, cost: { plasma: 17000, tritanium: 8000, dilithium: 2800, latinum: 200 } },
    { tier: 10, multiplier: 8.0, cost: { plasma: 33000, tritanium: 15000, dilithium: 5500, latinum: 600 } },
  ],
  cargo: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.3, cost: { parsteel: 100 } },
    { tier: 3, multiplier: 1.6, cost: { parsteel: 250, tritanium: 80 } },
    { tier: 4, multiplier: 2.0, cost: { parsteel: 500, tritanium: 200 } },
    { tier: 5, multiplier: 2.5, cost: { parsteel: 1000, tritanium: 500 } },
    { tier: 6, multiplier: 3.0, cost: { parsteel: 2000, tritanium: 1000, dilithium: 100 } },
    { tier: 7, multiplier: 3.7, cost: { parsteel: 4000, tritanium: 2000, dilithium: 300 } },
    { tier: 8, multiplier: 4.5, cost: { parsteel: 8000, tritanium: 4000, dilithium: 600 } },
    { tier: 9, multiplier: 5.5, cost: { parsteel: 15000, tritanium: 8000, dilithium: 1200 } },
    { tier: 10, multiplier: 7.0, cost: { parsteel: 30000, tritanium: 15000, dilithium: 2500, latinum: 200 } },
  ],
  warp: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.5, cost: { dilithium: 150 } },
    { tier: 3, multiplier: 2.0, cost: { dilithium: 400, parsteel: 100 } },
    { tier: 4, multiplier: 2.5, cost: { dilithium: 800, parsteel: 300 } },
    { tier: 5, multiplier: 3.0, cost: { dilithium: 1500, parsteel: 600, latinum: 30 } },
    { tier: 6, multiplier: 3.5, cost: { dilithium: 3000, parsteel: 1200, latinum: 80 } },
    { tier: 7, multiplier: 4.0, cost: { dilithium: 6000, parsteel: 2500, latinum: 150 } },
    { tier: 8, multiplier: 4.5, cost: { dilithium: 12000, parsteel: 5000, latinum: 300 } },
    { tier: 9, multiplier: 5.0, cost: { dilithium: 24000, parsteel: 10000, latinum: 600 } },
    { tier: 10, multiplier: 6.0, cost: { dilithium: 50000, parsteel: 20000, latinum: 1500 } },
  ],
};

// --- STAR SYSTEMS ---
// Galaxy map: systems are connected by warp lanes
// distance = number of "jumps" between systems
const STAR_SYSTEMS = [
  // Safe Zone (PVE) - Starting area
  {
    id: 'sol',
    name: 'Sol',
    x: 400, y: 400,
    type: 'safe',
    level: 1,
    color: '#F1C40F',
    planets: [
      { name: 'Earth', type: 'homeworld', resources: null },
      { name: 'Mars', type: 'mining', resource: 'parsteel', richness: 1.0 },
      { name: 'Luna', type: 'mining', resource: 'tritanium', richness: 0.8 },
    ],
    connections: ['alpha_centauri', 'sirius'],
  },
  {
    id: 'alpha_centauri',
    name: 'Alpha Centauri',
    x: 300, y: 300,
    type: 'safe',
    level: 1,
    color: '#F39C12',
    planets: [
      { name: 'Centauri Prime', type: 'homeworld', resources: null },
      { name: 'Centauri II', type: 'mining', resource: 'tritanium', richness: 1.0 },
      { name: 'Centauri III', type: 'mining', resource: 'parsteel', richness: 0.8 },
    ],
    connections: ['sol', 'vega', 'wolf_359'],
  },
  {
    id: 'sirius',
    name: 'Sirius',
    x: 500, y: 300,
    type: 'safe',
    level: 1,
    color: '#85C1E9',
    planets: [
      { name: 'Sirius Prime', type: 'homeworld', resources: null },
      { name: 'Sirius II', type: 'mining', resource: 'parsteel', richness: 1.2 },
    ],
    connections: ['sol', 'rigel', 'procyon'],
  },
  {
    id: 'vega',
    name: 'Vega',
    x: 200, y: 200,
    type: 'safe',
    level: 2,
    color: '#AED6F1',
    planets: [
      { name: 'Vega Prime', type: 'station', resources: null },
      { name: 'Vega II', type: 'mining', resource: 'dilithium', richness: 0.6 },
      { name: 'Vega III', type: 'mining', resource: 'tritanium', richness: 1.2 },
    ],
    connections: ['alpha_centauri', 'deneb'],
  },
  {
    id: 'procyon',
    name: 'Procyon',
    x: 600, y: 200,
    type: 'safe',
    level: 2,
    color: '#F9E79F',
    planets: [
      { name: 'Procyon Prime', type: 'station', resources: null },
      { name: 'Procyon II', type: 'mining', resource: 'dilithium', richness: 0.8 },
      { name: 'Procyon III', type: 'mining', resource: 'parsteel', richness: 1.0 },
    ],
    connections: ['sirius', 'betelgeuse'],
  },

  // Transition Zone (PVE but tougher NPCs)
  {
    id: 'wolf_359',
    name: 'Wolf 359',
    x: 200, y: 400,
    type: 'safe',
    level: 3,
    color: '#E74C3C',
    planets: [
      { name: 'Wolf Prime', type: 'mining', resource: 'plasma', richness: 0.8 },
      { name: 'Wolf II', type: 'mining', resource: 'tritanium', richness: 1.5 },
    ],
    connections: ['alpha_centauri', 'deneb', 'neutral_zone_alpha'],
  },
  {
    id: 'rigel',
    name: 'Rigel',
    x: 600, y: 400,
    type: 'safe',
    level: 3,
    color: '#3498DB',
    planets: [
      { name: 'Rigel Prime', type: 'mining', resource: 'plasma', richness: 1.0 },
      { name: 'Rigel VII', type: 'mining', resource: 'dilithium', richness: 1.0 },
    ],
    connections: ['sirius', 'betelgeuse', 'neutral_zone_beta'],
  },

  // Neutral Zone - Transition to PVP
  {
    id: 'deneb',
    name: 'Deneb',
    x: 150, y: 100,
    type: 'safe',
    level: 4,
    color: '#2ECC71',
    planets: [
      { name: 'Deneb Prime', type: 'mining', resource: 'dilithium', richness: 1.5 },
      { name: 'Deneb IV', type: 'mining', resource: 'plasma', richness: 1.2 },
    ],
    connections: ['vega', 'wolf_359', 'dark_nebula'],
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    x: 650, y: 100,
    type: 'safe',
    level: 4,
    color: '#E74C3C',
    planets: [
      { name: 'Betelgeuse Prime', type: 'mining', resource: 'dilithium', richness: 1.3 },
      { name: 'Betelgeuse III', type: 'mining', resource: 'plasma', richness: 1.5 },
    ],
    connections: ['procyon', 'rigel', 'omega_expanse'],
  },

  // Dangerous Zone (PVP)
  {
    id: 'neutral_zone_alpha',
    name: 'Neutral Zone Alpha',
    x: 100, y: 500,
    type: 'dangerous',
    level: 5,
    color: '#C0392B',
    planets: [
      { name: 'NZ-Alpha I', type: 'mining', resource: 'latinum', richness: 0.5 },
      { name: 'NZ-Alpha II', type: 'mining', resource: 'plasma', richness: 2.0 },
      { name: 'NZ-Alpha III', type: 'mining', resource: 'dilithium', richness: 2.0 },
    ],
    connections: ['wolf_359', 'dark_nebula', 'kepler'],
  },
  {
    id: 'neutral_zone_beta',
    name: 'Neutral Zone Beta',
    x: 700, y: 500,
    type: 'dangerous',
    level: 5,
    color: '#C0392B',
    planets: [
      { name: 'NZ-Beta I', type: 'mining', resource: 'latinum', richness: 0.5 },
      { name: 'NZ-Beta II', type: 'mining', resource: 'plasma', richness: 2.0 },
      { name: 'NZ-Beta III', type: 'mining', resource: 'tritanium', richness: 3.0 },
    ],
    connections: ['rigel', 'omega_expanse', 'andromeda_gate'],
  },
  {
    id: 'dark_nebula',
    name: 'Dark Nebula',
    x: 100, y: 100,
    type: 'dangerous',
    level: 6,
    color: '#8E44AD',
    planets: [
      { name: 'Nebula Station', type: 'mining', resource: 'latinum', richness: 1.0 },
      { name: 'Nebula Core', type: 'mining', resource: 'plasma', richness: 3.0 },
    ],
    connections: ['deneb', 'neutral_zone_alpha', 'singularity'],
  },
  {
    id: 'omega_expanse',
    name: 'Omega Expanse',
    x: 700, y: 100,
    type: 'dangerous',
    level: 6,
    color: '#8E44AD',
    planets: [
      { name: 'Omega Station', type: 'mining', resource: 'latinum', richness: 1.0 },
      { name: 'Omega Prime', type: 'mining', resource: 'dilithium', richness: 3.0 },
    ],
    connections: ['betelgeuse', 'neutral_zone_beta', 'singularity'],
  },

  // Deep Space (High risk, high reward PVP)
  {
    id: 'kepler',
    name: 'Kepler',
    x: 250, y: 600,
    type: 'dangerous',
    level: 7,
    color: '#D35400',
    planets: [
      { name: 'Kepler-442b', type: 'mining', resource: 'latinum', richness: 1.5 },
      { name: 'Kepler-186f', type: 'mining', resource: 'plasma', richness: 2.5 },
      { name: 'Kepler-22b', type: 'mining', resource: 'dilithium', richness: 2.5 },
    ],
    connections: ['neutral_zone_alpha', 'andromeda_gate'],
  },
  {
    id: 'andromeda_gate',
    name: 'Andromeda Gate',
    x: 550, y: 600,
    type: 'dangerous',
    level: 7,
    color: '#D35400',
    planets: [
      { name: 'Gateway Station', type: 'mining', resource: 'latinum', richness: 1.5 },
      { name: 'Andromeda I', type: 'mining', resource: 'tritanium', richness: 4.0 },
      { name: 'Andromeda II', type: 'mining', resource: 'parsteel', richness: 4.0 },
    ],
    connections: ['neutral_zone_beta', 'kepler', 'singularity'],
  },
  {
    id: 'singularity',
    name: 'The Singularity',
    x: 400, y: 50,
    type: 'dangerous',
    level: 10,
    color: '#17202A',
    planets: [
      { name: 'Event Horizon', type: 'mining', resource: 'latinum', richness: 5.0 },
      { name: 'Quantum Rift', type: 'mining', resource: 'plasma', richness: 5.0 },
      { name: 'Dark Matter Well', type: 'mining', resource: 'dilithium', richness: 5.0 },
    ],
    connections: ['dark_nebula', 'omega_expanse', 'andromeda_gate'],
  },
];

// Helper: get warp distance between two systems (BFS shortest path)
function getWarpDistance(fromId, toId) {
  if (fromId === toId) return 0;
  const visited = new Set();
  const queue = [{ id: fromId, dist: 0 }];
  visited.add(fromId);
  while (queue.length > 0) {
    const { id, dist } = queue.shift();
    const system = STAR_SYSTEMS.find(s => s.id === id);
    if (!system) continue;
    for (const connId of system.connections) {
      if (connId === toId) return dist + 1;
      if (!visited.has(connId)) {
        visited.add(connId);
        queue.push({ id: connId, dist: dist + 1 });
      }
    }
  }
  return Infinity;
}

// Starter resources for new players
const STARTER_RESOURCES = {
  parsteel: 500,
  tritanium: 300,
  dilithium: 100,
  plasma: 50,
  latinum: 0,
};

// Starter ships
const STARTER_SHIPS = ['interceptor', 'mining_shuttle'];

module.exports = {
  RESOURCES,
  SHIP_CLASSES,
  UPGRADE_TIERS,
  STAR_SYSTEMS,
  STARTER_RESOURCES,
  STARTER_SHIPS,
  getWarpDistance,
};
