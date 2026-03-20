// ============================================================
// GAME DATA DEFINITIONS
// Ships, Star Systems, Resources, Upgrades, Factions, Officers,
// Buildings, Missions, Combat Roles
// ============================================================

// --- RESOURCE TYPES ---
const RESOURCES = {
  FERRONITE: { id: 'ferronite', name: 'Ferronite', color: '#8B8B8B', description: 'Dense metal used for hull plating' },
  NEXIUM: { id: 'nexium', name: 'Nexium', color: '#9B59B6', description: 'Rare crystal that powers warp drive systems' },
  STELLITE: { id: 'stellite', name: 'Stellite', color: '#E67E22', description: 'Star-forged alloy for ship construction' },
  AURELIUM: { id: 'aurelium', name: 'Aurelium', color: '#F1C40F', description: 'Precious material for advanced upgrades' },
  PYRATHIUM: { id: 'pyrathium', name: 'Pyrathium', color: '#E74C3C', description: 'Volatile energy fuel for weapons systems' },
};

// --- COMBAT ROLE ADVANTAGE (Rock-Paper-Scissors) ---
// Explorer beats Interceptor, Interceptor beats Battleship, Battleship beats Explorer
const COMBAT_ADVANTAGE = {
  explorer: 'interceptor',
  interceptor: 'battleship',
  battleship: 'explorer',
};
const ADVANTAGE_MULTIPLIER = 1.5;
const DISADVANTAGE_MULTIPLIER = 0.7;

// --- SHIP CLASSES ---
const SHIP_CLASSES = {
  // Explorer class (beats Interceptors)
  scout: {
    id: 'scout',
    name: 'Scout',
    class: 'exploration',
    combatRole: 'explorer',
    description: 'Long-range scout with extended warp capability',
    baseStats: {
      hull: 50, armor: 10, shields: 30,
      laserDamage: 8, torpedoDamage: 0, fireRate: 1.0,
      speed: 150, warpRange: 6, cargo: 30,
    },
    cost: { stellite: 150, nexium: 50 },
    icon: '\u25BA', color: '#1ABC9C',
  },
  frigate: {
    id: 'frigate',
    name: 'Frigate',
    class: 'combat',
    combatRole: 'explorer',
    description: 'Balanced warship, strong against fast targets',
    baseStats: {
      hull: 200, armor: 60, shields: 100,
      laserDamage: 20, torpedoDamage: 30, fireRate: 1.0,
      speed: 80, warpRange: 3, cargo: 100,
    },
    cost: { stellite: 500, ferronite: 300, nexium: 100 },
    icon: '\u25C6', color: '#2980B9',
  },

  // Interceptor class (beats Battleships)
  interceptor: {
    id: 'interceptor',
    name: 'Interceptor',
    class: 'combat',
    combatRole: 'interceptor',
    description: 'Fast light fighter, deadly against heavy ships',
    baseStats: {
      hull: 100, armor: 30, shields: 50,
      laserDamage: 15, torpedoDamage: 0, fireRate: 1.5,
      speed: 120, warpRange: 2, cargo: 50,
    },
    cost: { stellite: 200, ferronite: 100 },
    icon: '\u25B2', color: '#3498DB',
  },
  cruiser: {
    id: 'cruiser',
    name: 'Cruiser',
    class: 'combat',
    combatRole: 'interceptor',
    description: 'Heavy cruiser, fast enough to outmaneuver capitals',
    baseStats: {
      hull: 400, armor: 120, shields: 200,
      laserDamage: 35, torpedoDamage: 50, fireRate: 0.8,
      speed: 60, warpRange: 4, cargo: 200,
    },
    cost: { stellite: 1200, ferronite: 800, nexium: 400, pyrathium: 100 },
    icon: '\u2B1F', color: '#1A5276',
  },

  // Battleship class (beats Explorers)
  battleship: {
    id: 'battleship',
    name: 'Battleship',
    class: 'combat',
    combatRole: 'battleship',
    description: 'Massive capital ship, crushes lighter vessels',
    baseStats: {
      hull: 800, armor: 250, shields: 400,
      laserDamage: 60, torpedoDamage: 100, fireRate: 0.5,
      speed: 40, warpRange: 5, cargo: 400,
    },
    cost: { stellite: 3000, ferronite: 2000, nexium: 1000, pyrathium: 500, aurelium: 100 },
    icon: '\u2B22', color: '#0B3D91',
  },

  // Mining Ships (no combat role)
  mining_shuttle: {
    id: 'mining_shuttle',
    name: 'Mining Shuttle',
    class: 'mining',
    combatRole: null,
    description: 'Small mining vessel, cheap and efficient',
    baseStats: {
      hull: 60, armor: 10, shields: 20,
      laserDamage: 5, torpedoDamage: 0, fireRate: 0.5,
      speed: 70, warpRange: 2, cargo: 200, miningRate: 10,
    },
    cost: { stellite: 100 },
    icon: '\u229E', color: '#27AE60',
  },
  mining_freighter: {
    id: 'mining_freighter',
    name: 'Mining Freighter',
    class: 'mining',
    combatRole: null,
    description: 'Large mining vessel with massive cargo hold',
    baseStats: {
      hull: 150, armor: 30, shields: 40,
      laserDamage: 8, torpedoDamage: 0, fireRate: 0.3,
      speed: 45, warpRange: 3, cargo: 800, miningRate: 25,
    },
    cost: { stellite: 400, ferronite: 200, nexium: 50 },
    icon: '\u229F', color: '#229954',
  },

  // --- FACTION SHIPS ---
  // Solari Dominion (military)
  solari_warfrigate: {
    id: 'solari_warfrigate',
    name: 'Solari Warfrigate',
    class: 'combat',
    combatRole: 'battleship',
    faction: 'solari',
    factionRepRequired: 5000,
    description: 'Solari heavy frigate with devastating firepower',
    baseStats: {
      hull: 350, armor: 100, shields: 180,
      laserDamage: 40, torpedoDamage: 55, fireRate: 0.9,
      speed: 65, warpRange: 4, cargo: 150,
    },
    cost: { stellite: 1500, ferronite: 1000, pyrathium: 400 },
    icon: '\u2B22', color: '#E74C3C',
  },
  // Nexari Collective (science)
  nexari_phaseship: {
    id: 'nexari_phaseship',
    name: 'Nexari Phaseship',
    class: 'combat',
    combatRole: 'explorer',
    faction: 'nexari',
    factionRepRequired: 5000,
    description: 'Nexari vessel with advanced shield technology',
    baseStats: {
      hull: 250, armor: 50, shields: 350,
      laserDamage: 25, torpedoDamage: 35, fireRate: 1.1,
      speed: 90, warpRange: 5, cargo: 120,
    },
    cost: { stellite: 1000, nexium: 800, aurelium: 50 },
    icon: '\u25C6', color: '#9B59B6',
  },
  // Aurani Syndicate (trade)
  aurani_hauler: {
    id: 'aurani_hauler',
    name: 'Aurani Hauler',
    class: 'mining',
    combatRole: null,
    faction: 'aurani',
    factionRepRequired: 3000,
    description: 'Aurani heavy miner with enormous cargo capacity',
    baseStats: {
      hull: 200, armor: 40, shields: 60,
      laserDamage: 10, torpedoDamage: 0, fireRate: 0.4,
      speed: 50, warpRange: 4, cargo: 1500, miningRate: 40,
    },
    cost: { stellite: 800, ferronite: 400, nexium: 200 },
    icon: '\u229E', color: '#F1C40F',
  },
};

