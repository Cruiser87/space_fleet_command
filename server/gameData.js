// ============================================================
// GAME DATA DEFINITIONS
// Ships, Star Systems, Resources, Upgrades
// ============================================================

// --- RESOURCE TYPES ---
const RESOURCES = {
  FERRONITE: { id: 'ferronite', name: 'Ferronite', color: '#8B8B8B', description: 'Dense metal used for hull plating' },
  NEXIUM: { id: 'nexium', name: 'Nexium', color: '#9B59B6', description: 'Rare crystal that powers warp drive systems' },
  STELLITE: { id: 'stellite', name: 'Stellite', color: '#E67E22', description: 'Star-forged alloy for ship construction' },
  AURELIUM: { id: 'aurelium', name: 'Aurelium', color: '#F1C40F', description: 'Precious material for advanced upgrades' },
  PYRATHIUM: { id: 'pyrathium', name: 'Pyrathium', color: '#E74C3C', description: 'Volatile energy fuel for weapons systems' },
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
    cost: { stellite: 200, ferronite: 100 },
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
    cost: { stellite: 500, ferronite: 300, nexium: 100 },
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
    cost: { stellite: 1200, ferronite: 800, nexium: 400, pyrathium: 100 },
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
    cost: { stellite: 3000, ferronite: 2000, nexium: 1000, pyrathium: 500, aurelium: 100 },
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
    cost: { stellite: 100 },
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
    cost: { stellite: 400, ferronite: 200, nexium: 50 },
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
    cost: { stellite: 150, nexium: 50 },
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
    { tier: 2, multiplier: 1.2, cost: { ferronite: 100 } },
    { tier: 3, multiplier: 1.5, cost: { ferronite: 250, stellite: 100 } },
    { tier: 4, multiplier: 1.8, cost: { ferronite: 500, stellite: 200 } },
    { tier: 5, multiplier: 2.2, cost: { ferronite: 1000, stellite: 500, nexium: 100 } },
    { tier: 6, multiplier: 2.7, cost: { ferronite: 2000, stellite: 1000, nexium: 300 } },
    { tier: 7, multiplier: 3.3, cost: { ferronite: 4000, stellite: 2000, nexium: 600 } },
    { tier: 8, multiplier: 4.0, cost: { ferronite: 8000, stellite: 4000, nexium: 1200, aurelium: 50 } },
    { tier: 9, multiplier: 5.0, cost: { ferronite: 15000, stellite: 8000, nexium: 2500, aurelium: 150 } },
    { tier: 10, multiplier: 6.5, cost: { ferronite: 30000, stellite: 15000, nexium: 5000, aurelium: 500 } },
  ],
  shields: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.2, cost: { nexium: 80 } },
    { tier: 3, multiplier: 1.5, cost: { nexium: 200, stellite: 80 } },
    { tier: 4, multiplier: 1.8, cost: { nexium: 450, stellite: 150 } },
    { tier: 5, multiplier: 2.2, cost: { nexium: 900, stellite: 400, pyrathium: 80 } },
    { tier: 6, multiplier: 2.7, cost: { nexium: 1800, stellite: 800, pyrathium: 200 } },
    { tier: 7, multiplier: 3.3, cost: { nexium: 3500, stellite: 1600, pyrathium: 500 } },
    { tier: 8, multiplier: 4.0, cost: { nexium: 7000, stellite: 3200, pyrathium: 1000, aurelium: 50 } },
    { tier: 9, multiplier: 5.0, cost: { nexium: 13000, stellite: 6000, pyrathium: 2000, aurelium: 150 } },
    { tier: 10, multiplier: 6.5, cost: { nexium: 25000, stellite: 12000, pyrathium: 4000, aurelium: 500 } },
  ],
  lasers: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.3, cost: { pyrathium: 80 } },
    { tier: 3, multiplier: 1.6, cost: { pyrathium: 200, ferronite: 80 } },
    { tier: 4, multiplier: 2.0, cost: { pyrathium: 450, ferronite: 180 } },
    { tier: 5, multiplier: 2.5, cost: { pyrathium: 900, ferronite: 400, nexium: 100 } },
    { tier: 6, multiplier: 3.0, cost: { pyrathium: 1800, ferronite: 800, nexium: 250 } },
    { tier: 7, multiplier: 3.7, cost: { pyrathium: 3500, ferronite: 1600, nexium: 500 } },
    { tier: 8, multiplier: 4.5, cost: { pyrathium: 7000, ferronite: 3200, nexium: 1000, aurelium: 50 } },
    { tier: 9, multiplier: 5.5, cost: { pyrathium: 13000, ferronite: 6000, nexium: 2000, aurelium: 150 } },
    { tier: 10, multiplier: 7.0, cost: { pyrathium: 25000, ferronite: 12000, nexium: 4000, aurelium: 500 } },
  ],
  torpedoes: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.3, cost: { pyrathium: 100, ferronite: 50 } },
    { tier: 3, multiplier: 1.7, cost: { pyrathium: 250, ferronite: 120 } },
    { tier: 4, multiplier: 2.1, cost: { pyrathium: 550, ferronite: 250 } },
    { tier: 5, multiplier: 2.6, cost: { pyrathium: 1100, ferronite: 500, nexium: 150 } },
    { tier: 6, multiplier: 3.2, cost: { pyrathium: 2200, ferronite: 1000, nexium: 350 } },
    { tier: 7, multiplier: 4.0, cost: { pyrathium: 4500, ferronite: 2000, nexium: 700 } },
    { tier: 8, multiplier: 5.0, cost: { pyrathium: 9000, ferronite: 4000, nexium: 1400, aurelium: 80 } },
    { tier: 9, multiplier: 6.2, cost: { pyrathium: 17000, ferronite: 8000, nexium: 2800, aurelium: 200 } },
    { tier: 10, multiplier: 8.0, cost: { pyrathium: 33000, ferronite: 15000, nexium: 5500, aurelium: 600 } },
  ],
  cargo: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.3, cost: { stellite: 100 } },
    { tier: 3, multiplier: 1.6, cost: { stellite: 250, ferronite: 80 } },
    { tier: 4, multiplier: 2.0, cost: { stellite: 500, ferronite: 200 } },
    { tier: 5, multiplier: 2.5, cost: { stellite: 1000, ferronite: 500 } },
    { tier: 6, multiplier: 3.0, cost: { stellite: 2000, ferronite: 1000, nexium: 100 } },
    { tier: 7, multiplier: 3.7, cost: { stellite: 4000, ferronite: 2000, nexium: 300 } },
    { tier: 8, multiplier: 4.5, cost: { stellite: 8000, ferronite: 4000, nexium: 600 } },
    { tier: 9, multiplier: 5.5, cost: { stellite: 15000, ferronite: 8000, nexium: 1200 } },
    { tier: 10, multiplier: 7.0, cost: { stellite: 30000, ferronite: 15000, nexium: 2500, aurelium: 200 } },
  ],
  warp: [
    { tier: 1, multiplier: 1.0, cost: {} },
    { tier: 2, multiplier: 1.5, cost: { nexium: 150 } },
    { tier: 3, multiplier: 2.0, cost: { nexium: 400, stellite: 100 } },
    { tier: 4, multiplier: 2.5, cost: { nexium: 800, stellite: 300 } },
    { tier: 5, multiplier: 3.0, cost: { nexium: 1500, stellite: 600, aurelium: 30 } },
    { tier: 6, multiplier: 3.5, cost: { nexium: 3000, stellite: 1200, aurelium: 80 } },
    { tier: 7, multiplier: 4.0, cost: { nexium: 6000, stellite: 2500, aurelium: 150 } },
    { tier: 8, multiplier: 4.5, cost: { nexium: 12000, stellite: 5000, aurelium: 300 } },
    { tier: 9, multiplier: 5.0, cost: { nexium: 24000, stellite: 10000, aurelium: 600 } },
    { tier: 10, multiplier: 6.0, cost: { nexium: 50000, stellite: 20000, aurelium: 1500 } },
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
      { name: 'Mars', type: 'mining', resource: 'stellite', richness: 1.0 },
      { name: 'Luna', type: 'mining', resource: 'ferronite', richness: 0.8 },
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
      { name: 'Centauri II', type: 'mining', resource: 'ferronite', richness: 1.0 },
      { name: 'Centauri III', type: 'mining', resource: 'stellite', richness: 0.8 },
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
      { name: 'Sirius II', type: 'mining', resource: 'stellite', richness: 1.2 },
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
      { name: 'Vega II', type: 'mining', resource: 'nexium', richness: 0.6 },
      { name: 'Vega III', type: 'mining', resource: 'ferronite', richness: 1.2 },
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
      { name: 'Procyon II', type: 'mining', resource: 'nexium', richness: 0.8 },
      { name: 'Procyon III', type: 'mining', resource: 'stellite', richness: 1.0 },
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
      { name: 'Wolf Prime', type: 'mining', resource: 'pyrathium', richness: 0.8 },
      { name: 'Wolf II', type: 'mining', resource: 'ferronite', richness: 1.5 },
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
      { name: 'Rigel Prime', type: 'mining', resource: 'pyrathium', richness: 1.0 },
      { name: 'Rigel VII', type: 'mining', resource: 'nexium', richness: 1.0 },
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
      { name: 'Deneb Prime', type: 'mining', resource: 'nexium', richness: 1.5 },
      { name: 'Deneb IV', type: 'mining', resource: 'pyrathium', richness: 1.2 },
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
      { name: 'Betelgeuse Prime', type: 'mining', resource: 'nexium', richness: 1.3 },
      { name: 'Betelgeuse III', type: 'mining', resource: 'pyrathium', richness: 1.5 },
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
      { name: 'NZ-Alpha I', type: 'mining', resource: 'aurelium', richness: 0.5 },
      { name: 'NZ-Alpha II', type: 'mining', resource: 'pyrathium', richness: 2.0 },
      { name: 'NZ-Alpha III', type: 'mining', resource: 'nexium', richness: 2.0 },
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
      { name: 'NZ-Beta I', type: 'mining', resource: 'aurelium', richness: 0.5 },
      { name: 'NZ-Beta II', type: 'mining', resource: 'pyrathium', richness: 2.0 },
      { name: 'NZ-Beta III', type: 'mining', resource: 'ferronite', richness: 3.0 },
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
      { name: 'Nebula Station', type: 'mining', resource: 'aurelium', richness: 1.0 },
      { name: 'Nebula Core', type: 'mining', resource: 'pyrathium', richness: 3.0 },
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
      { name: 'Omega Station', type: 'mining', resource: 'aurelium', richness: 1.0 },
      { name: 'Omega Prime', type: 'mining', resource: 'nexium', richness: 3.0 },
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
      { name: 'Kepler-442b', type: 'mining', resource: 'aurelium', richness: 1.5 },
      { name: 'Kepler-186f', type: 'mining', resource: 'pyrathium', richness: 2.5 },
      { name: 'Kepler-22b', type: 'mining', resource: 'nexium', richness: 2.5 },
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
      { name: 'Gateway Station', type: 'mining', resource: 'aurelium', richness: 1.5 },
      { name: 'Andromeda I', type: 'mining', resource: 'ferronite', richness: 4.0 },
      { name: 'Andromeda II', type: 'mining', resource: 'stellite', richness: 4.0 },
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
      { name: 'Event Horizon', type: 'mining', resource: 'aurelium', richness: 5.0 },
      { name: 'Quantum Rift', type: 'mining', resource: 'pyrathium', richness: 5.0 },
      { name: 'Dark Matter Well', type: 'mining', resource: 'nexium', richness: 5.0 },
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

// Helper: get shortest warp path between two systems (BFS, returns array of system IDs)
function getWarpPath(fromId, toId) {
  if (fromId === toId) return [fromId];
  const visited = new Set();
  const queue = [{ id: fromId, path: [fromId] }];
  visited.add(fromId);
  while (queue.length > 0) {
    const { id, path } = queue.shift();
    const system = STAR_SYSTEMS.find(s => s.id === id);
    if (!system) continue;
    for (const connId of system.connections) {
      if (connId === toId) return [...path, connId];
      if (!visited.has(connId)) {
        visited.add(connId);
        queue.push({ id: connId, path: [...path, connId] });
      }
    }
  }
  return null; // no path found
}

// Starter resources for new players
const STARTER_RESOURCES = {
  stellite: 500,
  ferronite: 300,
  nexium: 100,
  pyrathium: 50,
  aurelium: 0,
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
  getWarpPath,
};
