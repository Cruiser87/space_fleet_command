// ============================================================
// GAME ENGINE
// Handles all server-side game logic:
//   - Player state, ship management
//   - Movement within systems
//   - Warp travel between systems
//   - Combat resolution
//   - Mining
//   - Upgrades
// ============================================================

const { v4: uuidv4 } = require('uuid');
const {
  SHIP_CLASSES, UPGRADE_TIERS, STAR_SYSTEMS,
  STARTER_RESOURCES, STARTER_SHIPS, RESOURCES, getWarpDistance, getWarpPath,
  NPC_SHIPS, NPC_SPAWN_TABLE, getNpcLevelMultiplier,
} = require('./gameData');

const TICK_RATE = 20;               // server ticks per second
const TICK_MS = 1000 / TICK_RATE;
const COMBAT_RANGE = 60;            // pixels — ships within this range fight
const MINING_RANGE = 80;            // pixels — ships within this range of a planet can mine
const SHIP_COLLISION_RADIUS = 20;
const NPC_RESPAWN_DELAY = 30000;    // 30 seconds before NPCs respawn
const NPC_WANDER_INTERVAL = 3000;   // NPCs pick a new destination every 3s

class GameEngine {
  constructor() {
    this.players = new Map();       // playerId -> Player
    this.ships = new Map();         // shipId -> Ship
    this.systems = new Map();       // systemId -> SystemState
    this.combats = new Map();       // combatId -> Combat
    this.npcShips = new Map();      // shipId -> NPC ship data
    this.tickInterval = null;
    this.npcTickCounter = 0;

    // Initialize system states
    for (const sys of STAR_SYSTEMS) {
      this.systems.set(sys.id, {
        ...sys,
        ships: new Set(),           // shipIds currently in this system
        miningNodes: sys.planets
          .filter(p => p.type === 'mining')
          .map(p => ({
            name: p.name,
            resource: p.resource,
            richness: p.richness,
            x: 200 + Math.random() * 400,
            y: 200 + Math.random() * 400,
          })),
      });
    }
  }