// --- UPGRADE TIERS ---
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

// --- FACTIONS ---
const FACTIONS = {
  solari: {
    id: 'solari',
    name: 'Solari Dominion',
    color: '#E74C3C',
    description: 'Military supremacy through firepower',
    bonus: { weaponDamage: 0.03 }, // per rep tier
    repTiers: [
      { name: 'Hostile', minRep: -10000, tier: 0 },
      { name: 'Unfriendly', minRep: -1000, tier: 1 },
      { name: 'Neutral', minRep: 0, tier: 2 },
      { name: 'Friendly', minRep: 1000, tier: 3 },
      { name: 'Honored', minRep: 5000, tier: 4 },
      { name: 'Allied', minRep: 15000, tier: 5 },
      { name: 'Exalted', minRep: 30000, tier: 6 },
    ],
  },
  nexari: {
    id: 'nexari',
    name: 'Nexari Collective',
    color: '#9B59B6',
    description: 'Scientific advancement through technology',
    bonus: { shieldStrength: 0.03 },
    repTiers: [
      { name: 'Hostile', minRep: -10000, tier: 0 },
      { name: 'Unfriendly', minRep: -1000, tier: 1 },
      { name: 'Neutral', minRep: 0, tier: 2 },
      { name: 'Friendly', minRep: 1000, tier: 3 },
      { name: 'Honored', minRep: 5000, tier: 4 },
      { name: 'Allied', minRep: 15000, tier: 5 },
      { name: 'Exalted', minRep: 30000, tier: 6 },
    ],
  },
  aurani: {
    id: 'aurani',
    name: 'Aurani Trade Syndicate',
    color: '#F1C40F',
    description: 'Economic dominance through trade and resources',
    bonus: { miningRate: 0.05 },
    repTiers: [
      { name: 'Hostile', minRep: -10000, tier: 0 },
      { name: 'Unfriendly', minRep: -1000, tier: 1 },
      { name: 'Neutral', minRep: 0, tier: 2 },
      { name: 'Friendly', minRep: 1000, tier: 3 },
      { name: 'Honored', minRep: 5000, tier: 4 },
      { name: 'Allied', minRep: 15000, tier: 5 },
      { name: 'Exalted', minRep: 30000, tier: 6 },
    ],
  },
};

