// ============================================================
// GAME ENGINE
// Handles all server-side game logic:
//   - Player state, ship management
//   - Movement, Warp travel, Combat (with RPS advantage)
//   - Mining, Upgrades, Buildings
//   - Factions, Officers, Missions, Alliances
// ============================================================

const { v4: uuidv4 } = require('uuid');
const {
  SHIP_CLASSES, UPGRADE_TIERS, STAR_SYSTEMS,
  STARTER_RESOURCES, STARTER_SHIPS, RESOURCES, getWarpDistance, getWarpPath,
  NPC_SHIPS, NPC_SPAWN_TABLE, getNpcLevelMultiplier,
  COMBAT_ADVANTAGE, ADVANTAGE_MULTIPLIER, DISADVANTAGE_MULTIPLIER,
  FACTIONS, BUILDING_TYPES, OFFICERS, OFFICER_RARITIES, MISSIONS, getFactionTier,
} = require('./gameData');

const TICK_RATE = 20;
const TICK_MS = 1000 / TICK_RATE;
const COMBAT_RANGE = 60;
const MINING_RANGE = 80;
const SHIP_COLLISION_RADIUS = 20;
const NPC_RESPAWN_DELAY = 30000;
const NPC_WANDER_INTERVAL = 3000;
const DAILY_RESET_INTERVAL = 86400000; // 24 hours