  start() {
    // Spawn initial NPCs in all systems
    for (const sys of STAR_SYSTEMS) {
      this.spawnNpcsInSystem(sys.id);
    }
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  // ----------------------------------------------------------
  // PLAYER MANAGEMENT
  // ----------------------------------------------------------

  createPlayer(socketId, name) {
    const playerId = uuidv4();
    // Pick a home system — cycle through safe systems
    const safeSystems = STAR_SYSTEMS.filter(s => s.type === 'safe' && s.planets.some(p => p.type === 'homeworld'));
    const homeSystem = safeSystems[this.players.size % safeSystems.length];

    const player = {
      id: playerId,
      socketId,
      name: name || `Commander ${this.players.size + 1}`,
      homeSystemId: homeSystem.id,
      resources: { ...STARTER_RESOURCES },
      starbase: {
        systemId: homeSystem.id,
        level: 1,
        storage: { ...STARTER_RESOURCES },
      },
      shipIds: [],
    };

    this.players.set(playerId, player);

    // Create starter ships at home system
    for (const shipClassId of STARTER_SHIPS) {
      this.createShip(playerId, shipClassId, homeSystem.id);
    }

    return player;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Remove all ships
    for (const shipId of [...player.shipIds]) {
      this.removeShip(shipId);
    }

    this.players.delete(playerId);
  }

  getPlayerBySocket(socketId) {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) return player;
    }
    return null;
  }

  // ----------------------------------------------------------
  // SHIP MANAGEMENT
  // ----------------------------------------------------------

  createShip(playerId, shipClassId, systemId) {
    const player = this.players.get(playerId);
    const shipClass = SHIP_CLASSES[shipClassId];
    if (!player || !shipClass) return null;

    const system = this.systems.get(systemId);
    if (!system) return null;

    const shipId = uuidv4();
    const ship = {
      id: shipId,
      playerId,
      classId: shipClassId,
      className: shipClass.name,
      classType: shipClass.class,
      icon: shipClass.icon,
      color: shipClass.color,
      systemId,

      // Position within the system
      x: 350 + (Math.random() - 0.5) * 200,
      y: 350 + (Math.random() - 0.5) * 200,
      targetX: null,
      targetY: null,
      angle: 0,

      // Current stats (computed from base + upgrades)
      upgrades: {
        armor: 1,
        shields: 1,
        lasers: 1,
        torpedoes: 1,
        cargo: 1,
        warp: 1,
      },

      // Live combat stats
      maxHull: shipClass.baseStats.hull,
      hull: shipClass.baseStats.hull,
      maxArmor: shipClass.baseStats.armor,
      armor: shipClass.baseStats.armor,
      maxShields: shipClass.baseStats.shields,
      shields: shipClass.baseStats.shields,
      laserDamage: shipClass.baseStats.laserDamage,
      torpedoDamage: shipClass.baseStats.torpedoDamage,
      fireRate: shipClass.baseStats.fireRate,
      speed: shipClass.baseStats.speed,
      warpRange: shipClass.baseStats.warpRange,
      maxCargo: shipClass.baseStats.cargo,
      cargo: {},  // resource -> amount currently carried
      miningRate: shipClass.baseStats.miningRate || 0,

      // State
      state: 'idle',   // idle, moving, mining, combat, warping, docked
      miningTarget: null,
      combatTarget: null,
      lastFireTime: 0,
      isDestroyed: false,
      isNpc: false,

      // Progression
      xp: 0,
      kills: 0,
      powerBonus: 0,   // percentage bonus from kills (e.g., 0.1 = 10%)
    };

    this.ships.set(shipId, ship);
    system.ships.add(shipId);
    player.shipIds.push(shipId);

    return ship;
  }

  removeShip(shipId) {
    const ship = this.ships.get(shipId);
    if (!ship) return;

    const system = this.systems.get(ship.systemId);
    if (system) system.ships.delete(shipId);

    const player = this.players.get(ship.playerId);
    if (player) {
      player.shipIds = player.shipIds.filter(id => id !== shipId);
    }

    this.ships.delete(shipId);
  }

  recalcShipStats(ship) {
    const base = SHIP_CLASSES[ship.classId].baseStats;
    const u = ship.upgrades;

    const armorMult = UPGRADE_TIERS.armor[u.armor - 1].multiplier;
    const shieldMult = UPGRADE_TIERS.shields[u.shields - 1].multiplier;
    const laserMult = UPGRADE_TIERS.lasers[u.lasers - 1].multiplier;
    const torpMult = UPGRADE_TIERS.torpedoes[u.torpedoes - 1].multiplier;
    const cargoMult = UPGRADE_TIERS.cargo[u.cargo - 1].multiplier;
    const warpMult = UPGRADE_TIERS.warp[u.warp - 1].multiplier;

    ship.maxArmor = Math.floor(base.armor * armorMult);
    ship.maxShields = Math.floor(base.shields * shieldMult);
    ship.laserDamage = Math.floor(base.laserDamage * laserMult);
    ship.torpedoDamage = Math.floor(base.torpedoDamage * torpMult);
    ship.maxCargo = Math.floor(base.cargo * cargoMult);
    ship.warpRange = Math.floor(base.warpRange * warpMult);
    ship.maxHull = base.hull;
    ship.speed = base.speed;
    ship.fireRate = base.fireRate;
    ship.miningRate = base.miningRate || 0;
  }

  // ----------------------------------------------------------
  // UPGRADE SYSTEM
  // ----------------------------------------------------------

  upgradeShip(playerId, shipId, component) {
    const player = this.players.get(playerId);
    const ship = this.ships.get(shipId);
    if (!player || !ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };
    if (ship.state === 'combat') return { success: false, error: 'Cannot upgrade during combat' };

    const tiers = UPGRADE_TIERS[component];
    if (!tiers) return { success: false, error: 'Invalid component' };

    const currentTier = ship.upgrades[component];
    if (currentTier >= 10) return { success: false, error: 'Already max tier' };

    const nextTier = tiers[currentTier]; // currentTier is 1-based, array is 0-based, so tiers[currentTier] = next tier
    const cost = nextTier.cost;

    // Check resources
    for (const [res, amount] of Object.entries(cost)) {
      if ((player.resources[res] || 0) < amount) {
        return { success: false, error: `Not enough ${res}. Need ${amount}, have ${player.resources[res] || 0}` };
      }
    }

    // Deduct resources
    for (const [res, amount] of Object.entries(cost)) {
      player.resources[res] -= amount;
    }

    ship.upgrades[component] = currentTier + 1;
    this.recalcShipStats(ship);

    // Repair to new max on upgrade
    ship.armor = ship.maxArmor;
    ship.shields = ship.maxShields;
    ship.hull = ship.maxHull;

    return { success: true, tier: currentTier + 1 };
  }

  // ----------------------------------------------------------
  // BUILD SHIP
  // ----------------------------------------------------------

  buildShip(playerId, shipClassId) {
    const player = this.players.get(playerId);
    const shipClass = SHIP_CLASSES[shipClassId];
    if (!player || !shipClass) return { success: false, error: 'Invalid ship class' };

    // Check resources
    for (const [res, amount] of Object.entries(shipClass.cost)) {
      if ((player.resources[res] || 0) < amount) {
        return { success: false, error: `Not enough ${res}. Need ${amount}, have ${player.resources[res] || 0}` };
      }
    }

    // Deduct resources
    for (const [res, amount] of Object.entries(shipClass.cost)) {
      player.resources[res] -= amount;
    }

    const ship = this.createShip(playerId, shipClassId, player.homeSystemId);
    ship.state = 'docked';
    return { success: true, ship };
  }

  // ----------------------------------------------------------
  // MOVEMENT
  // ----------------------------------------------------------

  moveShip(playerId, shipId, targetX, targetY) {
    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return false;
    if (ship.state === 'warping' || ship.isDestroyed) return false;

    ship.targetX = Math.max(20, Math.min(780, targetX));
    ship.targetY = Math.max(20, Math.min(580, targetY));
    ship.state = 'moving';
    ship.miningTarget = null;
    ship.combatTarget = null;
    return true;
  }

  // ----------------------------------------------------------
  // WARP TRAVEL
  // ----------------------------------------------------------

  warpShip(playerId, shipId, targetSystemId) {
    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };
    if (ship.state === 'combat') return { success: false, error: 'Cannot warp during combat' };
    if (ship.isDestroyed) return { success: false, error: 'Ship is destroyed' };

    const fromSystem = this.systems.get(ship.systemId);
    const toSystem = this.systems.get(targetSystemId);
    if (!fromSystem || !toSystem) return { success: false, error: 'Invalid system' };

    // Check connection
    if (!fromSystem.connections.includes(targetSystemId)) {
      return { success: false, error: 'Systems are not connected' };
    }

    // Check warp range
    const dist = getWarpDistance(ship.systemId, targetSystemId);
    if (dist > ship.warpRange) {
      return { success: false, error: `Warp range too short. Need ${dist}, have ${ship.warpRange}` };
    }

    // Remove from current system
    fromSystem.ships.delete(ship.id);

    // Set warping state
    ship.state = 'warping';
    ship.systemId = targetSystemId;

    // Warp takes 2 seconds
    setTimeout(() => {
      toSystem.ships.add(ship.id);
      ship.x = 400 + (Math.random() - 0.5) * 100;
      ship.y = 400 + (Math.random() - 0.5) * 100;
      ship.state = 'idle';
      ship.targetX = null;
      ship.targetY = null;
    }, 2000);

    return { success: true, arrivalSystem: targetSystemId };
  }

  // Multi-hop warp: find shortest path and chain warps automatically
  warpShipToSystem(playerId, shipId, targetSystemId) {
    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };
    if (ship.state === 'combat') return { success: false, error: 'Cannot warp during combat' };
    if (ship.state === 'warping') return { success: false, error: 'Already warping' };
    if (ship.isDestroyed) return { success: false, error: 'Ship is destroyed' };
    if (ship.systemId === targetSystemId) return { success: false, error: 'Already in that system' };

    const path = getWarpPath(ship.systemId, targetSystemId);
    if (!path) return { success: false, error: 'No route to that system' };

    const jumps = path.length - 1; // number of hops
    if (jumps > ship.warpRange) {
      return { success: false, error: `Out of warp range. Need ${jumps} jumps, ship has range ${ship.warpRange}` };
    }

    // Remove from current system and start warping
    const fromSystem = this.systems.get(ship.systemId);
    fromSystem.ships.delete(ship.id);
    ship.state = 'warping';

    // Chain warps along the path (2 seconds per hop)
    const hops = path.slice(1); // systems to visit (excluding current)
    const warpNextHop = (hopIndex) => {
      if (hopIndex >= hops.length) return;

      const nextSystemId = hops[hopIndex];
      ship.systemId = nextSystemId;

      setTimeout(() => {
        const nextSystem = this.systems.get(nextSystemId);

        if (hopIndex === hops.length - 1) {
          // Final destination
          nextSystem.ships.add(ship.id);
          ship.x = 400 + (Math.random() - 0.5) * 100;
          ship.y = 400 + (Math.random() - 0.5) * 100;
          ship.state = 'idle';
          ship.targetX = null;
          ship.targetY = null;
        } else {
          // Passing through — briefly appear then continue
          nextSystem.ships.add(ship.id);
          ship.x = 400;
          ship.y = 400;

          // Remove after a brief moment and continue
          setTimeout(() => {
            nextSystem.ships.delete(ship.id);
            warpNextHop(hopIndex + 1);
          }, 500);
        }
      }, 2000);
    };

    warpNextHop(0);

    return {
      success: true,
      arrivalSystem: targetSystemId,
      jumps,
      path: hops,
    };
  }

  // ----------------------------------------------------------
  // MINING
  // ----------------------------------------------------------

  startMining(playerId, shipId, nodeName) {
    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };
    if (ship.miningRate <= 0) return { success: false, error: 'This ship cannot mine' };
    if (ship.state === 'combat') return { success: false, error: 'Cannot mine during combat' };

    const system = this.systems.get(ship.systemId);
    const node = system.miningNodes.find(n => n.name === nodeName);
    if (!node) return { success: false, error: 'Mining node not found' };

    // Check if close enough
    const dx = ship.x - node.x;
    const dy = ship.y - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MINING_RANGE) {
      // Auto-move to node
      ship.targetX = node.x;
      ship.targetY = node.y;
      ship.state = 'moving';
      ship.miningTarget = nodeName;
      return { success: true, message: 'Moving to mining node' };
    }

    ship.state = 'mining';
    ship.miningTarget = nodeName;
    return { success: true, message: 'Mining started' };
  }

  // ----------------------------------------------------------
  // DOCK / TRANSFER CARGO
  // ----------------------------------------------------------

  dockShip(playerId, shipId) {
    const ship = this.ships.get(shipId);
    const player = this.players.get(playerId);
    if (!ship || !player || ship.playerId !== playerId) return { success: false, error: 'Invalid' };
    if (ship.systemId !== player.starbase.systemId) return { success: false, error: 'Not in home system' };
    if (ship.state === 'combat') return { success: false, error: 'Cannot dock during combat' };

    // Transfer all cargo to player resources
    for (const [res, amount] of Object.entries(ship.cargo)) {
      player.resources[res] = (player.resources[res] || 0) + amount;
    }
    ship.cargo = {};
    ship.state = 'docked';

    // Repair ship at dock
    ship.hull = ship.maxHull;
    ship.armor = ship.maxArmor;
    ship.shields = ship.maxShields;

    return { success: true, resources: { ...player.resources } };
  }

  // ----------------------------------------------------------
  // COMBAT
  // ----------------------------------------------------------

  attackShip(playerId, attackerShipId, targetShipId) {
    const attacker = this.ships.get(attackerShipId);
    const target = this.ships.get(targetShipId);
    if (!attacker || !target) return { success: false, error: 'Invalid ships' };
    if (attacker.playerId !== playerId) return { success: false, error: 'Not your ship' };
    if (attacker.systemId !== target.systemId) return { success: false, error: 'Not in same system' };
    if (attacker.isDestroyed || target.isDestroyed) return { success: false, error: 'Ship destroyed' };

    // Check PVP rules — NPCs can always be attacked, players only in dangerous zones
    const system = this.systems.get(attacker.systemId);
    if (system.type === 'safe' && !target.isNpc) {
      return { success: false, error: 'Cannot attack players in safe zones' };
    }

    attacker.combatTarget = targetShipId;
    attacker.state = 'combat';

    // Target auto-fights back
    if (!target.combatTarget) {
      target.combatTarget = attackerShipId;
      target.state = 'combat';
    }

    return { success: true };
  }

  processCombat(ship, now) {
    if (ship.state !== 'combat' || !ship.combatTarget) return;

    const target = this.ships.get(ship.combatTarget);
    if (!target || target.isDestroyed) {
      ship.state = 'idle';
      ship.combatTarget = null;
      return;
    }

    // Check range
    const dx = ship.x - target.x;
    const dy = ship.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Move towards target if out of range
    if (dist > COMBAT_RANGE) {
      ship.targetX = target.x;
      ship.targetY = target.y;
      // Still move but stay in combat state
      return;
    }

    // Fire weapons based on fire rate
    const fireInterval = 1000 / ship.fireRate;
    if (now - ship.lastFireTime < fireInterval) return;
    ship.lastFireTime = now;

    // Calculate total damage
    let totalDamage = ship.laserDamage + ship.torpedoDamage;

    // Apply damage: shields first, then armor, then hull
    if (target.shields > 0) {
      const shieldDmg = Math.min(target.shields, totalDamage);
      target.shields -= shieldDmg;
      totalDamage -= shieldDmg;
    }
    if (totalDamage > 0 && target.armor > 0) {
      const armorDmg = Math.min(target.armor, totalDamage);
      target.armor -= armorDmg;
      totalDamage -= armorDmg;
    }
    if (totalDamage > 0) {
      target.hull -= totalDamage;
    }

    // Check if target is destroyed
    if (target.hull <= 0) {
      target.hull = 0;
      target.isDestroyed = true;
      target.state = 'destroyed';

      // Drop cargo — attacker gets it
      const attackerPlayer = this.players.get(ship.playerId);
      if (attackerPlayer) {
        for (const [res, amount] of Object.entries(target.cargo)) {
          attackerPlayer.resources[res] = (attackerPlayer.resources[res] || 0) + amount;
        }
      }
      target.cargo = {};

      // If target was NPC, award resources and XP to killer
      if (target.isNpc && !ship.isNpc) {
        this.onNpcKilled(ship, target);
      }

      // Remove destroyed ship after a delay
      setTimeout(() => this.removeShip(target.id), 5000);

      ship.state = 'idle';
      ship.combatTarget = null;
    }
  }

  // ----------------------------------------------------------
  // NPC SYSTEM
  // ----------------------------------------------------------

  spawnNpcsInSystem(systemId) {
    const system = this.systems.get(systemId);
    if (!system) return;

    const spawnInfo = NPC_SPAWN_TABLE[system.level] || NPC_SPAWN_TABLE[1];
    const levelMult = getNpcLevelMultiplier(system.level);

    for (let i = 0; i < spawnInfo.count; i++) {
      const npcType = spawnInfo.types[Math.floor(Math.random() * spawnInfo.types.length)];
      this.createNpcShip(npcType, systemId, levelMult);
    }
  }

  createNpcShip(npcTypeId, systemId, levelMult) {
    const npcDef = NPC_SHIPS[npcTypeId];
    if (!npcDef) return null;

    const system = this.systems.get(systemId);
    if (!system) return null;

    const shipId = uuidv4();
    const base = npcDef.baseStats;

    const ship = {
      id: shipId,
      playerId: 'npc',
      classId: npcTypeId,
      className: npcDef.name,
      classType: 'npc',
      icon: npcDef.icon,
      color: npcDef.color,
      systemId,

      x: 50 + Math.random() * 700,
      y: 50 + Math.random() * 500,
      targetX: null,
      targetY: null,
      angle: Math.random() * Math.PI * 2,

      upgrades: { armor: 1, shields: 1, lasers: 1, torpedoes: 1, cargo: 1, warp: 1 },

      maxHull: Math.floor(base.hull * levelMult),
      hull: Math.floor(base.hull * levelMult),
      maxArmor: Math.floor(base.armor * levelMult),
      armor: Math.floor(base.armor * levelMult),
      maxShields: Math.floor(base.shields * levelMult),
      shields: Math.floor(base.shields * levelMult),
      laserDamage: Math.floor(base.laserDamage * levelMult),
      torpedoDamage: Math.floor(base.torpedoDamage * levelMult),
      fireRate: base.fireRate,
      speed: base.speed,
      warpRange: 0,
      maxCargo: 0,
      cargo: {},
      miningRate: 0,

      state: 'idle',
      miningTarget: null,
      combatTarget: null,
      lastFireTime: 0,
      isDestroyed: false,
      isNpc: true,
      npcType: npcTypeId,

      // NPC AI state
      npcWanderTimer: Date.now() + Math.random() * NPC_WANDER_INTERVAL,
      npcAggroRange: 150,  // pixels — NPCs will engage player ships within this range

      xp: 0,
      kills: 0,
      powerBonus: 0,
    };

    this.ships.set(shipId, ship);
    this.npcShips.set(shipId, ship);
    system.ships.add(shipId);

    return ship;
  }

  // Count living NPCs in a system
  getNpcCountInSystem(systemId) {
    let count = 0;
    for (const ship of this.npcShips.values()) {
      if (ship.systemId === systemId && !ship.isDestroyed) count++;
    }
    return count;
  }

  // NPC AI tick — called less frequently than main tick
  tickNpcAI(now) {
    for (const ship of this.npcShips.values()) {
      if (ship.isDestroyed) continue;

      // --- Aggro: find nearby player ships and attack ---
      if (ship.state !== 'combat') {
        const system = this.systems.get(ship.systemId);
        if (system) {
          let closestDist = ship.npcAggroRange;
          let closestTarget = null;

          for (const otherShipId of system.ships) {
            const otherShip = this.ships.get(otherShipId);
            if (!otherShip || otherShip.isNpc || otherShip.isDestroyed) continue;
            if (otherShip.state === 'warping' || otherShip.state === 'docked') continue;

            const dx = ship.x - otherShip.x;
            const dy = ship.y - otherShip.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
              closestDist = dist;
              closestTarget = otherShip;
            }
          }

          if (closestTarget) {
            ship.combatTarget = closestTarget.id;
            ship.state = 'combat';
            // Target fights back
            if (closestTarget.state !== 'combat') {
              closestTarget.combatTarget = ship.id;
              closestTarget.state = 'combat';
            }
            continue;
          }
        }
      }

      // --- Wander: pick random destinations ---
      if (ship.state === 'idle' && now > ship.npcWanderTimer) {
        ship.targetX = 50 + Math.random() * 700;
        ship.targetY = 50 + Math.random() * 500;
        ship.state = 'moving';
        ship.npcWanderTimer = now + NPC_WANDER_INTERVAL + Math.random() * 2000;
      }
    }

    // --- Respawn check: if all NPCs cleared in a system, schedule respawn ---
    for (const sys of STAR_SYSTEMS) {
      const system = this.systems.get(sys.id);
      if (!system._npcRespawnTimer && this.getNpcCountInSystem(sys.id) === 0) {
        system._npcRespawnTimer = setTimeout(() => {
          this.spawnNpcsInSystem(sys.id);
          system._npcRespawnTimer = null;
        }, NPC_RESPAWN_DELAY);
      }
    }
  }

  // Called when a player ship destroys an NPC
  onNpcKilled(killerShip, npcShip) {
    const player = this.players.get(killerShip.playerId);
    if (!player) return;

    const npcDef = NPC_SHIPS[npcShip.npcType];
    if (!npcDef) return;

    // Award resources (scaled by system level)
    const system = this.systems.get(npcShip.systemId);
    const levelMult = system ? getNpcLevelMultiplier(system.level) : 1;
    for (const [res, amount] of Object.entries(npcDef.drops)) {
      const scaledAmount = Math.floor(amount * levelMult);
      player.resources[res] = (player.resources[res] || 0) + scaledAmount;
    }

    // Award XP and power bonus to the killer ship
    const xpGain = Math.floor(npcDef.xpReward * levelMult);
    killerShip.xp = (killerShip.xp || 0) + xpGain;
    killerShip.kills = (killerShip.kills || 0) + 1;

    // Power bonus: each kill gives a small permanent stat boost
    // Diminishing returns: first kills give more, caps at 100% bonus
    const newBonus = Math.min(1.0, (killerShip.kills * 0.02));
    killerShip.powerBonus = newBonus;

    // Apply power bonus to ship stats
    this.applyPowerBonus(killerShip);

    // Clean up NPC tracking
    this.npcShips.delete(npcShip.id);
  }

  applyPowerBonus(ship) {
    const base = SHIP_CLASSES[ship.classId];
    if (!base) return; // NPC ships don't use this

    const u = ship.upgrades;
    const bonus = 1 + (ship.powerBonus || 0);

    const armorMult = UPGRADE_TIERS.armor[u.armor - 1].multiplier;
    const shieldMult = UPGRADE_TIERS.shields[u.shields - 1].multiplier;
    const laserMult = UPGRADE_TIERS.lasers[u.lasers - 1].multiplier;
    const torpMult = UPGRADE_TIERS.torpedoes[u.torpedoes - 1].multiplier;
    const cargoMult = UPGRADE_TIERS.cargo[u.cargo - 1].multiplier;
    const warpMult = UPGRADE_TIERS.warp[u.warp - 1].multiplier;

    ship.maxArmor = Math.floor(base.baseStats.armor * armorMult * bonus);
    ship.maxShields = Math.floor(base.baseStats.shields * shieldMult * bonus);
    ship.laserDamage = Math.floor(base.baseStats.laserDamage * laserMult * bonus);
    ship.torpedoDamage = Math.floor(base.baseStats.torpedoDamage * torpMult * bonus);
    ship.maxCargo = Math.floor(base.baseStats.cargo * cargoMult);
    ship.warpRange = Math.floor(base.baseStats.warpRange * warpMult);
    ship.maxHull = Math.floor(base.baseStats.hull * bonus);
  }

  // ----------------------------------------------------------
  // GAME TICK
  // ----------------------------------------------------------

  tick() {
    const now = Date.now();

    // NPC AI runs every 5 ticks (4 times per second) to save CPU
    this.npcTickCounter++;
    if (this.npcTickCounter % 5 === 0) {
      this.tickNpcAI(now);
    }

    for (const ship of this.ships.values()) {
      if (ship.isDestroyed || ship.state === 'warping' || ship.state === 'docked') continue;

      // --- Movement ---
      if (ship.targetX !== null && ship.targetY !== null) {
        const dx = ship.targetX - ship.x;
        const dy = ship.targetY - ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 3) {
          ship.x = ship.targetX;
          ship.y = ship.targetY;
          ship.targetX = null;
          ship.targetY = null;
          if (ship.state === 'moving') {
            // Check if we were moving to mine
            if (ship.miningTarget) {
              ship.state = 'mining';
            } else {
              ship.state = 'idle';
            }
          }
        } else {
          const moveSpeed = ship.speed / TICK_RATE;
          const moveX = (dx / dist) * Math.min(moveSpeed, dist);
          const moveY = (dy / dist) * Math.min(moveSpeed, dist);
          ship.x += moveX;
          ship.y += moveY;
          ship.angle = Math.atan2(dy, dx);
        }
      }

      // --- Mining ---
      if (ship.state === 'mining' && ship.miningTarget) {
        const system = this.systems.get(ship.systemId);
        const node = system.miningNodes.find(n => n.name === ship.miningTarget);
        if (node) {
          const totalCargo = Object.values(ship.cargo).reduce((a, b) => a + b, 0);
          if (totalCargo < ship.maxCargo) {
            const mined = (ship.miningRate * node.richness) / TICK_RATE;
            ship.cargo[node.resource] = (ship.cargo[node.resource] || 0) + mined;
          }
          // else cargo full — keep mining state but don't add
        }
      }

      // --- Combat ---
      if (ship.state === 'combat') {
        this.processCombat(ship, now);
      }
    }
  }

  // ----------------------------------------------------------
  // STATE SNAPSHOTS (for sending to clients)
  // ----------------------------------------------------------

  getSystemState(systemId) {
    const system = this.systems.get(systemId);
    if (!system) return null;

    const ships = [];
    for (const shipId of system.ships) {
      const ship = this.ships.get(shipId);
      if (ship && !ship.isDestroyed) {
        ships.push(this.getShipSnapshot(ship));
      }
    }

    return {
      id: system.id,
      name: system.name,
      type: system.type,
      level: system.level,
      color: system.color,
      connections: system.connections,
      miningNodes: system.miningNodes,
      ships,
    };
  }

  getShipSnapshot(ship) {
    return {
      id: ship.id,
      playerId: ship.playerId,
      classId: ship.classId,
      className: ship.className,
      classType: ship.classType,
      icon: ship.icon,
      color: ship.color,
      systemId: ship.systemId,
      x: ship.x,
      y: ship.y,
      angle: ship.angle,
      state: ship.state,
      hull: ship.hull,
      maxHull: ship.maxHull,
      armor: ship.armor,
      maxArmor: ship.maxArmor,
      shields: ship.shields,
      maxShields: ship.maxShields,
      laserDamage: ship.laserDamage,
      torpedoDamage: ship.torpedoDamage,
      fireRate: ship.fireRate,
      speed: ship.speed,
      warpRange: ship.warpRange,
      maxCargo: ship.maxCargo,
      cargo: { ...ship.cargo },
      miningRate: ship.miningRate,
      upgrades: { ...ship.upgrades },
      miningTarget: ship.miningTarget,
      combatTarget: ship.combatTarget,
      isNpc: ship.isNpc || false,
      npcType: ship.npcType || null,
      xp: ship.xp || 0,
      kills: ship.kills || 0,
      powerBonus: ship.powerBonus || 0,
    };
  }

  getPlayerState(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;

    return {
      id: player.id,
      name: player.name,
      homeSystemId: player.homeSystemId,
      resources: { ...player.resources },
      starbase: { ...player.starbase },
      shipIds: [...player.shipIds],
    };
  }

  getGalaxyMap() {
    return STAR_SYSTEMS.map(sys => {
      const systemState = this.systems.get(sys.id);
      // Count ships per player in this system
      const playerShips = {};
      for (const shipId of systemState.ships) {
        const ship = this.ships.get(shipId);
        if (ship && !ship.isDestroyed) {
          playerShips[ship.playerId] = (playerShips[ship.playerId] || 0) + 1;
        }
      }
      return {
        id: sys.id,
        name: sys.name,
        x: sys.x,
        y: sys.y,
        type: sys.type,
        level: sys.level,
        color: sys.color,
        connections: sys.connections,
        shipCount: systemState.ships.size,
        playerShips,
      };
    });
  }
}

module.exports = GameEngine;