// --- BUILDING TYPES ---
const BUILDING_TYPES = {
  refinery: {
    id: 'refinery', name: 'Refinery',
    description: 'Boosts mining rate for your ships',
    maxLevel: 10,
    levels: [
      { level: 1, effect: { miningBonus: 0.10 }, cost: { stellite: 200, ferronite: 100 }, buildTime: 30000 },
      { level: 2, effect: { miningBonus: 0.20 }, cost: { stellite: 500, ferronite: 250 }, buildTime: 60000 },
      { level: 3, effect: { miningBonus: 0.30 }, cost: { stellite: 1000, ferronite: 500 }, buildTime: 120000 },
      { level: 4, effect: { miningBonus: 0.40 }, cost: { stellite: 2000, ferronite: 1000 }, buildTime: 180000 },
      { level: 5, effect: { miningBonus: 0.55 }, cost: { stellite: 4000, ferronite: 2000, nexium: 200 }, buildTime: 300000 },
      { level: 6, effect: { miningBonus: 0.70 }, cost: { stellite: 8000, ferronite: 4000, nexium: 500 }, buildTime: 420000 },
      { level: 7, effect: { miningBonus: 0.85 }, cost: { stellite: 15000, ferronite: 8000, nexium: 1000 }, buildTime: 600000 },
      { level: 8, effect: { miningBonus: 1.00 }, cost: { stellite: 25000, ferronite: 15000, nexium: 2000 }, buildTime: 900000 },
      { level: 9, effect: { miningBonus: 1.20 }, cost: { stellite: 40000, ferronite: 25000, nexium: 4000, aurelium: 100 }, buildTime: 1200000 },
      { level: 10, effect: { miningBonus: 1.50 }, cost: { stellite: 60000, ferronite: 40000, nexium: 8000, aurelium: 300 }, buildTime: 1800000 },
    ],
  },
  research_center: {
    id: 'research_center', name: 'Research Center',
    description: 'Reduces upgrade costs',
    maxLevel: 10,
    levels: [
      { level: 1, effect: { upgradeCostReduction: 0.05 }, cost: { nexium: 200, stellite: 100 }, buildTime: 45000 },
      { level: 2, effect: { upgradeCostReduction: 0.10 }, cost: { nexium: 500, stellite: 250 }, buildTime: 90000 },
      { level: 3, effect: { upgradeCostReduction: 0.15 }, cost: { nexium: 1000, stellite: 500 }, buildTime: 150000 },
      { level: 4, effect: { upgradeCostReduction: 0.20 }, cost: { nexium: 2000, stellite: 1000 }, buildTime: 240000 },
      { level: 5, effect: { upgradeCostReduction: 0.25 }, cost: { nexium: 4000, stellite: 2000, pyrathium: 200 }, buildTime: 360000 },
      { level: 6, effect: { upgradeCostReduction: 0.30 }, cost: { nexium: 8000, stellite: 4000, pyrathium: 500 }, buildTime: 480000 },
      { level: 7, effect: { upgradeCostReduction: 0.35 }, cost: { nexium: 15000, stellite: 8000, pyrathium: 1000 }, buildTime: 660000 },
      { level: 8, effect: { upgradeCostReduction: 0.40 }, cost: { nexium: 25000, stellite: 15000, pyrathium: 2000, aurelium: 50 }, buildTime: 900000 },
      { level: 9, effect: { upgradeCostReduction: 0.45 }, cost: { nexium: 40000, stellite: 25000, pyrathium: 4000, aurelium: 150 }, buildTime: 1200000 },
      { level: 10, effect: { upgradeCostReduction: 0.50 }, cost: { nexium: 60000, stellite: 40000, pyrathium: 8000, aurelium: 400 }, buildTime: 1800000 },
    ],
  },
  shipyard: {
    id: 'shipyard', name: 'Shipyard',
    description: 'Unlocks higher-tier ships and adds build slots',
    maxLevel: 10,
    levels: [
      { level: 1, effect: { maxShipTier: 2, buildSlots: 1 }, cost: { stellite: 300, ferronite: 200 }, buildTime: 45000 },
      { level: 2, effect: { maxShipTier: 3, buildSlots: 1 }, cost: { stellite: 600, ferronite: 400 }, buildTime: 90000 },
      { level: 3, effect: { maxShipTier: 4, buildSlots: 2 }, cost: { stellite: 1200, ferronite: 800, nexium: 100 }, buildTime: 150000 },
      { level: 4, effect: { maxShipTier: 5, buildSlots: 2 }, cost: { stellite: 2500, ferronite: 1500, nexium: 300 }, buildTime: 240000 },
      { level: 5, effect: { maxShipTier: 6, buildSlots: 3 }, cost: { stellite: 5000, ferronite: 3000, nexium: 600 }, buildTime: 360000 },
      { level: 6, effect: { maxShipTier: 7, buildSlots: 3 }, cost: { stellite: 10000, ferronite: 6000, nexium: 1200, pyrathium: 200 }, buildTime: 480000 },
      { level: 7, effect: { maxShipTier: 8, buildSlots: 4 }, cost: { stellite: 20000, ferronite: 12000, nexium: 2500, pyrathium: 500 }, buildTime: 660000 },
      { level: 8, effect: { maxShipTier: 9, buildSlots: 4 }, cost: { stellite: 35000, ferronite: 20000, nexium: 5000, pyrathium: 1000 }, buildTime: 900000 },
      { level: 9, effect: { maxShipTier: 10, buildSlots: 5 }, cost: { stellite: 50000, ferronite: 30000, nexium: 8000, pyrathium: 2000, aurelium: 100 }, buildTime: 1200000 },
      { level: 10, effect: { maxShipTier: 10, buildSlots: 6 }, cost: { stellite: 80000, ferronite: 50000, nexium: 15000, pyrathium: 4000, aurelium: 300 }, buildTime: 1800000 },
    ],
  },
  shield_generator: {
    id: 'shield_generator', name: 'Shield Generator',
    description: 'Protects your starbase from attacks',
    maxLevel: 10,
    levels: [
      { level: 1, effect: { baseShields: 500 }, cost: { nexium: 300, pyrathium: 100 }, buildTime: 60000 },
      { level: 2, effect: { baseShields: 1200 }, cost: { nexium: 600, pyrathium: 250 }, buildTime: 120000 },
      { level: 3, effect: { baseShields: 2500 }, cost: { nexium: 1200, pyrathium: 500 }, buildTime: 180000 },
      { level: 4, effect: { baseShields: 5000 }, cost: { nexium: 2500, pyrathium: 1000 }, buildTime: 300000 },
      { level: 5, effect: { baseShields: 10000 }, cost: { nexium: 5000, pyrathium: 2000, aurelium: 30 }, buildTime: 420000 },
      { level: 6, effect: { baseShields: 18000 }, cost: { nexium: 10000, pyrathium: 4000, aurelium: 80 }, buildTime: 600000 },
      { level: 7, effect: { baseShields: 30000 }, cost: { nexium: 18000, pyrathium: 8000, aurelium: 150 }, buildTime: 900000 },
      { level: 8, effect: { baseShields: 50000 }, cost: { nexium: 30000, pyrathium: 15000, aurelium: 300 }, buildTime: 1200000 },
      { level: 9, effect: { baseShields: 80000 }, cost: { nexium: 50000, pyrathium: 25000, aurelium: 600 }, buildTime: 1500000 },
      { level: 10, effect: { baseShields: 120000 }, cost: { nexium: 80000, pyrathium: 40000, aurelium: 1000 }, buildTime: 1800000 },
    ],
  },
  warehouse: {
    id: 'warehouse', name: 'Warehouse',
    description: 'Increases protected resource storage',
    maxLevel: 10,
    levels: [
      { level: 1, effect: { protectedStorage: 1000 }, cost: { stellite: 150, ferronite: 100 }, buildTime: 30000 },
      { level: 2, effect: { protectedStorage: 2500 }, cost: { stellite: 400, ferronite: 250 }, buildTime: 60000 },
      { level: 3, effect: { protectedStorage: 5000 }, cost: { stellite: 800, ferronite: 500 }, buildTime: 120000 },
      { level: 4, effect: { protectedStorage: 10000 }, cost: { stellite: 1500, ferronite: 1000 }, buildTime: 180000 },
      { level: 5, effect: { protectedStorage: 20000 }, cost: { stellite: 3000, ferronite: 2000, nexium: 100 }, buildTime: 300000 },
      { level: 6, effect: { protectedStorage: 35000 }, cost: { stellite: 6000, ferronite: 4000, nexium: 300 }, buildTime: 420000 },
      { level: 7, effect: { protectedStorage: 55000 }, cost: { stellite: 12000, ferronite: 8000, nexium: 600 }, buildTime: 600000 },
      { level: 8, effect: { protectedStorage: 80000 }, cost: { stellite: 20000, ferronite: 15000, nexium: 1200 }, buildTime: 900000 },
      { level: 9, effect: { protectedStorage: 120000 }, cost: { stellite: 35000, ferronite: 25000, nexium: 2500, aurelium: 100 }, buildTime: 1200000 },
      { level: 10, effect: { protectedStorage: 200000 }, cost: { stellite: 60000, ferronite: 40000, nexium: 5000, aurelium: 300 }, buildTime: 1800000 },
    ],
  },
  defense_platform: {
    id: 'defense_platform', name: 'Defense Platform',
    description: 'Automated turrets that fire on attackers',
    maxLevel: 10,
    levels: [
      { level: 1, effect: { turretDamage: 10, turretRate: 0.5 }, cost: { pyrathium: 200, ferronite: 150 }, buildTime: 60000 },
      { level: 2, effect: { turretDamage: 20, turretRate: 0.6 }, cost: { pyrathium: 500, ferronite: 300 }, buildTime: 120000 },
      { level: 3, effect: { turretDamage: 35, turretRate: 0.7 }, cost: { pyrathium: 1000, ferronite: 600 }, buildTime: 180000 },
      { level: 4, effect: { turretDamage: 55, turretRate: 0.8 }, cost: { pyrathium: 2000, ferronite: 1200 }, buildTime: 300000 },
      { level: 5, effect: { turretDamage: 80, turretRate: 0.9 }, cost: { pyrathium: 4000, ferronite: 2500, nexium: 200 }, buildTime: 420000 },
      { level: 6, effect: { turretDamage: 120, turretRate: 1.0 }, cost: { pyrathium: 8000, ferronite: 5000, nexium: 500 }, buildTime: 600000 },
      { level: 7, effect: { turretDamage: 170, turretRate: 1.1 }, cost: { pyrathium: 15000, ferronite: 10000, nexium: 1000 }, buildTime: 900000 },
      { level: 8, effect: { turretDamage: 230, turretRate: 1.2 }, cost: { pyrathium: 25000, ferronite: 15000, nexium: 2000, aurelium: 50 }, buildTime: 1200000 },
      { level: 9, effect: { turretDamage: 300, turretRate: 1.3 }, cost: { pyrathium: 40000, ferronite: 25000, nexium: 4000, aurelium: 150 }, buildTime: 1500000 },
      { level: 10, effect: { turretDamage: 400, turretRate: 1.5 }, cost: { pyrathium: 60000, ferronite: 40000, nexium: 8000, aurelium: 400 }, buildTime: 1800000 },
    ],
  },
};

