// ============================================================
// SPACE FLEET COMMAND — Main Server
// Express + Socket.io multiplayer server
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameEngine = require('./gameEngine');
const { SHIP_CLASSES, UPGRADE_TIERS, STAR_SYSTEMS } = require('./gameData');

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