class GameEngine {
  constructor() {
    this.players = new Map();       // playerId -> Player
    this.ships = new Map();         // shipId -> Ship
    this.systems = new Map();       // systemId -> SystemState
    this.combats = new Map();       // combatId -> Combat
    this.npcShips = new Map();      // shipId -> NPC ship data
    this.alliances = new Map();     // allianceId -> Alliance
    this.tickInterval = null;
    this.npcTickCounter = 0;

    // Initialize system states
    for (const sys of STAR_SYSTEMS) {
      this.systems.set(sys.id, {
        ...sys,
        ships: new Set(),
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
        buildings: {
          refinery: { level: 0, upgrading: false, upgradeCompleteTime: 0 },
          research_center: { level: 0, upgrading: false, upgradeCompleteTime: 0 },
          shipyard: { level: 0, upgrading: false, upgradeCompleteTime: 0 },
          shield_generator: { level: 0, upgrading: false, upgradeCompleteTime: 0 },
          warehouse: { level: 0, upgrading: false, upgradeCompleteTime: 0 },
          defense_platform: { level: 0, upgrading: false, upgradeCompleteTime: 0 },
        },
      },
      shipIds: [],
      // Factions
      factionRep: { solari: 0, nexari: 0, aurani: 0 },
      // Officers
      officers: [],           // officer IDs the player has recruited
      officerAssignments: {},  // shipId -> officerId
      // Missions
      activeMissions: {},      // missionId -> { progress, accepted: true }
      completedMissions: [],
      dailyResetTime: Date.now() + DAILY_RESET_INTERVAL,
      // Alliance
      allianceId: null,
      // Stats tracking for missions
      stats: {
        totalMined: 0,
        totalKills: 0,
        totalWarps: 0,
        totalDocks: 0,
        totalBuilds: 0, // counts starter ships too but that's fine
        npcKillsPvpZone: 0,
        minedByResource: {},
      },
    };

    this.players.set(playerId, player);

    // Create starter ships
    for (const shipClassId of STARTER_SHIPS) {
      this.createShip(playerId, shipClassId, homeSystem.id);
    }

    // Auto-accept first story mission
    player.activeMissions['story_first_kill'] = { progress: 0 };

    return player;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    for (const shipId of [...player.shipIds]) {
      this.removeShip(shipId);
    }
    // Remove from alliance
    if (player.allianceId) {
      this.leaveAlliance(playerId);
    }
    this.players.delete(playerId);
  }

  getPlayerBySocket(socketId) {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) return player;
    }
    return null;
  }

  getPlayerByName(name) {
    for (const player of this.players.values()) {
      if (player.name.toLowerCase() === name.toLowerCase()) return player;
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
      combatRole: shipClass.combatRole || null,
      icon: shipClass.icon,
      color: shipClass.color,
      systemId,
      x: 350 + (Math.random() - 0.5) * 200,
      y: 350 + (Math.random() - 0.5) * 200,
      targetX: null, targetY: null, angle: 0,
      upgrades: { armor: 1, shields: 1, lasers: 1, torpedoes: 1, cargo: 1, warp: 1 },
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
      cargo: {},
      miningRate: shipClass.baseStats.miningRate || 0,
      state: 'idle',
      miningTarget: null,
      combatTarget: null,
      lastFireTime: 0,
      isDestroyed: false,
      isNpc: false,
      // Officer
      officerId: null,
      activeAbility: null,       // { effect, expiresAt }
      abilityCooldownUntil: 0,
      // Progression
      xp: 0, kills: 0, powerBonus: 0,
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
      // Unassign officer
      if (player.officerAssignments[shipId]) {
        delete player.officerAssignments[shipId];
      }
    }
    this.ships.delete(shipId);
  }

  recalcShipStats(ship) {
    const base = SHIP_CLASSES[ship.classId];
    if (!base) return;
    const u = ship.upgrades;
    const bonus = 1 + (ship.powerBonus || 0);

    const armorMult = UPGRADE_TIERS.armor[u.armor - 1].multiplier;
    const shieldMult = UPGRADE_TIERS.shields[u.shields - 1].multiplier;
    const laserMult = UPGRADE_TIERS.lasers[u.lasers - 1].multiplier;
    const torpMult = UPGRADE_TIERS.torpedoes[u.torpedoes - 1].multiplier;
    const cargoMult = UPGRADE_TIERS.cargo[u.cargo - 1].multiplier;
    const warpMult = UPGRADE_TIERS.warp[u.warp - 1].multiplier;

    // Officer passive bonuses
    let officerBonus = this.getOfficerPassiveBonus(ship);

    ship.maxArmor = Math.floor(base.baseStats.armor * armorMult * bonus * (1 + (officerBonus.armor || 0)));
    ship.maxShields = Math.floor(base.baseStats.shields * shieldMult * bonus * (1 + (officerBonus.shieldStrength || 0)));
    ship.laserDamage = Math.floor(base.baseStats.laserDamage * laserMult * bonus * (1 + (officerBonus.weaponDamage || 0)));
    ship.torpedoDamage = Math.floor(base.baseStats.torpedoDamage * torpMult * bonus * (1 + (officerBonus.torpedoDamage || 0)));
    ship.maxCargo = Math.floor(base.baseStats.cargo * cargoMult * (1 + (officerBonus.cargoCapacity || 0)));
    ship.warpRange = Math.floor(base.baseStats.warpRange * warpMult * (1 + (officerBonus.warpRange || 0)));
    ship.maxHull = Math.floor(base.baseStats.hull * bonus);
    ship.speed = Math.floor(base.baseStats.speed * (1 + (officerBonus.speed || 0)));
    ship.fireRate = base.baseStats.fireRate * (1 + (officerBonus.fireRate || 0));
    ship.miningRate = (base.baseStats.miningRate || 0) * (1 + (officerBonus.miningRate || 0));
  }

  getOfficerPassiveBonus(ship) {
    const bonus = {};
    if (!ship.officerId) return bonus;
    const officer = OFFICERS[ship.officerId];
    if (!officer) return bonus;

    if (officer.passive.type === 'allStats') {
      const v = officer.passive.value;
      bonus.armor = v; bonus.shieldStrength = v; bonus.weaponDamage = v;
      bonus.torpedoDamage = v; bonus.speed = v; bonus.fireRate = v;
      bonus.miningRate = v; bonus.cargoCapacity = v; bonus.warpRange = v;
    } else {
      bonus[officer.passive.type] = officer.passive.value;
    }

    // Faction passive bonuses
    const player = this.players.get(ship.playerId);
    if (player) {
      for (const [factionId, faction] of Object.entries(FACTIONS)) {
        const tier = getFactionTier(factionId, player.factionRep[factionId] || 0);
        if (tier.tier > 2) { // friendly or above
          for (const [stat, val] of Object.entries(faction.bonus)) {
            bonus[stat] = (bonus[stat] || 0) + val * (tier.tier - 2);
          }
        }
      }
    }
    return bonus;
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

    const nextTier = tiers[currentTier];
    const cost = { ...nextTier.cost };

    // Research center discount
    const rcLevel = player.starbase.buildings.research_center.level;
    if (rcLevel > 0) {
      const discount = BUILDING_TYPES.research_center.levels[rcLevel - 1].effect.upgradeCostReduction;
      for (const res of Object.keys(cost)) {
        cost[res] = Math.ceil(cost[res] * (1 - discount));
      }
    }

    for (const [res, amount] of Object.entries(cost)) {
      if ((player.resources[res] || 0) < amount) {
        return { success: false, error: `Not enough ${res}. Need ${amount}, have ${Math.floor(player.resources[res] || 0)}` };
      }
    }

    for (const [res, amount] of Object.entries(cost)) {
      player.resources[res] -= amount;
    }

    ship.upgrades[component] = currentTier + 1;
    this.recalcShipStats(ship);
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

    // Check faction requirement
    if (shipClass.faction && shipClass.factionRepRequired) {
      const rep = player.factionRep[shipClass.faction] || 0;
      if (rep < shipClass.factionRepRequired) {
        return { success: false, error: `Need ${shipClass.factionRepRequired} ${FACTIONS[shipClass.faction].name} reputation (have ${rep})` };
      }
    }

    for (const [res, amount] of Object.entries(shipClass.cost)) {
      if ((player.resources[res] || 0) < amount) {
        return { success: false, error: `Not enough ${res}. Need ${amount}, have ${Math.floor(player.resources[res] || 0)}` };
      }
    }

    for (const [res, amount] of Object.entries(shipClass.cost)) {
      player.resources[res] -= amount;
    }

    const ship = this.createShip(playerId, shipClassId, player.homeSystemId);
    ship.state = 'docked';

    // Mission tracking
    player.stats.totalBuilds++;
    this.checkMissionProgress(playerId, 'build_ship', 1);

    return { success: true, ship };
  }

  // ----------------------------------------------------------
  // MOVEMENT
  // ----------------------------------------------------------

  moveShip(playerId, shipId, targetX, targetY) {
    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return false;
    if (ship.state === 'warping' || ship.isDestroyed) return false;

    ship.targetX = Math.max(10, Math.min(790, targetX));
    ship.targetY = Math.max(10, Math.min(590, targetY));
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

    if (!fromSystem.connections.includes(targetSystemId)) {
      return { success: false, error: 'Systems are not connected' };
    }

    const dist = getWarpDistance(ship.systemId, targetSystemId);
    if (dist > ship.warpRange) {
      return { success: false, error: `Warp range too short. Need ${dist}, have ${ship.warpRange}` };
    }

    fromSystem.ships.delete(ship.id);
    ship.state = 'warping';
    ship.systemId = targetSystemId;

    setTimeout(() => {
      toSystem.ships.add(ship.id);
      ship.x = 400 + (Math.random() - 0.5) * 100;
      ship.y = 400 + (Math.random() - 0.5) * 100;
      ship.state = 'idle';
      ship.targetX = null;
      ship.targetY = null;
    }, 2000);

    // Mission tracking
    const player = this.players.get(playerId);
    if (player) {
      player.stats.totalWarps++;
      this.checkMissionProgress(playerId, 'warp', 1);
    }

    return { success: true, arrivalSystem: targetSystemId };
  }

  warpShipToSystem(playerId, shipId, targetSystemId) {
    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };
    if (ship.state === 'combat') return { success: false, error: 'Cannot warp during combat' };
    if (ship.state === 'warping') return { success: false, error: 'Already warping' };
    if (ship.isDestroyed) return { success: false, error: 'Ship is destroyed' };
    if (ship.systemId === targetSystemId) return { success: false, error: 'Already in that system' };

    const path = getWarpPath(ship.systemId, targetSystemId);
    if (!path) return { success: false, error: 'No route to that system' };

    const jumps = path.length - 1;
    if (jumps > ship.warpRange) {
      return { success: false, error: `Out of warp range. Need ${jumps} jumps, ship has range ${ship.warpRange}` };
    }

    const fromSystem = this.systems.get(ship.systemId);
    fromSystem.ships.delete(ship.id);
    ship.state = 'warping';

    const hops = path.slice(1);
    const warpNextHop = (hopIndex) => {
      if (hopIndex >= hops.length) return;
      const nextSystemId = hops[hopIndex];
      ship.systemId = nextSystemId;

      setTimeout(() => {
        const nextSystem = this.systems.get(nextSystemId);
        if (hopIndex === hops.length - 1) {
          nextSystem.ships.add(ship.id);
          ship.x = 400 + (Math.random() - 0.5) * 100;
          ship.y = 400 + (Math.random() - 0.5) * 100;
          ship.state = 'idle';
          ship.targetX = null;
          ship.targetY = null;
        } else {
          nextSystem.ships.add(ship.id);
          ship.x = 400;
          ship.y = 400;
          setTimeout(() => {
            nextSystem.ships.delete(ship.id);
            warpNextHop(hopIndex + 1);
          }, 500);
        }
      }, 2000);
    };

    warpNextHop(0);

    // Mission tracking
    const player = this.players.get(playerId);
    if (player) {
      player.stats.totalWarps += jumps;
      this.checkMissionProgress(playerId, 'warp', jumps);
    }

    return { success: true, arrivalSystem: targetSystemId, jumps, path: hops };
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

    const dx = ship.x - node.x;
    const dy = ship.y - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MINING_RANGE) {
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

    for (const [res, amount] of Object.entries(ship.cargo)) {
      player.resources[res] = (player.resources[res] || 0) + amount;
    }
    ship.cargo = {};
    ship.state = 'docked';
    ship.hull = ship.maxHull;
    ship.armor = ship.maxArmor;
    ship.shields = ship.maxShields;

    // Mission tracking
    player.stats.totalDocks++;
    this.checkMissionProgress(playerId, 'dock', 1);

    return { success: true, resources: { ...player.resources } };
  }

  returnShipToStarbase(ship) {
    const player = this.players.get(ship.playerId);
    if (!player) { this.removeShip(ship.id); return; }

    const oldSystem = this.systems.get(ship.systemId);
    if (oldSystem) oldSystem.ships.delete(ship.id);

    const homeSystem = this.systems.get(player.homeSystemId);
    ship.systemId = player.homeSystemId;
    ship.x = 400 + (Math.random() - 0.5) * 60;
    ship.y = 400 + (Math.random() - 0.5) * 60;
    ship.targetX = null;
    ship.targetY = null;
    ship.combatTarget = null;
    ship.miningTarget = null;
    ship.cargo = {};
    ship.isDestroyed = false;
    ship.hull = 1;
    ship.armor = 0;
    ship.shields = 0;
    ship.state = 'damaged';
    homeSystem.ships.add(ship.id);
  }

  repairShip(playerId, shipId) {
    const player = this.players.get(playerId);
    const ship = this.ships.get(shipId);
    if (!player || !ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };
    if (ship.systemId !== player.homeSystemId) return { success: false, error: 'Ship must be at your starbase' };
    if (ship.state !== 'damaged' || ship.hull >= ship.maxHull) return { success: false, error: 'Ship does not need repair' };

    const shipClass = SHIP_CLASSES[ship.classId];
    if (!shipClass) return { success: false, error: 'Unknown ship class' };

    const repairCost = {};
    for (const [res, amount] of Object.entries(shipClass.cost)) {
      repairCost[res] = Math.ceil(amount * 0.3);
    }

    for (const [res, amount] of Object.entries(repairCost)) {
      if ((player.resources[res] || 0) < amount) {
        return { success: false, error: `Not enough ${res}. Need ${amount}, have ${Math.floor(player.resources[res] || 0)}` };
      }
    }

    for (const [res, amount] of Object.entries(repairCost)) {
      player.resources[res] -= amount;
    }

    ship.hull = ship.maxHull;
    ship.armor = ship.maxArmor;
    ship.shields = ship.maxShields;
    ship.state = 'docked';
    return { success: true, cost: repairCost };
  }

  // ----------------------------------------------------------
  // COMBAT (with Rock-Paper-Scissors advantage)
  // ----------------------------------------------------------

  attackShip(playerId, attackerShipId, targetShipId) {
    const attacker = this.ships.get(attackerShipId);
    const target = this.ships.get(targetShipId);
    if (!attacker || !target) return { success: false, error: 'Invalid ships' };
    if (attacker.playerId !== playerId) return { success: false, error: 'Not your ship' };
    if (attacker.systemId !== target.systemId) return { success: false, error: 'Not in same system' };
    if (attacker.isDestroyed || target.isDestroyed) return { success: false, error: 'Ship destroyed' };

    const system = this.systems.get(attacker.systemId);
    if (system.type === 'safe' && !target.isNpc) {
      return { success: false, error: 'Cannot attack players in safe zones' };
    }

    attacker.combatTarget = targetShipId;
    attacker.state = 'combat';

    if (!target.combatTarget) {
      target.combatTarget = attackerShipId;
      target.state = 'combat';
    }

    return { success: true };
  }

  getCombatAdvantage(attackerRole, defenderRole) {
    if (!attackerRole || !defenderRole) return 1.0;
    if (COMBAT_ADVANTAGE[attackerRole] === defenderRole) return ADVANTAGE_MULTIPLIER;
    if (COMBAT_ADVANTAGE[defenderRole] === attackerRole) return DISADVANTAGE_MULTIPLIER;
    return 1.0;
  }

  processCombat(ship, now) {
    if (ship.state !== 'combat' || !ship.combatTarget) return;

    const target = this.ships.get(ship.combatTarget);
    if (!target || target.isDestroyed) {
      ship.state = 'idle';
      ship.combatTarget = null;
      return;
    }

    const dx = ship.x - target.x;
    const dy = ship.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > COMBAT_RANGE) {
      ship.targetX = target.x;
      ship.targetY = target.y;
      return;
    }

    const fireInterval = 1000 / ship.fireRate;
    if (now - ship.lastFireTime < fireInterval) return;
    ship.lastFireTime = now;

    // Calculate damage with RPS advantage
    let totalDamage = ship.laserDamage + ship.torpedoDamage;
    const advantageMult = this.getCombatAdvantage(ship.combatRole, target.combatRole);
    totalDamage = Math.floor(totalDamage * advantageMult);

    // Active ability modifiers
    if (ship.activeAbility && now < ship.activeAbility.expiresAt) {
      const eff = ship.activeAbility.effect;
      if (eff.type === 'damageMultiplier') totalDamage = Math.floor(totalDamage * eff.value);
      if (eff.type === 'fireRateMultiplier') { /* handled in fireRate calc */ }
      if (eff.type === 'torpedoMultiplier') totalDamage = Math.floor(totalDamage + ship.torpedoDamage * (eff.value - 1));
      if (eff.type === 'lastStand') totalDamage = Math.floor(totalDamage * 2);
    }

    // Check target evasion
    if (target.activeAbility && now < target.activeAbility.expiresAt) {
      const tEff = target.activeAbility.effect;
      if (tEff.type === 'evasion' && Math.random() < tEff.value) return; // dodged
      if (tEff.type === 'invulnerable') return; // immune
    }

    // Apply damage: shields -> armor -> hull
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

    if (target.hull <= 0) {
      target.hull = 0;
      target.isDestroyed = true;
      target.state = 'destroyed';

      // Loot cargo
      const attackerPlayer = this.players.get(ship.playerId);
      if (attackerPlayer) {
        for (const [res, amount] of Object.entries(target.cargo)) {
          attackerPlayer.resources[res] = (attackerPlayer.resources[res] || 0) + amount;
        }
      }
      target.cargo = {};

      if (target.isNpc && !ship.isNpc) {
        this.onNpcKilled(ship, target);
      }

      if (target.isNpc) {
        setTimeout(() => this.removeShip(target.id), 5000);
      } else {
        setTimeout(() => this.returnShipToStarbase(target), 3000);
      }

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
      combatRole: npcDef.combatRole || null,
      icon: npcDef.icon,
      color: npcDef.color,
      systemId,
      x: 50 + Math.random() * 700,
      y: 50 + Math.random() * 500,
      targetX: null, targetY: null,
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
      warpRange: 0, maxCargo: 0, cargo: {}, miningRate: 0,
      state: 'idle', miningTarget: null, combatTarget: null,
      lastFireTime: 0, isDestroyed: false, isNpc: true, npcType: npcTypeId,
      npcWanderTimer: Date.now() + Math.random() * NPC_WANDER_INTERVAL,
      npcAggroRange: 150,
      officerId: null, activeAbility: null, abilityCooldownUntil: 0,
      xp: 0, kills: 0, powerBonus: 0,
    };

    this.ships.set(shipId, ship);
    this.npcShips.set(shipId, ship);
    system.ships.add(shipId);
    return ship;
  }

  getNpcCountInSystem(systemId) {
    let count = 0;
    for (const ship of this.npcShips.values()) {
      if (ship.systemId === systemId && !ship.isDestroyed) count++;
    }
    return count;
  }

  tickNpcAI(now) {
    for (const ship of this.npcShips.values()) {
      if (ship.isDestroyed) continue;

      if (ship.state !== 'combat') {
        const system = this.systems.get(ship.systemId);
        if (system) {
          let closestDist = ship.npcAggroRange;
          let closestTarget = null;
          for (const otherShipId of system.ships) {
            const otherShip = this.ships.get(otherShipId);
            if (!otherShip || otherShip.isNpc || otherShip.isDestroyed) continue;
            if (otherShip.state === 'warping' || otherShip.state === 'docked') continue;
            if (otherShip.state === 'mining') continue;
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
            if (closestTarget.state !== 'combat') {
              closestTarget.combatTarget = ship.id;
              closestTarget.state = 'combat';
            }
            continue;
          }
        }
      }

      if (ship.state === 'idle' && now > ship.npcWanderTimer) {
        ship.targetX = 50 + Math.random() * 700;
        ship.targetY = 50 + Math.random() * 500;
        ship.state = 'moving';
        ship.npcWanderTimer = now + NPC_WANDER_INTERVAL + Math.random() * 2000;
      }
    }

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

  onNpcKilled(killerShip, npcShip) {
    const player = this.players.get(killerShip.playerId);
    if (!player) return;

    const npcDef = NPC_SHIPS[npcShip.npcType];
    if (!npcDef) return;

    const system = this.systems.get(npcShip.systemId);
    const levelMult = system ? getNpcLevelMultiplier(system.level) : 1;
    for (const [res, amount] of Object.entries(npcDef.drops)) {
      const scaledAmount = Math.floor(amount * levelMult);
      player.resources[res] = (player.resources[res] || 0) + scaledAmount;
    }

    const xpGain = Math.floor(npcDef.xpReward * levelMult);
    killerShip.xp = (killerShip.xp || 0) + xpGain;
    killerShip.kills = (killerShip.kills || 0) + 1;
    const newBonus = Math.min(1.0, (killerShip.kills * 0.02));
    killerShip.powerBonus = newBonus;
    this.applyPowerBonus(killerShip);

    // Faction reputation: killing in faction territory gives rep
    if (system && system.faction) {
      const repGain = Math.floor(20 * levelMult);
      player.factionRep[system.faction] = (player.factionRep[system.faction] || 0) + repGain;
    }

    // Mission tracking
    player.stats.totalKills++;
    this.checkMissionProgress(player.id, 'kill_npc', 1);
    if (system && system.type === 'dangerous') {
      player.stats.npcKillsPvpZone++;
      this.checkMissionProgress(player.id, 'kill_npc_pvp', 1);
    }

    this.npcShips.delete(npcShip.id);
  }

  applyPowerBonus(ship) {
    const base = SHIP_CLASSES[ship.classId];
    if (!base) return;
    this.recalcShipStats(ship);
  }

  // ----------------------------------------------------------
  // BUILDINGS
  // ----------------------------------------------------------

  upgradeBuilding(playerId, buildingId) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Invalid player' };

    const buildingDef = BUILDING_TYPES[buildingId];
    if (!buildingDef) return { success: false, error: 'Invalid building' };

    const building = player.starbase.buildings[buildingId];
    if (!building) return { success: false, error: 'Building not found' };

    if (building.upgrading) return { success: false, error: 'Already upgrading' };
    if (building.level >= buildingDef.maxLevel) return { success: false, error: 'Already max level' };

    const nextLevel = buildingDef.levels[building.level]; // 0-based: levels[0] = level 1
    const cost = nextLevel.cost;

    for (const [res, amount] of Object.entries(cost)) {
      if ((player.resources[res] || 0) < amount) {
        return { success: false, error: `Not enough ${res}. Need ${amount}, have ${Math.floor(player.resources[res] || 0)}` };
      }
    }

    for (const [res, amount] of Object.entries(cost)) {
      player.resources[res] -= amount;
    }

    building.upgrading = true;
    building.upgradeCompleteTime = Date.now() + nextLevel.buildTime;

    return { success: true, buildTime: nextLevel.buildTime, completesAt: building.upgradeCompleteTime };
  }

  tickBuildings() {
    const now = Date.now();
    for (const player of this.players.values()) {
      for (const [buildingId, building] of Object.entries(player.starbase.buildings)) {
        if (building.upgrading && now >= building.upgradeCompleteTime) {
          building.level++;
          building.upgrading = false;
          building.upgradeCompleteTime = 0;
        }
      }
    }
  }

  // ----------------------------------------------------------
  // OFFICERS
  // ----------------------------------------------------------

  recruitOfficer(playerId, officerId) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Invalid player' };

    const officer = OFFICERS[officerId];
    if (!officer) return { success: false, error: 'Invalid officer' };

    if (player.officers.includes(officerId)) return { success: false, error: 'Already recruited' };

    // Check faction requirement
    if (officer.faction) {
      const rep = player.factionRep[officer.faction] || 0;
      if (rep < 1000) return { success: false, error: `Need Friendly status with ${FACTIONS[officer.faction].name}` };
    }

    // Check cost
    for (const [res, amount] of Object.entries(officer.recruitCost)) {
      if ((player.resources[res] || 0) < amount) {
        return { success: false, error: `Not enough ${res}. Need ${amount}, have ${Math.floor(player.resources[res] || 0)}` };
      }
    }

    for (const [res, amount] of Object.entries(officer.recruitCost)) {
      player.resources[res] -= amount;
    }

    player.officers.push(officerId);
    return { success: true, officerId };
  }

  assignOfficer(playerId, officerId, shipId) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Invalid player' };
    if (!player.officers.includes(officerId)) return { success: false, error: 'Officer not recruited' };

    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };

    // Unassign from any current ship
    for (const [sid, oid] of Object.entries(player.officerAssignments)) {
      if (oid === officerId) {
        delete player.officerAssignments[sid];
        const oldShip = this.ships.get(sid);
        if (oldShip) {
          oldShip.officerId = null;
          this.recalcShipStats(oldShip);
        }
      }
    }

    // Unassign current officer from target ship
    if (ship.officerId) {
      delete player.officerAssignments[shipId];
    }

    player.officerAssignments[shipId] = officerId;
    ship.officerId = officerId;
    this.recalcShipStats(ship);

    return { success: true };
  }

  unassignOfficer(playerId, shipId) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Invalid player' };

    const ship = this.ships.get(shipId);
    if (!ship || ship.playerId !== playerId) return { success: false, error: 'Invalid ship' };

    if (ship.officerId) {
      delete player.officerAssignments[shipId];
      ship.officerId = null;
      this.recalcShipStats(ship);
    }

    return { success: true };
  }

  activateAbility(playerId, shipId) {
    const player = this.players.get(playerId);
    const ship = this.ships.get(shipId);
    if (!player || !ship || ship.playerId !== playerId) return { success: false, error: 'Invalid' };
    if (!ship.officerId) return { success: false, error: 'No officer assigned' };

    const officer = OFFICERS[ship.officerId];
    if (!officer || !officer.active) return { success: false, error: 'No active ability' };

    const now = Date.now();
    if (now < ship.abilityCooldownUntil) {
      const remaining = Math.ceil((ship.abilityCooldownUntil - now) / 1000);
      return { success: false, error: `Cooldown: ${remaining}s remaining` };
    }

    // Apply the effect
    const effect = officer.active.effect;

    if (effect.type === 'shieldRestore') {
      ship.shields = Math.min(ship.maxShields, ship.shields + ship.maxShields * effect.value);
    } else if (effect.type === 'lastStand') {
      ship.hull = ship.maxHull;
      ship.armor = ship.maxArmor;
      ship.shields = ship.maxShields;
      ship.activeAbility = { effect, expiresAt: now + effect.duration };
    } else if (effect.duration) {
      ship.activeAbility = { effect, expiresAt: now + effect.duration };
    }

    ship.abilityCooldownUntil = now + officer.active.cooldown;

    return { success: true, abilityName: officer.active.name };
  }

  // ----------------------------------------------------------
  // MISSIONS
  // ----------------------------------------------------------

  acceptMission(playerId, missionId) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Invalid player' };

    const mission = MISSIONS[missionId];
    if (!mission) return { success: false, error: 'Invalid mission' };

    if (player.activeMissions[missionId]) return { success: false, error: 'Already active' };
    if (player.completedMissions.includes(missionId) && mission.type === 'story') {
      return { success: false, error: 'Already completed' };
    }

    // Faction mission rep check
    if (mission.faction) {
      const rep = player.factionRep[mission.faction] || 0;
      if (rep < 0) return { success: false, error: `Need Neutral or better with ${FACTIONS[mission.faction].name}` };
    }

    player.activeMissions[missionId] = { progress: 0 };
    return { success: true };
  }

  checkMissionProgress(playerId, eventType, amount) {
    const player = this.players.get(playerId);
    if (!player) return;

    for (const [missionId, missionState] of Object.entries(player.activeMissions)) {
      const mission = MISSIONS[missionId];
      if (!mission) continue;

      const obj = mission.objective;
      let matches = false;

      if (obj.type === eventType) matches = true;
      if (obj.type === 'mine_resource' && eventType === 'mine_resource' && obj.resource) {
        // handled specially in mining tick
        matches = false;
      }
      if (obj.type === 'mine' && eventType === 'mine') matches = true;
      if (obj.type === 'kill_npc_pvp' && eventType === 'kill_npc_pvp') matches = true;

      if (matches) {
        missionState.progress += amount;
        if (missionState.progress >= obj.amount) {
          this.completeMission(playerId, missionId);
        }
      }
    }
  }

  completeMission(playerId, missionId) {
    const player = this.players.get(playerId);
    if (!player) return;

    const mission = MISSIONS[missionId];
    if (!mission) return;

    // Award rewards
    for (const [key, amount] of Object.entries(mission.rewards)) {
      if (key === 'xp') continue; // xp not used as resource
      if (key === 'factionRep') {
        for (const [factionId, repAmount] of Object.entries(amount)) {
          player.factionRep[factionId] = (player.factionRep[factionId] || 0) + repAmount;
        }
      } else {
        player.resources[key] = (player.resources[key] || 0) + amount;
      }
    }

    delete player.activeMissions[missionId];
    player.completedMissions.push(missionId);

    // Chain: auto-accept next story mission
    if (mission.next && MISSIONS[mission.next]) {
      player.activeMissions[mission.next] = { progress: 0 };
    }
  }

  getAvailableMissions(playerId) {
    const player = this.players.get(playerId);
    if (!player) return [];

    const available = [];
    for (const [missionId, mission] of Object.entries(MISSIONS)) {
      // Skip if already active or completed (for story)
      if (player.activeMissions[missionId]) continue;
      if (player.completedMissions.includes(missionId) && mission.type === 'story') continue;

      // Daily missions: always available if not active
      if (mission.type === 'daily') {
        available.push({ ...mission, active: false });
        continue;
      }

      // Story missions: only show if it's the current chain step
      if (mission.type === 'story') {
        // Show if no prerequisite, or prerequisite is completed
        const isFirstStory = missionId === 'story_first_kill';
        const hasPredecessorCompleted = Object.values(MISSIONS).some(m =>
          m.next === missionId && player.completedMissions.includes(m.id)
        );
        if (isFirstStory || hasPredecessorCompleted) {
          available.push({ ...mission, active: false });
        }
        continue;
      }

      // Faction missions
      if (mission.type === 'faction') {
        if (mission.faction && (player.factionRep[mission.faction] || 0) >= 0) {
          available.push({ ...mission, active: false });
        }
      }
    }

    // Include active missions with progress
    for (const [missionId, state] of Object.entries(player.activeMissions)) {
      const mission = MISSIONS[missionId];
      if (mission) {
        available.push({ ...mission, active: true, progress: state.progress });
      }
    }

    return available;
  }

  // ----------------------------------------------------------
  // ALLIANCES
  // ----------------------------------------------------------

  createAlliance(playerId, name, tag) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Invalid player' };
    if (player.allianceId) return { success: false, error: 'Already in an alliance' };
    if (!name || name.length < 3 || name.length > 20) return { success: false, error: 'Name must be 3-20 characters' };
    if (!tag || tag.length < 2 || tag.length > 4) return { success: false, error: 'Tag must be 2-4 characters' };

    // Check unique tag
    for (const alliance of this.alliances.values()) {
      if (alliance.tag.toUpperCase() === tag.toUpperCase()) {
        return { success: false, error: 'Tag already taken' };
      }
    }

    const allianceId = uuidv4();
    const alliance = {
      id: allianceId,
      name,
      tag: tag.toUpperCase(),
      leaderId: playerId,
      officerIds: [],
      memberIds: [playerId],
      pendingInvites: [],
      territory: [],
      chatHistory: [],
      createdAt: Date.now(),
    };

    this.alliances.set(allianceId, alliance);
    player.allianceId = allianceId;

    return { success: true, alliance };
  }

  inviteToAlliance(playerId, targetPlayerName) {
    const player = this.players.get(playerId);
    if (!player || !player.allianceId) return { success: false, error: 'Not in an alliance' };

    const alliance = this.alliances.get(player.allianceId);
    if (!alliance) return { success: false, error: 'Alliance not found' };

    if (alliance.leaderId !== playerId && !alliance.officerIds.includes(playerId)) {
      return { success: false, error: 'Only leaders and officers can invite' };
    }

    // Find target player by name
    let targetPlayer = null;
    for (const p of this.players.values()) {
      if (p.name.toLowerCase() === targetPlayerName.toLowerCase()) {
        targetPlayer = p;
        break;
      }
    }

    if (!targetPlayer) return { success: false, error: 'Player not found' };
    if (targetPlayer.allianceId) return { success: false, error: 'Player already in an alliance' };
    if (alliance.pendingInvites.includes(targetPlayer.id)) return { success: false, error: 'Already invited' };

    alliance.pendingInvites.push(targetPlayer.id);
    return { success: true, targetPlayerId: targetPlayer.id };
  }

  acceptAllianceInvite(playerId, allianceId) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Invalid player' };
    if (player.allianceId) return { success: false, error: 'Already in an alliance' };

    const alliance = this.alliances.get(allianceId);
    if (!alliance) return { success: false, error: 'Alliance not found' };
    if (!alliance.pendingInvites.includes(playerId)) return { success: false, error: 'No invite found' };

    alliance.pendingInvites = alliance.pendingInvites.filter(id => id !== playerId);
    alliance.memberIds.push(playerId);
    player.allianceId = allianceId;

    return { success: true };
  }

  leaveAlliance(playerId) {
    const player = this.players.get(playerId);
    if (!player || !player.allianceId) return { success: false, error: 'Not in an alliance' };

    const alliance = this.alliances.get(player.allianceId);
    if (!alliance) { player.allianceId = null; return { success: true }; }

    alliance.memberIds = alliance.memberIds.filter(id => id !== playerId);
    alliance.officerIds = alliance.officerIds.filter(id => id !== playerId);

    if (alliance.leaderId === playerId) {
      // Transfer leadership or disband
      if (alliance.memberIds.length > 0) {
        alliance.leaderId = alliance.memberIds[0];
      } else {
        this.alliances.delete(alliance.id);
      }
    }

    player.allianceId = null;
    return { success: true };
  }

  allianceChat(playerId, message) {
    const player = this.players.get(playerId);
    if (!player || !player.allianceId) return { success: false, error: 'Not in an alliance' };

    const alliance = this.alliances.get(player.allianceId);
    if (!alliance) return { success: false, error: 'Alliance not found' };

    const chatMsg = {
      senderId: playerId,
      senderName: player.name,
      message: message.substring(0, 200), // limit length
      timestamp: Date.now(),
    };

    alliance.chatHistory.push(chatMsg);
    if (alliance.chatHistory.length > 100) alliance.chatHistory.shift();

    return { success: true, chatMsg };
  }

  getAllianceState(allianceId) {
    const alliance = this.alliances.get(allianceId);
    if (!alliance) return null;

    const members = alliance.memberIds.map(id => {
      const p = this.players.get(id);
      return p ? { id: p.id, name: p.name, role: id === alliance.leaderId ? 'leader' : (alliance.officerIds.includes(id) ? 'officer' : 'member') } : null;
    }).filter(Boolean);

    return {
      id: alliance.id,
      name: alliance.name,
      tag: alliance.tag,
      leaderId: alliance.leaderId,
      members,
      pendingInvites: alliance.pendingInvites.length,
      territory: alliance.territory,
      chatHistory: alliance.chatHistory.slice(-50),
    };
  }

  // ----------------------------------------------------------
  // GAME TICK
  // ----------------------------------------------------------

  tick() {
    const now = Date.now();

    this.npcTickCounter++;
    if (this.npcTickCounter % 5 === 0) {
      this.tickNpcAI(now);
    }

    // Building upgrades check (once per second)
    if (this.npcTickCounter % 20 === 0) {
      this.tickBuildings();
    }

    for (const ship of this.ships.values()) {
      if (ship.isDestroyed || ship.state === 'warping' || ship.state === 'docked' || ship.state === 'damaged') continue;

      // Expire active abilities
      if (ship.activeAbility && now >= ship.activeAbility.expiresAt) {
        ship.activeAbility = null;
      }

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
            let miningRate = ship.miningRate;

            // Refinery bonus
            const player = this.players.get(ship.playerId);
            if (player) {
              const refLevel = player.starbase.buildings.refinery.level;
              if (refLevel > 0) {
                miningRate *= (1 + BUILDING_TYPES.refinery.levels[refLevel - 1].effect.miningBonus);
              }
            }

            // Active ability mining multiplier
            if (ship.activeAbility && now < ship.activeAbility.expiresAt) {
              if (ship.activeAbility.effect.type === 'miningMultiplier') {
                miningRate *= ship.activeAbility.effect.value;
              }
            }

            const mined = (miningRate * node.richness) / TICK_RATE;
            ship.cargo[node.resource] = (ship.cargo[node.resource] || 0) + mined;

            // Mission tracking (once per second)
            if (this.npcTickCounter % 20 === 0 && player) {
              const minedThisSec = miningRate * node.richness;
              player.stats.totalMined += minedThisSec;
              this.checkMissionProgress(player.id, 'mine', minedThisSec);

              // Resource-specific tracking
              player.stats.minedByResource[node.resource] = (player.stats.minedByResource[node.resource] || 0) + minedThisSec;
              if (MISSIONS[Object.keys(player.activeMissions).find(mid => {
                const m = MISSIONS[mid];
                return m && m.objective.type === 'mine_resource' && m.objective.resource === node.resource;
              })]) {
                this.checkMissionProgress(player.id, 'mine_resource', minedThisSec);
              }
            }
          }
        }
      }

      // --- Combat ---
      if (ship.state === 'combat') {
        this.processCombat(ship, now);
      }
    }
  }

  // ----------------------------------------------------------
  // STATE SNAPSHOTS
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
      faction: system.faction || null,
      connections: system.connections,
      miningNodes: system.miningNodes,
      ships,
    };
  }

  getShipSnapshot(ship) {
    // Get alliance tag
    let allianceTag = null;
    if (!ship.isNpc) {
      const player = this.players.get(ship.playerId);
      if (player && player.allianceId) {
        const alliance = this.alliances.get(player.allianceId);
        if (alliance) allianceTag = alliance.tag;
      }
    }

    return {
      id: ship.id,
      playerId: ship.playerId,
      classId: ship.classId,
      className: ship.className,
      classType: ship.classType,
      combatRole: ship.combatRole || null,
      icon: ship.icon,
      color: ship.color,
      systemId: ship.systemId,
      x: ship.x, y: ship.y, angle: ship.angle,
      state: ship.state,
      hull: ship.hull, maxHull: ship.maxHull,
      armor: ship.armor, maxArmor: ship.maxArmor,
      shields: ship.shields, maxShields: ship.maxShields,
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
      officerId: ship.officerId || null,
      activeAbility: ship.activeAbility || null,
      abilityCooldownUntil: ship.abilityCooldownUntil || 0,
      allianceTag,
    };
  }

  getPlayerState(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;

    const ships = {};
    for (const shipId of player.shipIds) {
      const ship = this.ships.get(shipId);
      if (ship) ships[shipId] = this.getShipSnapshot(ship);
    }

    return {
      id: player.id,
      name: player.name,
      homeSystemId: player.homeSystemId,
      resources: { ...player.resources },
      starbase: JSON.parse(JSON.stringify(player.starbase)),
      shipIds: [...player.shipIds],
      ships,
      factionRep: { ...player.factionRep },
      officers: [...player.officers],
      officerAssignments: { ...player.officerAssignments },
      activeMissions: JSON.parse(JSON.stringify(player.activeMissions)),
      completedMissions: [...player.completedMissions],
      allianceId: player.allianceId,
      stats: { ...player.stats },
    };
  }

  getGalaxyMap() {
    return STAR_SYSTEMS.map(sys => {
      const systemState = this.systems.get(sys.id);
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
        x: sys.x, y: sys.y,
        type: sys.type,
        level: sys.level,
        color: sys.color,
        faction: sys.faction || null,
        connections: sys.connections,
        shipCount: systemState.ships.size,
        playerShips,
      };
    });
  }
}

module.exports = GameEngine;