// --- OFFICERS ---
const OFFICERS = {
  vex_ironheart: {
    id: 'vex_ironheart', name: 'Vex Ironheart', rarity: 'common', faction: null,
    description: 'Veteran weapons officer',
    passive: { type: 'weaponDamage', value: 0.08 },
    active: { name: 'Overdrive', description: 'Double fire rate for 10s', effect: { type: 'fireRateMultiplier', value: 2.0, duration: 10000 }, cooldown: 60000 },
    recruitCost: { stellite: 500, pyrathium: 200 },
  },
  lyra_voss: {
    id: 'lyra_voss', name: 'Lyra Voss', rarity: 'common', faction: null,
    description: 'Experienced navigator',
    passive: { type: 'speed', value: 0.10 },
    active: { name: 'Evasive Maneuvers', description: 'Dodge 50% of attacks for 8s', effect: { type: 'evasion', value: 0.5, duration: 8000 }, cooldown: 45000 },
    recruitCost: { stellite: 400, nexium: 150 },
  },
  kira_stormwind: {
    id: 'kira_stormwind', name: 'Kira Stormwind', rarity: 'uncommon', faction: 'solari',
    description: 'Solari defensive specialist',
    passive: { type: 'armor', value: 0.12 },
    active: { name: 'Emergency Shields', description: 'Restore 50% shields', effect: { type: 'shieldRestore', value: 0.5 }, cooldown: 90000 },
    recruitCost: { stellite: 800, ferronite: 500, pyrathium: 200 },
  },
  oren_flux: {
    id: 'oren_flux', name: 'Oren Flux', rarity: 'rare', faction: 'nexari',
    description: 'Nexari warp theorist',
    passive: { type: 'warpRange', value: 0.20 },
    active: { name: 'Quantum Shift', description: 'Instantly complete current warp', effect: { type: 'instantWarp' }, cooldown: 120000 },
    recruitCost: { nexium: 1000, stellite: 600, aurelium: 20 },
  },
  zara_deepvein: {
    id: 'zara_deepvein', name: 'Zara Deepvein', rarity: 'uncommon', faction: 'aurani',
    description: 'Aurani master miner',
    passive: { type: 'miningRate', value: 0.15 },
    active: { name: 'Rich Vein', description: 'Triple mining for 15s', effect: { type: 'miningMultiplier', value: 3.0, duration: 15000 }, cooldown: 90000 },
    recruitCost: { stellite: 600, ferronite: 300, nexium: 100 },
  },
  rax_voidborn: {
    id: 'rax_voidborn', name: 'Rax Voidborn', rarity: 'rare', faction: 'solari',
    description: 'Solari torpedo specialist',
    passive: { type: 'torpedoDamage', value: 0.15 },
    active: { name: 'Torpedo Barrage', description: 'Fire 3x torpedoes for 8s', effect: { type: 'torpedoMultiplier', value: 3.0, duration: 8000 }, cooldown: 75000 },
    recruitCost: { pyrathium: 800, ferronite: 500, aurelium: 15 },
  },
  nova_seren: {
    id: 'nova_seren', name: 'Nova Seren', rarity: 'epic', faction: 'nexari',
    description: 'Nexari shield prodigy',
    passive: { type: 'shieldStrength', value: 0.20 },
    active: { name: 'Phase Shield', description: 'Immune for 5s', effect: { type: 'invulnerable', duration: 5000 }, cooldown: 180000 },
    recruitCost: { nexium: 2000, stellite: 1000, aurelium: 50 },
  },
  drake_ashford: {
    id: 'drake_ashford', name: 'Drake Ashford', rarity: 'uncommon', faction: null,
    description: 'Fleet combat instructor',
    passive: { type: 'fireRate', value: 0.10 },
    active: { name: 'Focus Fire', description: '+50% damage for 10s', effect: { type: 'damageMultiplier', value: 1.5, duration: 10000 }, cooldown: 60000 },
    recruitCost: { stellite: 700, pyrathium: 300, ferronite: 200 },
  },
  talia_crestfall: {
    id: 'talia_crestfall', name: 'Talia Crestfall', rarity: 'epic', faction: 'aurani',
    description: 'Aurani trade baron',
    passive: { type: 'cargoCapacity', value: 0.25 },
    active: { name: 'Yield Boost', description: '5x mining for 10s', effect: { type: 'miningMultiplier', value: 5.0, duration: 10000 }, cooldown: 120000 },
    recruitCost: { stellite: 1500, ferronite: 800, aurelium: 40 },
  },
  zek_ironclad: {
    id: 'zek_ironclad', name: 'Zek Ironclad', rarity: 'legendary', faction: null,
    description: 'Legendary fleet commander',
    passive: { type: 'allStats', value: 0.10 },
    active: { name: 'Last Stand', description: 'Full repair + 2x damage for 15s', effect: { type: 'lastStand', duration: 15000 }, cooldown: 300000 },
    recruitCost: { stellite: 5000, ferronite: 3000, nexium: 2000, pyrathium: 1000, aurelium: 200 },
  },
};

