// ============================================================
// SPACE FLEET COMMAND — Main Server
// Express + Socket.io multiplayer server
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameEngine = require('./gameEngine');
const { SHIP_CLASSES, UPGRADE_TIERS, STAR_SYSTEMS, FACTIONS, BUILDING_TYPES, OFFICERS, OFFICER_RARITIES, MISSIONS } = require('./gameData');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Game engine
const engine = new GameEngine();
engine.start();

// Track which system each socket is viewing
const socketViews = new Map(); // socketId -> systemId

// ----------------------------------------------------------
// SOCKET.IO — Connection handling
// ----------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);

  // --- JOIN GAME ---
  socket.on('join', (data) => {
    const player = engine.createPlayer(socket.id, data.name);
    console.log(`[+] Player joined: ${player.name} (${player.id}) in ${player.homeSystemId}`);

    // Send initial state
    socket.emit('joined', {
      player: engine.getPlayerState(player.id),
      galaxy: engine.getGalaxyMap(),
      shipClasses: SHIP_CLASSES,
      upgradeTiers: UPGRADE_TIERS,
      factions: FACTIONS,
      buildingTypes: BUILDING_TYPES,
      officers: OFFICERS,
      officerRarities: OFFICER_RARITIES,
    });

    // Auto-view home system
    socketViews.set(socket.id, player.homeSystemId);
    socket.join(`system:${player.homeSystemId}`);
    socket.emit('systemState', engine.getSystemState(player.homeSystemId));

    // Broadcast to others
    io.emit('galaxyUpdate', engine.getGalaxyMap());
  });

  // --- VIEW SYSTEM ---
  socket.on('viewSystem', (systemId) => {
    const prevSystem = socketViews.get(socket.id);
    if (prevSystem) socket.leave(`system:${prevSystem}`);

    socketViews.set(socket.id, systemId);
    socket.join(`system:${systemId}`);
    socket.emit('systemState', engine.getSystemState(systemId));
  });

  // --- MOVE SHIP ---
  socket.on('moveShip', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    engine.moveShip(player.id, data.shipId, data.x, data.y);
  });

  // --- WARP SHIP ---
  socket.on('warpShip', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;

    const result = engine.warpShip(player.id, data.shipId, data.targetSystemId);
    socket.emit('warpResult', { shipId: data.shipId, ...result });

    if (result.success) {
      io.emit('galaxyUpdate', engine.getGalaxyMap());
      // After warp completes, update system views
      setTimeout(() => {
        io.emit('galaxyUpdate', engine.getGalaxyMap());
      }, 2100);
    }
  });

  // --- WARP SHIP TO (multi-hop) ---
  socket.on('warpShipTo', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;

    const result = engine.warpShipToSystem(player.id, data.shipId, data.targetSystemId);
    socket.emit('warpResult', { shipId: data.shipId, ...result });

    if (result.success) {
      io.emit('galaxyUpdate', engine.getGalaxyMap());
      // Update galaxy map after each hop and at final arrival
      const totalTime = (result.jumps * 2000) + ((result.jumps - 1) * 500);
      for (let i = 1; i <= result.jumps; i++) {
        setTimeout(() => io.emit('galaxyUpdate', engine.getGalaxyMap()), i * 2500);
      }
      setTimeout(() => io.emit('galaxyUpdate', engine.getGalaxyMap()), totalTime + 100);
    }
  });

  // --- START MINING ---
  socket.on('startMining', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.startMining(player.id, data.shipId, data.nodeName);
    socket.emit('miningResult', { shipId: data.shipId, ...result });
  });

  // --- DOCK SHIP ---
  socket.on('dockShip', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.dockShip(player.id, data.shipId);
    socket.emit('dockResult', { shipId: data.shipId, ...result });
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- ATTACK SHIP ---
  socket.on('attackShip', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.attackShip(player.id, data.attackerShipId, data.targetShipId);
    socket.emit('attackResult', result);
  });

  // --- BUILD SHIP ---
  socket.on('buildShip', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.buildShip(player.id, data.shipClassId);
    socket.emit('buildResult', result);
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
      io.emit('galaxyUpdate', engine.getGalaxyMap());
    }
  });

  // --- REPAIR SHIP ---
  socket.on('repairShip', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.repairShip(player.id, data.shipId);
    socket.emit('repairResult', { shipId: data.shipId, ...result });
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- UPGRADE SHIP ---
  socket.on('upgradeShip', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.upgradeShip(player.id, data.shipId, data.component);
    socket.emit('upgradeResult', { shipId: data.shipId, component: data.component, ...result });
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- UPGRADE BUILDING ---
  socket.on('upgradeBuilding', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.upgradeBuilding(player.id, data.buildingId);
    socket.emit('upgradeBuildingResult', result);
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- RECRUIT OFFICER ---
  socket.on('recruitOfficer', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.recruitOfficer(player.id, data.officerId);
    socket.emit('recruitOfficerResult', result);
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- ASSIGN OFFICER ---
  socket.on('assignOfficer', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.assignOfficer(player.id, data.officerId, data.shipId);
    socket.emit('assignOfficerResult', result);
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- UNASSIGN OFFICER ---
  socket.on('unassignOfficer', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.unassignOfficer(player.id, data.shipId);
    socket.emit('unassignOfficerResult', result);
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- ACTIVATE ABILITY ---
  socket.on('activateAbility', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.activateAbility(player.id, data.shipId);
    socket.emit('activateAbilityResult', result);
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- ACCEPT MISSION ---
  socket.on('acceptMission', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.acceptMission(player.id, data.missionId);
    socket.emit('acceptMissionResult', result);
    if (result.success) {
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- GET AVAILABLE MISSIONS ---
  socket.on('getMissions', () => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const missions = engine.getAvailableMissions(player.id);
    socket.emit('missionsList', missions);
  });

  // --- CREATE ALLIANCE ---
  socket.on('createAlliance', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.createAlliance(player.id, data.name, data.tag);
    socket.emit('createAllianceResult', result);
    if (result.success) {
      socket.join(`alliance:${result.allianceId}`);
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
    }
  });

  // --- INVITE TO ALLIANCE ---
  socket.on('inviteToAlliance', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.inviteToAlliance(player.id, data.targetPlayerName);
    socket.emit('inviteResult', result);
    if (result.success) {
      // Notify the invited player
      const targetPlayer = engine.getPlayerByName(data.targetPlayerName);
      if (targetPlayer) {
        io.to(targetPlayer.socketId).emit('allianceInvite', {
          allianceId: result.allianceId,
          allianceName: result.allianceName,
          fromPlayer: player.name,
        });
      }
    }
  });

  // --- ACCEPT ALLIANCE INVITE ---
  socket.on('acceptAllianceInvite', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.acceptAllianceInvite(player.id, data.allianceId);
    socket.emit('acceptInviteResult', result);
    if (result.success) {
      socket.join(`alliance:${data.allianceId}`);
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
      // Notify alliance members
      io.to(`alliance:${data.allianceId}`).emit('allianceUpdate', engine.getAllianceState(data.allianceId));
    }
  });

  // --- LEAVE ALLIANCE ---
  socket.on('leaveAlliance', () => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const allianceId = player.allianceId;
    const result = engine.leaveAlliance(player.id);
    socket.emit('leaveAllianceResult', result);
    if (result.success) {
      socket.leave(`alliance:${allianceId}`);
      socket.emit('playerUpdate', engine.getPlayerState(player.id));
      // Notify remaining members
      if (allianceId) {
        const allianceState = engine.getAllianceState(allianceId);
        if (allianceState) {
          io.to(`alliance:${allianceId}`).emit('allianceUpdate', allianceState);
        }
      }
    }
  });

  // --- ALLIANCE CHAT ---
  socket.on('allianceChat', (data) => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player) return;
    const result = engine.allianceChat(player.id, data.message);
    if (result.success) {
      io.to(`alliance:${player.allianceId}`).emit('allianceChatMessage', {
        from: player.name,
        message: data.message,
        timestamp: Date.now(),
      });
    }
  });

  // --- GET ALLIANCE STATE ---
  socket.on('getAlliance', () => {
    const player = engine.getPlayerBySocket(socket.id);
    if (!player || !player.allianceId) return;
    const state = engine.getAllianceState(player.allianceId);
    if (state) {
      socket.emit('allianceState', state);
    }
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    console.log(`[-] Client disconnected: ${socket.id}`);
    const player = engine.getPlayerBySocket(socket.id);
    if (player) {
      engine.removePlayer(player.id);
      io.emit('galaxyUpdate', engine.getGalaxyMap());
    }
    socketViews.delete(socket.id);
  });
});

// ----------------------------------------------------------
// GAME LOOP — Broadcast state updates
// ----------------------------------------------------------

setInterval(() => {
  // Send system state to all watchers
  for (const [socketId, systemId] of socketViews.entries()) {
    const state = engine.getSystemState(systemId);
    if (state) {
      io.to(socketId).emit('systemUpdate', state);
    }
  }

  // Send player updates
  for (const player of engine.players.values()) {
    io.to(player.socketId).emit('playerUpdate', engine.getPlayerState(player.id));
  }
}, 100); // 10 updates per second to clients

// ----------------------------------------------------------
// START SERVER
// ----------------------------------------------------------

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║       SPACE FLEET COMMAND SERVER         ║
  ║                                          ║
  ║   Running on http://localhost:${PORT}       ║
  ║                                          ║
  ║   Open in your browser to play!          ║
  ╚══════════════════════════════════════════╝
  `);
});