const OFFICER_RARITIES = {
  common: { color: '#bdc3c7', label: 'Common' },
  uncommon: { color: '#2ecc71', label: 'Uncommon' },
  rare: { color: '#3498db', label: 'Rare' },
  epic: { color: '#9b59b6', label: 'Epic' },
  legendary: { color: '#f1c40f', label: 'Legendary' },
};

// --- MISSIONS ---
const MISSIONS = {
  // Daily missions
  daily_mine_100: {
    id: 'daily_mine_100', type: 'daily', name: 'Resource Collector',
    description: 'Mine 100 units of any resource',
    objective: { type: 'mine', amount: 100 },
    rewards: { stellite: 200, ferronite: 100, xp: 20 },
  },
  daily_kill_3: {
    id: 'daily_kill_3', type: 'daily', name: 'Hostile Patrol',
    description: 'Destroy 3 hostile ships',
    objective: { type: 'kill_npc', amount: 3 },
    rewards: { pyrathium: 150, nexium: 50, xp: 30 },
  },
  daily_warp_3: {
    id: 'daily_warp_3', type: 'daily', name: 'Star Mapper',
    description: 'Warp to 3 different systems',
    objective: { type: 'warp', amount: 3 },
    rewards: { nexium: 100, xp: 15 },
  },
  daily_dock_2: {
    id: 'daily_dock_2', type: 'daily', name: 'Supply Run',
    description: 'Dock 2 ships at your starbase',
    objective: { type: 'dock', amount: 2 },
    rewards: { stellite: 150, ferronite: 100, xp: 10 },
  },

  // Story missions (chain)
  story_first_kill: {
    id: 'story_first_kill', type: 'story', name: 'First Blood',
    description: 'Destroy your first hostile ship',
    objective: { type: 'kill_npc', amount: 1 },
    rewards: { stellite: 500, ferronite: 300, xp: 50 },
    next: 'story_mine_resources',
  },
  story_mine_resources: {
    id: 'story_mine_resources', type: 'story', name: 'Gathering Supplies',
    description: 'Mine 200 units of resources',
    objective: { type: 'mine', amount: 200 },
    rewards: { nexium: 200, pyrathium: 100, xp: 75 },
    next: 'story_explore',
  },
  story_explore: {
    id: 'story_explore', type: 'story', name: 'Into the Unknown',
    description: 'Warp to 5 different systems',
    objective: { type: 'warp', amount: 5 },
    rewards: { nexium: 300, aurelium: 10, xp: 100 },
    next: 'story_build_fleet',
  },
  story_build_fleet: {
    id: 'story_build_fleet', type: 'story', name: 'Fleet Expansion',
    description: 'Build 3 ships total',
    objective: { type: 'build_ship', amount: 3 },
    rewards: { stellite: 1000, ferronite: 600, nexium: 200, xp: 150 },
    next: 'story_kill_10',
  },
  story_kill_10: {
    id: 'story_kill_10', type: 'story', name: 'Battle Hardened',
    description: 'Destroy 10 hostile ships',
    objective: { type: 'kill_npc', amount: 10 },
    rewards: { pyrathium: 500, aurelium: 25, xp: 200 },
  },

  // Faction missions
  faction_solari_patrol: {
    id: 'faction_solari_patrol', type: 'faction', faction: 'solari', name: 'Dominion Patrol',
    description: 'Destroy 5 hostiles in dangerous space',
    objective: { type: 'kill_npc_pvp', amount: 5 },
    rewards: { pyrathium: 300, factionRep: { solari: 200, nexari: -50 } },
  },
  faction_nexari_research: {
    id: 'faction_nexari_research', type: 'faction', faction: 'nexari', name: 'Research Expedition',
    description: 'Mine 500 Nexium',
    objective: { type: 'mine_resource', resource: 'nexium', amount: 500 },
    rewards: { nexium: 400, factionRep: { nexari: 200, aurani: -50 } },
  },
  faction_aurani_trade: {
    id: 'faction_aurani_trade', type: 'faction', faction: 'aurani', name: 'Trade Route',
    description: 'Dock ships 5 times',
    objective: { type: 'dock', amount: 5 },
    rewards: { stellite: 500, factionRep: { aurani: 200, solari: -50 } },
  },
};

// --- STAR SYSTEMS ---
const STAR_SYSTEMS = [
  // Safe Zone (PVE) - Starting area
  {
    id: 'sol', name: 'Sol', x: 400, y: 400,
    type: 'safe', level: 1, color: '#F1C40F', faction: null,
    planets: [
      { name: 'Earth', type: 'homeworld', resources: null },
      { name: 'Mars', type: 'mining', resource: 'stellite', richness: 1.0 },
      { name: 'Luna', type: 'mining', resource: 'ferronite', richness: 0.8 },
    ],
    connections: ['alpha_centauri', 'sirius'],
  },
  {
    id: 'alpha_centauri', name: 'Alpha Centauri', x: 300, y: 300,
    type: 'safe', level: 1, color: '#F39C12', faction: null,
    planets: [
      { name: 'Centauri Prime', type: 'homeworld', resources: null },
      { name: 'Centauri II', type: 'mining', resource: 'ferronite', richness: 1.0 },
      { name: 'Centauri III', type: 'mining', resource: 'stellite', richness: 0.8 },
    ],
    connections: ['sol', 'vega', 'wolf_359'],
  },
  {
    id: 'sirius', name: 'Sirius', x: 500, y: 300,
    type: 'safe', level: 1, color: '#85C1E9', faction: null,
    planets: [
      { name: 'Sirius Prime', type: 'homeworld', resources: null },
      { name: 'Sirius II', type: 'mining', resource: 'stellite', richness: 1.2 },
    ],
    connections: ['sol', 'rigel', 'procyon'],
  },
  {
    id: 'vega', name: 'Vega', x: 200, y: 200,
    type: 'safe', level: 2, color: '#AED6F1', faction: 'nexari',
    planets: [
      { name: 'Vega Prime', type: 'station', resources: null },
      { name: 'Vega II', type: 'mining', resource: 'nexium', richness: 0.6 },
      { name: 'Vega III', type: 'mining', resource: 'ferronite', richness: 1.2 },
    ],
    connections: ['alpha_centauri', 'deneb'],
  },
  {
    id: 'procyon', name: 'Procyon', x: 600, y: 200,
    type: 'safe', level: 2, color: '#F9E79F', faction: 'aurani',
    planets: [
      { name: 'Procyon Prime', type: 'station', resources: null },
      { name: 'Procyon II', type: 'mining', resource: 'nexium', richness: 0.8 },
      { name: 'Procyon III', type: 'mining', resource: 'stellite', richness: 1.0 },
    ],
    connections: ['sirius', 'betelgeuse'],
  },
  // Transition Zone
  {
    id: 'wolf_359', name: 'Wolf 359', x: 200, y: 400,
    type: 'safe', level: 3, color: '#E74C3C', faction: 'solari',
    planets: [
      { name: 'Wolf Prime', type: 'mining', resource: 'pyrathium', richness: 0.8 },
      { name: 'Wolf II', type: 'mining', resource: 'ferronite', richness: 1.5 },
    ],
    connections: ['alpha_centauri', 'deneb', 'neutral_zone_alpha'],
  },
  {
    id: 'rigel', name: 'Rigel', x: 600, y: 400,
    type: 'safe', level: 3, color: '#3498DB', faction: 'nexari',
    planets: [
      { name: 'Rigel Prime', type: 'mining', resource: 'pyrathium', richness: 1.0 },
      { name: 'Rigel VII', type: 'mining', resource: 'nexium', richness: 1.0 },
    ],
    connections: ['sirius', 'betelgeuse', 'neutral_zone_beta'],
  },
  // Neutral Zone
  {
    id: 'deneb', name: 'Deneb', x: 150, y: 100,
    type: 'safe', level: 4, color: '#2ECC71', faction: 'aurani',
    planets: [
      { name: 'Deneb Prime', type: 'mining', resource: 'nexium', richness: 1.5 },
      { name: 'Deneb IV', type: 'mining', resource: 'pyrathium', richness: 1.2 },
    ],
    connections: ['vega', 'wolf_359', 'dark_nebula'],
  },
  {
    id: 'betelgeuse', name: 'Betelgeuse', x: 650, y: 100,
    type: 'safe', level: 4, color: '#E74C3C', faction: 'solari',
    planets: [
      { name: 'Betelgeuse Prime', type: 'mining', resource: 'nexium', richness: 1.3 },
      { name: 'Betelgeuse III', type: 'mining', resource: 'pyrathium', richness: 1.5 },
    ],
    connections: ['procyon', 'rigel', 'omega_expanse'],
  },
  // Dangerous Zone (PVP)
  {
    id: 'neutral_zone_alpha', name: 'Neutral Zone Alpha', x: 100, y: 500,
    type: 'dangerous', level: 5, color: '#C0392B', faction: 'solari',
    planets: [
      { name: 'NZ-Alpha I', type: 'mining', resource: 'aurelium', richness: 0.5 },
      { name: 'NZ-Alpha II', type: 'mining', resource: 'pyrathium', richness: 2.0 },
      { name: 'NZ-Alpha III', type: 'mining', resource: 'nexium', richness: 2.0 },
    ],
    connections: ['wolf_359', 'dark_nebula', 'kepler'],
  },
  {
    id: 'neutral_zone_beta', name: 'Neutral Zone Beta', x: 700, y: 500,
    type: 'dangerous', level: 5, color: '#C0392B', faction: 'aurani',
    planets: [
      { name: 'NZ-Beta I', type: 'mining', resource: 'aurelium', richness: 0.5 },
      { name: 'NZ-Beta II', type: 'mining', resource: 'pyrathium', richness: 2.0 },
      { name: 'NZ-Beta III', type: 'mining', resource: 'ferronite', richness: 3.0 },
    ],
    connections: ['rigel', 'omega_expanse', 'andromeda_gate'],
  },
  {
    id: 'dark_nebula', name: 'Dark Nebula', x: 100, y: 100,
    type: 'dangerous', level: 6, color: '#8E44AD', faction: 'nexari',
    planets: [
      { name: 'Nebula Station', type: 'mining', resource: 'aurelium', richness: 1.0 },
      { name: 'Nebula Core', type: 'mining', resource: 'pyrathium', richness: 3.0 },
    ],
    connections: ['deneb', 'neutral_zone_alpha', 'singularity'],
  },
  {
    id: 'omega_expanse', name: 'Omega Expanse', x: 700, y: 100,
    type: 'dangerous', level: 6, color: '#8E44AD', faction: 'solari',
    planets: [
      { name: 'Omega Station', type: 'mining', resource: 'aurelium', richness: 1.0 },
      { name: 'Omega Prime', type: 'mining', resource: 'nexium', richness: 3.0 },
    ],
    connections: ['betelgeuse', 'neutral_zone_beta', 'singularity'],
  },
  // Deep Space
  {
    id: 'kepler', name: 'Kepler', x: 250, y: 600,
    type: 'dangerous', level: 7, color: '#D35400', faction: null,
    planets: [
      { name: 'Kepler-442b', type: 'mining', resource: 'aurelium', richness: 1.5 },
      { name: 'Kepler-186f', type: 'mining', resource: 'pyrathium', richness: 2.5 },
      { name: 'Kepler-22b', type: 'mining', resource: 'nexium', richness: 2.5 },
    ],
    connections: ['neutral_zone_alpha', 'andromeda_gate'],
  },
  {
    id: 'andromeda_gate', name: 'Andromeda Gate', x: 550, y: 600,
    type: 'dangerous', level: 7, color: '#D35400', faction: null,
    planets: [
      { name: 'Gateway Station', type: 'mining', resource: 'aurelium', richness: 1.5 },
      { name: 'Andromeda I', type: 'mining', resource: 'ferronite', richness: 4.0 },
      { name: 'Andromeda II', type: 'mining', resource: 'stellite', richness: 4.0 },
    ],
    connections: ['neutral_zone_beta', 'kepler', 'singularity'],
  },
  {
    id: 'singularity', name: 'The Singularity', x: 400, y: 50,
    type: 'dangerous', level: 10, color: '#17202A', faction: null,
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
  return null;
}

// Starter resources for new players
const STARTER_RESOURCES = {
  stellite: 500,
  ferronite: 300,
  nexium: 100,
  pyrathium: 50,
  aurelium: 0,
};

const STARTER_SHIPS = ['interceptor', 'mining_shuttle'];

// --- NPC SHIP DEFINITIONS ---
const NPC_SHIPS = {
  raider: {
    id: 'raider', name: 'Raider', icon: '\u25BD', color: '#e74c3c',
    combatRole: 'interceptor',
    baseStats: { hull: 60, armor: 15, shields: 25, laserDamage: 8, torpedoDamage: 0, fireRate: 1.2, speed: 90 },
    drops: { stellite: 30, ferronite: 20 },
    xpReward: 5,
  },
  marauder: {
    id: 'marauder', name: 'Marauder', icon: '\u25C7', color: '#c0392b',
    combatRole: 'interceptor',
    baseStats: { hull: 120, armor: 40, shields: 50, laserDamage: 15, torpedoDamage: 10, fireRate: 1.0, speed: 70 },
    drops: { stellite: 60, ferronite: 40, nexium: 15 },
    xpReward: 12,
  },
  destroyer: {
    id: 'destroyer', name: 'Destroyer', icon: '\u2B26', color: '#922b21',
    combatRole: 'explorer',
    baseStats: { hull: 250, armor: 80, shields: 100, laserDamage: 25, torpedoDamage: 30, fireRate: 0.8, speed: 55 },
    drops: { stellite: 120, ferronite: 80, nexium: 40, pyrathium: 20 },
    xpReward: 25,
  },
  dreadnought: {
    id: 'dreadnought', name: 'Dreadnought', icon: '\u2B21', color: '#7b241c',
    combatRole: 'battleship',
    baseStats: { hull: 500, armor: 180, shields: 220, laserDamage: 45, torpedoDamage: 60, fireRate: 0.6, speed: 40 },
    drops: { stellite: 250, ferronite: 150, nexium: 80, pyrathium: 50, aurelium: 10 },
    xpReward: 50,
  },
  warlord: {
    id: 'warlord', name: 'Warlord', icon: '\u2B20', color: '#641e16',
    combatRole: 'battleship',
    baseStats: { hull: 900, armor: 350, shields: 450, laserDamage: 80, torpedoDamage: 120, fireRate: 0.5, speed: 30 },
    drops: { stellite: 500, ferronite: 350, nexium: 200, pyrathium: 120, aurelium: 40 },
    xpReward: 100,
  },
};

const NPC_SPAWN_TABLE = {
  1:  { types: [], count: 0 },
  2:  { types: ['raider', 'marauder'], count: 4 },
  3:  { types: ['raider', 'marauder'], count: 5 },
  4:  { types: ['marauder', 'destroyer'], count: 4 },
  5:  { types: ['marauder', 'destroyer'], count: 5 },
  6:  { types: ['destroyer', 'dreadnought'], count: 5 },
  7:  { types: ['destroyer', 'dreadnought', 'warlord'], count: 5 },
  8:  { types: ['dreadnought', 'warlord'], count: 5 },
  9:  { types: ['dreadnought', 'warlord'], count: 6 },
  10: { types: ['warlord'], count: 6 },
};

function getNpcLevelMultiplier(systemLevel) {
  return 1.0 + (systemLevel - 1) * 0.45;
}

// Helper: get faction rep tier for a player's rep amount
function getFactionTier(factionId, repAmount) {
  const faction = FACTIONS[factionId];
  if (!faction) return { name: 'Unknown', tier: 0 };
  let best = faction.repTiers[0];
  for (const t of faction.repTiers) {
    if (repAmount >= t.minRep) best = t;
  }
  return best;
}

module.exports = {
  RESOURCES,
  SHIP_CLASSES,
  UPGRADE_TIERS,
  STAR_SYSTEMS,
  STARTER_RESOURCES,
  STARTER_SHIPS,
  NPC_SHIPS,
  NPC_SPAWN_TABLE,
  getNpcLevelMultiplier,
  getWarpDistance,
  getWarpPath,
  COMBAT_ADVANTAGE,
  ADVANTAGE_MULTIPLIER,
  DISADVANTAGE_MULTIPLIER,
  FACTIONS,
  BUILDING_TYPES,
  OFFICERS,
  OFFICER_RARITIES,
  MISSIONS,
  getFactionTier,
};
