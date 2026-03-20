// ============================================================
// GAME CLIENT — Socket.io connection, UI logic, input handling
// ============================================================

// --- Global State ---
let socket = null;
let renderer = null;
let playerState = null;
let galaxyData = [];
let currentSystemState = null;
let selectedShipId = null;
let currentView = 'system'; // 'galaxy' or 'system'
let shipClasses = {};
let upgradeTiers = {};
let factionData = {};
let buildingTypes = {};
let officerData = {};
let officerRarities = {};
let previousShipStates = {}; // Track ship states for damage detection

// --- Helper: get ship data from any source ---
function getShipData(shipId) {
  // Try current system view first (most up-to-date position data)
  if (currentSystemState) {
    const found = currentSystemState.ships.find(s => s.id === shipId);
    if (found) return found;
  }
  // Fall back to player state (has all owned ships regardless of system)
  if (playerState && playerState.ships && playerState.ships[shipId]) {
    return playerState.ships[shipId];
  }
  return null;
}

// --- Initialize ---
window.addEventListener('DOMContentLoaded', () => {
  renderer = new Renderer();
  renderer.drawLoginStars();

  document.getElementById('player-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinGame();
  });
});

// --- Join Game ---
function joinGame() {
  const nameInput = document.getElementById('player-name');
  const name = nameInput.value.trim() || 'Commander';

  socket = io();

  socket.on('connect', () => {
    socket.emit('join', { name });
  });

  // --- Socket Event Handlers ---

  socket.on('joined', (data) => {
    playerState = data.player;
    galaxyData = data.galaxy;
    shipClasses = data.shipClasses;
    upgradeTiers = data.upgradeTiers;
    factionData = data.factions || {};
    buildingTypes = data.buildingTypes || {};
    officerData = data.officers || {};
    officerRarities = data.officerRarities || {};

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    document.getElementById('player-name-display').textContent = playerState.name;

    updateResourceDisplay();
    updateShipList();
    updateAllianceTag();
    showSystemView();
    addLog('Welcome, ' + playerState.name + '! Your fleet awaits.', 'info');
    addLog('Left-click ships to select. Right-click for actions.', 'info');

    requestAnimationFrame(gameLoop);
  });

  socket.on('systemState', (state) => {
    currentSystemState = state;
    updateSystemOverlay();
  });

  socket.on('systemUpdate', (state) => {
    currentSystemState = state;
  });

  socket.on('playerUpdate', (state) => {
    // Detect ships that just became damaged (returned to starbase)
    if (state.ships && playerState && playerState.ships) {
      for (const [shipId, ship] of Object.entries(state.ships)) {
        const prevState = previousShipStates[shipId];
        if (ship.state === 'damaged' && prevState && prevState !== 'damaged') {
          addLog(`${ship.className} was destroyed and returned to starbase! Repair needed.`, 'combat');
          showEventBanner(`${ship.className} DESTROYED - Returned to Starbase`);
          // Auto-switch to home system view so they can see it
          if (currentSystemState && currentSystemState.id !== state.homeSystemId) {
            socket.emit('viewSystem', state.homeSystemId);
          }
        }
      }
    }
    // Update previous states for next comparison
    if (state.ships) {
      previousShipStates = {};
      for (const [shipId, ship] of Object.entries(state.ships)) {
        previousShipStates[shipId] = ship.state;
      }
    }

    playerState = state;
    updateResourceDisplay();
    updateShipList();
    updateAllianceTag();
    // Refresh ship info panel if a ship is selected
    if (selectedShipId) updateShipInfoPanel();
  });

  socket.on('galaxyUpdate', (data) => {
    galaxyData = data;
  });

  socket.on('warpResult', (data) => {
    if (data.success) {
      const jumps = data.jumps || 1;
      const dest = data.arrivalSystem.replace(/_/g, ' ');
      addLog(`Warping to ${dest} (${jumps} jump${jumps > 1 ? 's' : ''})...`, 'warp');
      const arrivalTime = jumps > 1 ? (jumps * 2500) + 100 : 2100;
      setTimeout(() => {
        socket.emit('viewSystem', data.arrivalSystem);
      }, arrivalTime);
    } else {
      addLog(`Warp failed: ${data.error}`, 'warning');
    }
  });

  socket.on('miningResult', (data) => {
    if (data.success) {
      addLog(data.message, 'mining');
    } else {
      addLog(`Mining failed: ${data.error}`, 'warning');
    }
  });

  socket.on('dockResult', (data) => {
    if (data.success) {
      addLog('Ship docked. Cargo transferred. Ship repaired.', 'info');
    } else {
      addLog(`Dock failed: ${data.error}`, 'warning');
    }
  });

  socket.on('repairResult', (data) => {
    if (data.success) {
      addLog('Ship repaired and ready for duty!', 'info');
      updateShipInfoPanel();
    } else {
      addLog(`Repair failed: ${data.error}`, 'warning');
    }
  });

  socket.on('attackResult', (data) => {
    if (data.success) {
      addLog('Engaging target!', 'combat');
    } else {
      addLog(`Attack failed: ${data.error}`, 'warning');
    }
  });

  socket.on('buildResult', (data) => {
    if (data.success) {
      addLog(`${data.ship.className} built and docked at starbase.`, 'info');
      closeSidePanel();
    } else {
      addLog(`Build failed: ${data.error}`, 'warning');
    }
  });

  socket.on('upgradeResult', (data) => {
    if (data.success) {
      addLog(`${data.component} upgraded to tier ${data.tier}!`, 'info');
      if (selectedShipId) updateShipInfoPanel();
      openUpgradeMenu();
    } else {
      addLog(`Upgrade failed: ${data.error}`, 'warning');
    }
  });

  // --- New System Socket Handlers ---

  socket.on('upgradeBuildingResult', (data) => {
    if (data.success) {
      addLog(`${data.buildingId.replace(/_/g, ' ')} upgrade started!`, 'info');
      showEventBanner('Building upgrade started!');
      openBuildingsPanel();
    } else {
      addLog(`Building upgrade failed: ${data.error}`, 'warning');
    }
  });

  socket.on('recruitOfficerResult', (data) => {
    if (data.success) {
      addLog(`Officer recruited!`, 'info');
      showEventBanner('New officer recruited!');
      openOfficersPanel();
    } else {
      addLog(`Recruit failed: ${data.error}`, 'warning');
    }
  });

  socket.on('assignOfficerResult', (data) => {
    if (data.success) {
      addLog('Officer assigned to ship.', 'info');
      openOfficersPanel();
    } else {
      addLog(`Assign failed: ${data.error}`, 'warning');
    }
  });

  socket.on('unassignOfficerResult', (data) => {
    if (data.success) {
      addLog('Officer unassigned.', 'info');
      openOfficersPanel();
    } else {
      addLog(`Unassign failed: ${data.error}`, 'warning');
    }
  });

  socket.on('activateAbilityResult', (data) => {
    if (data.success) {
      addLog(`Captain maneuver activated!`, 'combat');
      showEventBanner('Captain Maneuver Activated!');
    } else {
      addLog(`Ability failed: ${data.error}`, 'warning');
    }
  });

  socket.on('acceptMissionResult', (data) => {
    if (data.success) {
      addLog('Mission accepted!', 'info');
      openMissionsPanel();
    } else {
      addLog(`Mission failed: ${data.error}`, 'warning');
    }
  });

  socket.on('missionsList', (data) => {
    renderMissionsList(data);
  });

  socket.on('createAllianceResult', (data) => {
    if (data.success) {
      addLog(`Alliance created!`, 'info');
      showEventBanner('Alliance Founded!');
      openAlliancePanel();
    } else {
      addLog(`Create alliance failed: ${data.error}`, 'warning');
    }
  });

  socket.on('inviteResult', (data) => {
    if (data.success) {
      addLog(`Invitation sent!`, 'info');
    } else {
      addLog(`Invite failed: ${data.error}`, 'warning');
    }
  });

  socket.on('allianceInvite', (data) => {
    addLog(`Alliance invite from ${data.fromPlayer}: ${data.allianceName}`, 'info');
    showEventBanner(`Alliance invite: ${data.allianceName}!`);
    // Auto-show accept option
    if (confirm(`${data.fromPlayer} invited you to join ${data.allianceName}. Accept?`)) {
      socket.emit('acceptAllianceInvite', { allianceId: data.allianceId });
    }
  });

  socket.on('acceptInviteResult', (data) => {
    if (data.success) {
      addLog('Joined alliance!', 'info');
      showEventBanner('Alliance Joined!');
      openAlliancePanel();
    } else {
      addLog(`Join failed: ${data.error}`, 'warning');
    }
  });

  socket.on('leaveAllianceResult', (data) => {
    if (data.success) {
      addLog('Left alliance.', 'info');
      openAlliancePanel();
    } else {
      addLog(`Leave failed: ${data.error}`, 'warning');
    }
  });

  socket.on('allianceChatMessage', (data) => {
    addAllianceChatMessage(data.from, data.message);
  });

  socket.on('allianceUpdate', (data) => {
    // Refresh alliance panel if open
    const title = document.getElementById('side-panel-title');
    if (title && title.textContent === 'ALLIANCE') {
      openAlliancePanel();
    }
  });

  socket.on('allianceState', (data) => {
    renderAllianceState(data);
  });
}

// --- Game Loop ---
function gameLoop() {
  if (currentView === 'galaxy') {
    renderer.drawGalaxyMap(galaxyData, playerState?.homeSystemId, playerState?.id);
  } else {
    renderer.drawSystemView(currentSystemState, playerState?.id, selectedShipId, playerState?.homeSystemId);
  }
  requestAnimationFrame(gameLoop);
}

// --- View Switching ---
function showGalaxyView() {
  currentView = 'galaxy';
  document.getElementById('galaxy-canvas').style.display = 'block';
  document.getElementById('system-canvas').style.display = 'none';
  document.getElementById('btn-galaxy-view').classList.add('active');
  document.getElementById('btn-system-view').classList.remove('active');
  document.getElementById('system-info-overlay').style.display = 'none';
  document.getElementById('faction-label').style.display = 'none';
  closeContextMenu();
}

function showSystemView() {
  currentView = 'system';
  document.getElementById('galaxy-canvas').style.display = 'none';
  document.getElementById('system-canvas').style.display = 'block';
  document.getElementById('btn-galaxy-view').classList.remove('active');
  document.getElementById('btn-system-view').classList.add('active');
  updateSystemOverlay();
  closeContextMenu();
}

// Faction colors for display
const FACTION_COLORS = {
  solari: '#E74C3C',
  nexari: '#3498DB',
  aurani: '#F1C40F',
};

const FACTION_NAMES = {
  solari: 'Solari Dominion',
  nexari: 'Nexari Collective',
  aurani: 'Aurani Trade Syndicate',
};

function updateSystemOverlay() {
  if (!currentSystemState) return;
  const overlay = document.getElementById('system-info-overlay');
  overlay.style.display = 'block';
  document.getElementById('system-info-name').textContent = currentSystemState.name;
  const typeEl = document.getElementById('system-info-type');
  typeEl.textContent = currentSystemState.type === 'safe' ? 'SAFE ZONE' : 'DANGER ZONE - PVP';
  typeEl.className = currentSystemState.type;
  const npcCount = currentSystemState.ships.filter(s => s.isNpc).length;
  const playerCount = currentSystemState.ships.filter(s => !s.isNpc).length;
  document.getElementById('system-info-details').textContent =
    `Level ${currentSystemState.level} • ${playerCount} players • ${npcCount} hostiles • ${currentSystemState.miningNodes.length} planets`;

  // Show faction territory
  const factionEl = document.getElementById('system-info-faction');
  const factionLabel = document.getElementById('faction-label');
  if (currentSystemState.faction) {
    const fName = FACTION_NAMES[currentSystemState.faction] || currentSystemState.faction;
    const fColor = FACTION_COLORS[currentSystemState.faction] || '#7f8c8d';
    factionEl.textContent = fName + ' Territory';
    factionEl.style.color = fColor;
    factionEl.style.display = 'block';
    factionLabel.textContent = fName;
    factionLabel.style.color = fColor;
    factionLabel.style.borderColor = fColor;
    factionLabel.style.display = 'block';
  } else {
    factionEl.style.display = 'none';
    factionLabel.style.display = 'none';
  }
}

// --- Alliance Tag ---
function updateAllianceTag() {
  const el = document.getElementById('alliance-tag-display');
  if (playerState && playerState.allianceId) {
    el.textContent = '[' + (playerState.allianceTag || 'ALY') + ']';
  } else {
    el.textContent = '';
  }
}

// --- Resource Display ---
function updateResourceDisplay() {
  if (!playerState) return;
  document.getElementById('res-stellite').textContent = formatNum(playerState.resources.stellite);
  document.getElementById('res-ferronite').textContent = formatNum(playerState.resources.ferronite);
  document.getElementById('res-nexium').textContent = formatNum(playerState.resources.nexium);
  document.getElementById('res-pyrathium').textContent = formatNum(playerState.resources.pyrathium);
  document.getElementById('res-aurelium').textContent = formatNum(playerState.resources.aurelium);
}

function formatNum(n) {
  if (n === undefined || n === null) return '0';
  n = Math.floor(n);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// --- Ship List ---
function updateShipList() {
  if (!playerState) return;
  const container = document.getElementById('ship-list');
  container.innerHTML = '';

  for (const shipId of playerState.shipIds) {
    const shipData = getShipData(shipId);

    const div = document.createElement('div');
    div.className = 'ship-item' + (shipId === selectedShipId ? ' selected' : '');
    div.onclick = () => selectShip(shipId);

    const icon = document.createElement('span');
    icon.className = 'ship-icon';
    icon.textContent = shipData ? shipData.icon : '?';
    if (shipData) icon.style.color = shipData.color;

    const name = document.createElement('span');
    name.className = 'ship-name';
    name.textContent = shipData ? shipData.className : 'Ship';

    const state = document.createElement('span');
    state.className = 'ship-state';
    if (shipData) {
      state.textContent = shipData.state;
      state.classList.add(shipData.state);
    }

    div.appendChild(icon);
    div.appendChild(name);
    div.appendChild(state);

    // Add quick repair button for damaged ships
    if (shipData && shipData.state === 'damaged') {
      div.classList.add('ship-damaged');
      const repairBtn = document.createElement('button');
      repairBtn.className = 'ship-repair-btn';
      repairBtn.textContent = 'REPAIR';
      repairBtn.onclick = (e) => { e.stopPropagation(); repairShip(shipId); };
      div.appendChild(repairBtn);
    }

    container.appendChild(div);
  }
}

function selectShip(shipId) {
  selectedShipId = shipId;
  updateShipList();
  updateShipInfoPanel();

  // If the ship is in a different system, auto-switch to view it
  const ship = getShipData(shipId);
  if (ship && currentSystemState && ship.systemId !== currentSystemState.id) {
    socket.emit('viewSystem', ship.systemId);
    if (currentView === 'galaxy') showSystemView();
  }
}

function updateShipInfoPanel() {
  const panel = document.getElementById('ship-info-panel');
  if (!selectedShipId) {
    panel.style.display = 'none';
    return;
  }

  const ship = getShipData(selectedShipId);
  if (!ship) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  // Show combat role badge in title
  let titleHtml = ship.className;
  if (ship.combatRole) {
    titleHtml += ` <span class="combat-role-badge ${ship.combatRole}">${ship.combatRole}</span>`;
  }
  document.getElementById('ship-info-title').innerHTML = titleHtml;

  const stats = document.getElementById('ship-stats');
  const hullPct = Math.round((ship.hull / ship.maxHull) * 100);
  const totalCargo = Math.floor(Object.values(ship.cargo || {}).reduce((a, b) => a + b, 0));

  // Officer info
  let officerInfo = '--';
  if (ship.officerId && playerState.officers) {
    const off = playerState.officers.find(o => o === ship.officerId);
    if (off && officerData[off]) {
      officerInfo = officerData[off].name;
    }
  }

  stats.innerHTML = `
    <div class="stat-row"><span>Hull</span><span class="stat-val ${hullPct > 60 ? 'high' : hullPct > 30 ? 'mid' : 'low'}">${Math.floor(ship.hull)}/${ship.maxHull}</span></div>
    <div class="stat-row"><span>Armor</span><span class="stat-val">${Math.floor(ship.armor)}/${ship.maxArmor}</span></div>
    <div class="stat-row"><span>Shields</span><span class="stat-val">${Math.floor(ship.shields)}/${ship.maxShields}</span></div>
    <div class="stat-row"><span>Lasers</span><span class="stat-val">${ship.laserDamage} dmg</span></div>
    <div class="stat-row"><span>Torpedoes</span><span class="stat-val">${ship.torpedoDamage} dmg</span></div>
    <div class="stat-row"><span>Fire Rate</span><span class="stat-val">${ship.fireRate}/s</span></div>
    <div class="stat-row"><span>Speed</span><span class="stat-val">${ship.speed}</span></div>
    <div class="stat-row"><span>Warp</span><span class="stat-val">${ship.warpRange}</span></div>
    <div class="stat-row"><span>Cargo</span><span class="stat-val">${totalCargo}/${ship.maxCargo}</span></div>
    <div class="stat-row"><span>State</span><span class="stat-val">${ship.state}</span></div>
    <div class="stat-row"><span>Kills</span><span class="stat-val">${ship.kills || 0}</span></div>
    <div class="stat-row"><span>Power</span><span class="stat-val ${ship.powerBonus > 0 ? 'high' : ''}">${ship.powerBonus ? '+' + Math.round(ship.powerBonus * 100) + '%' : '--'}</span></div>
  `;

  const actions = document.getElementById('ship-actions');
  let actionsHtml = '';

  if (ship.state === 'damaged') {
    actionsHtml += `<button class="action-btn danger" onclick="repairShip('${ship.id}')">Repair</button>`;
  } else {
    if (playerState && ship.systemId === playerState.homeSystemId) {
      actionsHtml += `<button class="action-btn" onclick="dockShip('${ship.id}')">Dock</button>`;
    }
    actionsHtml += `<button class="action-btn" onclick="showGalaxyView(); addLog('Click a star to warp ${ship.className} there.', 'info')">Warp</button>`;
    if (ship.miningRate > 0 && currentSystemState && currentSystemState.miningNodes.length > 0 && ship.systemId === currentSystemState.id) {
      actionsHtml += `<button class="action-btn" onclick="showMiningMenu('${ship.id}')">Mine</button>`;
    }
    if (ship.state === 'mining' || ship.state === 'moving') {
      actionsHtml += `<button class="action-btn" onclick="stopShip('${ship.id}')">Stop</button>`;
    }
    actionsHtml += `<button class="action-btn" onclick="recallShip('${ship.id}')">Recall</button>`;
    // Active ability button
    if (ship.officerId) {
      actionsHtml += `<button class="action-btn" style="color:#e67e22;border-color:rgba(230,126,34,0.3);" onclick="activateAbility('${ship.id}')">Maneuver</button>`;
    }
  }

  actions.innerHTML = actionsHtml;
}

// --- Canvas Click Handling ---

document.addEventListener('DOMContentLoaded', () => {
  const systemCanvas = document.getElementById('system-canvas');

  // LEFT CLICK — select own ships, move selected ship, or click starbase
  systemCanvas.addEventListener('click', (e) => {
    if (currentView !== 'system' || !currentSystemState) return;
    closeContextMenu();

    const rect = systemCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (systemCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (systemCanvas.height / rect.height);

    // Check if clicking on starbase (drawn at center-bottom of home system)
    if (playerState && currentSystemState.id === playerState.homeSystemId) {
      const sbX = 400, sbY = 520;
      const dx = x - sbX, dy = y - sbY;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        openStarbase();
        return;
      }
    }

    // Check if clicking on a ship
    for (const ship of currentSystemState.ships) {
      const dx = x - ship.x;
      const dy = y - ship.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        if (ship.playerId === playerState.id) {
          selectShip(ship.id);
        } else if (selectedShipId) {
          socket.emit('attackShip', {
            attackerShipId: selectedShipId,
            targetShipId: ship.id,
          });
        }
        return;
      }
    }

    // Move selected ship to click location
    if (selectedShipId) {
      const ship = getShipData(selectedShipId);
      if (ship && ship.systemId === currentSystemState.id && ship.state !== 'damaged') {
        socket.emit('moveShip', { shipId: selectedShipId, x, y });
      }
    }
  });

  // RIGHT CLICK — context menu on ships
  systemCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (currentView !== 'system' || !currentSystemState) return;

    const rect = systemCanvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (systemCanvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (systemCanvas.height / rect.height);

    // Find ship under cursor
    for (const ship of currentSystemState.ships) {
      const dx = canvasX - ship.x;
      const dy = canvasY - ship.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        showContextMenu(e.clientX, e.clientY, ship);
        return;
      }
    }

    closeContextMenu();
  });

  // Galaxy canvas — single click: warp selected ship or view system
  const galaxyCanvas = document.getElementById('galaxy-canvas');
  galaxyCanvas.addEventListener('click', (e) => {
    if (currentView !== 'galaxy') return;

    const rect = galaxyCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (galaxyCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (galaxyCanvas.height / rect.height);

    const sys = renderer.getGalaxySystemAt(x, y, galaxyData);
    if (!sys) return;

    if (selectedShipId) {
      socket.emit('warpShipTo', { shipId: selectedShipId, targetSystemId: sys.id });
    } else {
      socket.emit('viewSystem', sys.id);
      showSystemView();
      addLog(`Viewing ${sys.name} system. Select a ship first to warp.`, 'info');
    }
  });

  // Double-click galaxy — always view system
  galaxyCanvas.addEventListener('dblclick', (e) => {
    if (currentView !== 'galaxy') return;

    const rect = galaxyCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (galaxyCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (galaxyCanvas.height / rect.height);

    const sys = renderer.getGalaxySystemAt(x, y, galaxyData);
    if (sys) {
      socket.emit('viewSystem', sys.id);
      showSystemView();
    }
  });

  // Close context menu on click anywhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
      closeContextMenu();
    }
  });

  // Alliance chat enter key
  document.getElementById('alliance-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAllianceChat();
  });
});

// --- Context Menu (STFC-style right-click on ships) ---

function showContextMenu(screenX, screenY, ship) {
  closeContextMenu();
  const isOwn = ship.playerId === playerState.id;
  const isNpc = ship.isNpc;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = screenX + 'px';
  menu.style.top = screenY + 'px';

  // Header with combat role
  const header = document.createElement('div');
  header.className = 'ctx-header';
  header.style.color = ship.color;
  let headerText = `${ship.icon} ${ship.className}`;
  if (isNpc) headerText += ' (Hostile)';
  if (ship.combatRole) headerText += ` [${ship.combatRole.toUpperCase()}]`;
  if (ship.allianceTag) headerText = `[${ship.allianceTag}] ` + headerText;
  header.textContent = headerText;
  menu.appendChild(header);

  // Show combat advantage hint if we have a ship selected
  if (!isOwn && selectedShipId) {
    const myShip = getShipData(selectedShipId);
    if (myShip && myShip.combatRole && ship.combatRole) {
      const adv = getCombatAdvantageLabel(myShip.combatRole, ship.combatRole);
      if (adv) {
        addCtxOption(menu, adv, null, true);
      }
    }
  }

  if (isOwn) {
    // Own ship actions
    if (ship.state === 'damaged') {
      addCtxOption(menu, 'Repair', () => repairShip(ship.id));
    } else {
      addCtxOption(menu, 'Select', () => selectShip(ship.id));
      if (playerState && ship.systemId === playerState.homeSystemId) {
        addCtxOption(menu, 'Dock at Starbase', () => dockShip(ship.id));
      }
      addCtxOption(menu, 'Warp...', () => { selectShip(ship.id); showGalaxyView(); addLog('Click a star to warp there.', 'info'); });
      if (ship.miningRate > 0 && currentSystemState && currentSystemState.miningNodes.length > 0) {
        addCtxOption(menu, 'Mine...', () => showMiningMenu(ship.id));
      }
      if (ship.state === 'mining' || ship.state === 'moving' || ship.state === 'combat') {
        addCtxOption(menu, 'Stop', () => stopShip(ship.id));
      }
      addCtxOption(menu, 'Recall to Base', () => recallShip(ship.id));
      if (ship.officerId) {
        addCtxOption(menu, 'Captain Maneuver', () => activateAbility(ship.id));
      }
    }
  } else {
    // Enemy / NPC actions
    if (selectedShipId) {
      addCtxOption(menu, 'Attack', () => {
        socket.emit('attackShip', { attackerShipId: selectedShipId, targetShipId: ship.id });
      });
    } else {
      addCtxOption(menu, 'Select a ship first to attack', null, true);
    }
    // Show stats
    addCtxOption(menu, `Hull: ${Math.floor(ship.hull)}/${ship.maxHull}`, null, true);
    addCtxOption(menu, `Shields: ${Math.floor(ship.shields)}/${ship.maxShields}`, null, true);
  }

  document.body.appendChild(menu);

  // Keep menu on screen
  const menuRect = menu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) menu.style.left = (screenX - menuRect.width) + 'px';
  if (menuRect.bottom > window.innerHeight) menu.style.top = (screenY - menuRect.height) + 'px';
}

function getCombatAdvantageLabel(myRole, theirRole) {
  const advantages = { explorer: 'interceptor', interceptor: 'battleship', battleship: 'explorer' };
  if (advantages[myRole] === theirRole) {
    return '>> ADVANTAGE (1.5x damage) <<';
  }
  if (advantages[theirRole] === myRole) {
    return '!! DISADVANTAGE (0.7x damage) !!';
  }
  return null;
}

function addCtxOption(menu, label, onclick, disabled) {
  const opt = document.createElement('div');
  opt.className = 'ctx-option' + (disabled ? ' disabled' : '');
  opt.textContent = label;
  if (onclick && !disabled) {
    opt.onclick = () => { onclick(); closeContextMenu(); };
  }
  menu.appendChild(opt);
}

function closeContextMenu() {
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();
}

// --- Ship Actions ---

function dockShip(shipId) {
  socket.emit('dockShip', { shipId });
}

function stopShip(shipId) {
  const ship = getShipData(shipId);
  if (ship) {
    socket.emit('moveShip', { shipId, x: ship.x, y: ship.y });
  }
}

function repairShip(shipId) {
  socket.emit('repairShip', { shipId });
}

function recallShip(shipId) {
  if (!playerState) return;
  const ship = getShipData(shipId);
  if (!ship) return;
  if (ship.systemId === playerState.homeSystemId) {
    dockShip(shipId);
  } else {
    socket.emit('warpShipTo', { shipId, targetSystemId: playerState.homeSystemId });
  }
}

function activateAbility(shipId) {
  socket.emit('activateAbility', { shipId });
}

function showMiningMenu(shipId) {
  if (!currentSystemState) return;

  const existing = document.querySelector('.warp-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'warp-menu';
  menu.style.left = '50%';
  menu.style.top = '50%';
  menu.style.transform = 'translate(-50%, -50%)';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:13px;color:#27ae60;margin-bottom:8px;text-align:center;letter-spacing:1px;';
  title.textContent = 'MINE AT';
  menu.appendChild(title);

  for (const node of currentSystemState.miningNodes) {
    const opt = document.createElement('div');
    opt.className = 'warp-option';
    opt.textContent = `${node.name} (${node.resource})`;
    opt.onclick = () => {
      socket.emit('startMining', { shipId, nodeName: node.name });
      menu.remove();
    };
    menu.appendChild(opt);
  }

  const closeBtn = document.createElement('div');
  closeBtn.className = 'warp-option';
  closeBtn.style.color = '#e74c3c';
  closeBtn.style.textAlign = 'center';
  closeBtn.textContent = 'Cancel';
  closeBtn.onclick = () => menu.remove();
  menu.appendChild(closeBtn);

  document.getElementById('game-area').appendChild(menu);
}

// --- Starbase (opens full screen) ---

function openStarbase() {
  openStarbaseScreen();
}

// --- Side Panel: Build Ships ---

function openBuildMenu() {
  const panel = document.getElementById('side-panel');
  panel.style.display = 'flex';
  document.getElementById('side-panel-title').textContent = 'BUILD SHIPS';

  const content = document.getElementById('side-panel-content');
  let html = '';

  for (const [classId, sc] of Object.entries(shipClasses)) {
    // Check faction requirement
    let factionLocked = false;
    let factionReqText = '';
    if (sc.faction && playerState.factionRep) {
      const rep = playerState.factionRep[sc.faction] || 0;
      const reqRep = sc.factionRepRequired || 0;
      if (rep < reqRep) {
        factionLocked = true;
        const fName = FACTION_NAMES[sc.faction] || sc.faction;
        factionReqText = `Requires ${fName} rep: ${reqRep}`;
      }
    }

    html += `<div class="build-item">
      <div class="build-item-header">
        <span class="build-item-name" style="color:${sc.color}">${sc.icon} ${sc.name}</span>
        <span class="build-item-class">${sc.class}${sc.combatRole ? ' · ' + sc.combatRole : ''}</span>
      </div>
      <div class="build-item-desc">${sc.description}</div>`;

    if (factionLocked) {
      html += `<div class="officer-faction-req">${factionReqText}</div>`;
    }

    html += '<div class="build-item-cost">';
    let canAfford = true;
    for (const [res, amount] of Object.entries(sc.cost)) {
      const have = playerState.resources[res] || 0;
      const sufficient = have >= amount;
      if (!sufficient) canAfford = false;
      html += `<span class="cost-entry ${sufficient ? '' : 'insufficient'}">${res}: ${amount}</span>`;
    }

    const buildDisabled = !canAfford || factionLocked;
    html += `</div>
      <button class="build-btn" ${buildDisabled ? 'disabled' : ''} onclick="buildShip('${classId}')">BUILD</button>
    </div>`;
  }

  content.innerHTML = html;
}

function buildShip(classId) {
  socket.emit('buildShip', { shipClassId: classId });
}

// --- Side Panel: Upgrade Ship ---

function openUpgradeMenu() {
  if (!selectedShipId) {
    addLog('Select a ship first to upgrade.', 'warning');
    return;
  }

  const ship = getShipData(selectedShipId);
  if (!ship || ship.playerId !== playerState.id) {
    addLog('Select one of your ships to upgrade.', 'warning');
    return;
  }

  const panel = document.getElementById('side-panel');
  panel.style.display = 'flex';
  document.getElementById('side-panel-title').textContent = `UPGRADE: ${ship.className}`;

  const content = document.getElementById('side-panel-content');
  let html = '';

  const components = ['armor', 'shields', 'lasers', 'torpedoes', 'cargo', 'warp'];
  const componentNames = { armor: 'Armor', shields: 'Shields', lasers: 'Lasers', torpedoes: 'Torpedoes', cargo: 'Cargo', warp: 'Warp Drive' };

  for (const comp of components) {
    const currentTier = ship.upgrades[comp];
    const tiers = upgradeTiers[comp];
    const isMaxed = currentTier >= 10;

    html += `<div class="upgrade-item">
      <div class="upgrade-item-header">
        <span class="build-item-name">${componentNames[comp]}</span>
        <span class="build-item-class">Tier ${currentTier}/10</span>
      </div>
      <div class="tier-display">`;

    for (let i = 1; i <= 10; i++) {
      html += `<div class="tier-pip ${i <= currentTier ? 'filled' : ''}"></div>`;
    }
    html += '</div>';

    if (!isMaxed) {
      const nextTier = tiers[currentTier];
      html += '<div class="build-item-cost">';
      let canAfford = true;
      for (const [res, amount] of Object.entries(nextTier.cost)) {
        const have = playerState.resources[res] || 0;
        const sufficient = have >= amount;
        if (!sufficient) canAfford = false;
        html += `<span class="cost-entry ${sufficient ? '' : 'insufficient'}">${res}: ${amount}</span>`;
      }
      html += '</div>';
      html += `<button class="upgrade-btn" ${canAfford ? '' : 'disabled'} onclick="upgradeShip('${ship.id}', '${comp}')">UPGRADE TO TIER ${currentTier + 1}</button>`;
    } else {
      html += '<div style="color:#2ecc71;font-size:11px;margin-top:4px;">MAX TIER</div>';
    }

    html += '</div>';
  }

  content.innerHTML = html;
}

function upgradeShip(shipId, component) {
  socket.emit('upgradeShip', { shipId, component });
}

// --- Buildings (opens starbase screen) ---

function openBuildingsPanel() {
  openStarbaseScreen();
}

function upgradeBuilding(buildingId) {
  socket.emit('upgradeBuilding', { buildingId });
}

function formatTime(seconds) {
  if (seconds < 60) return seconds + 's';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
  return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
}

// --- Side Panel: Officers ---

function openOfficersPanel() {
  const panel = document.getElementById('side-panel');
  panel.style.display = 'flex';
  document.getElementById('side-panel-title').textContent = 'OFFICERS';

  const content = document.getElementById('side-panel-content');

  // Tabs: My Officers | Recruit
  let html = `<div class="panel-tabs">
    <button class="panel-tab active" onclick="showMyOfficers()">My Officers</button>
    <button class="panel-tab" onclick="showRecruitOfficers()">Recruit</button>
  </div>`;
  html += '<div id="officers-tab-content"></div>';
  content.innerHTML = html;
  showMyOfficers();
}

function showMyOfficers() {
  // Update tab state
  const tabs = document.querySelectorAll('.panel-tab');
  tabs.forEach((t, i) => t.classList.toggle('active', i === 0));

  const container = document.getElementById('officers-tab-content');
  let html = '';

  const myOfficers = playerState.officers || [];
  const assignments = playerState.officerAssignments || {};

  if (myOfficers.length === 0) {
    html += '<div style="color:#7f8c8d;font-size:12px;padding:20px;text-align:center;">No officers recruited yet. Visit the Recruit tab to hire officers.</div>';
  }

  for (const offId of myOfficers) {
    const off = officerData[offId];
    if (!off) continue;

    const rarity = off.rarity || 'common';
    const assignedShipId = Object.entries(assignments).find(([sid, oid]) => oid === offId)?.[0];
    const assignedShip = assignedShipId ? getShipData(assignedShipId) : null;

    html += `<div class="officer-item">
      <div class="officer-header">
        <span class="officer-name" style="color:${officerRarities[rarity]?.color || '#fff'}">${off.name}</span>
        <span class="officer-rarity ${rarity}">${rarity}</span>
      </div>
      <div class="officer-passive">Passive: ${off.passiveDesc || off.passive}</div>
      <div class="officer-active">Maneuver: ${off.activeDesc || off.active} (${off.cooldown}s CD)</div>`;

    if (assignedShip) {
      html += `<div class="officer-assigned">Assigned to: ${assignedShip.className}</div>`;
      html += `<button class="action-btn" style="margin-top:4px;font-size:10px;" onclick="unassignOfficer('${assignedShipId}')">Unassign</button>`;
    } else {
      // Show assign dropdown
      html += `<div style="margin-top:4px;">
        <select id="assign-select-${offId}" style="padding:3px 6px;font-size:10px;background:#0d1b2a;border:1px solid rgba(52,152,219,0.3);color:#e0e0e0;border-radius:3px;">
          <option value="">Assign to ship...</option>`;
      for (const shipId of playerState.shipIds) {
        const s = getShipData(shipId);
        if (s && !assignments[shipId]) {
          html += `<option value="${shipId}">${s.className}</option>`;
        }
      }
      html += `</select>
        <button class="action-btn" style="font-size:10px;margin-left:4px;" onclick="assignOfficerFromSelect('${offId}')">Assign</button>
      </div>`;
    }

    html += '</div>';
  }

  container.innerHTML = html;
}

function showRecruitOfficers() {
  const tabs = document.querySelectorAll('.panel-tab');
  tabs.forEach((t, i) => t.classList.toggle('active', i === 1));

  const container = document.getElementById('officers-tab-content');
  let html = '';

  const myOfficers = playerState.officers || [];

  for (const [offId, off] of Object.entries(officerData)) {
    if (myOfficers.includes(offId)) continue; // Already recruited

    const rarity = off.rarity || 'common';
    let canRecruit = true;
    let reqText = '';

    // Check faction rep requirement
    if (off.faction && off.factionRepRequired) {
      const rep = (playerState.factionRep && playerState.factionRep[off.faction]) || 0;
      if (rep < off.factionRepRequired) {
        canRecruit = false;
        reqText = `Requires ${FACTION_NAMES[off.faction] || off.faction} rep: ${off.factionRepRequired} (you have: ${rep})`;
      }
    }

    html += `<div class="officer-item">
      <div class="officer-header">
        <span class="officer-name" style="color:${officerRarities[rarity]?.color || '#fff'}">${off.name}</span>
        <span class="officer-rarity ${rarity}">${rarity}</span>
      </div>
      <div class="officer-passive">Passive: ${off.passiveDesc || off.passive}</div>
      <div class="officer-active">Maneuver: ${off.activeDesc || off.active} (${off.cooldown}s CD)</div>`;

    if (!canRecruit) {
      html += `<div class="officer-faction-req">${reqText}</div>`;
    }

    html += `<button class="build-btn" ${canRecruit ? '' : 'disabled'} onclick="recruitOfficer('${offId}')">RECRUIT</button>
    </div>`;
  }

  if (html === '') {
    html = '<div style="color:#7f8c8d;font-size:12px;padding:20px;text-align:center;">All available officers have been recruited!</div>';
  }

  container.innerHTML = html;
}

function recruitOfficer(officerId) {
  socket.emit('recruitOfficer', { officerId });
}

function assignOfficerFromSelect(officerId) {
  const select = document.getElementById('assign-select-' + officerId);
  if (!select || !select.value) return;
  socket.emit('assignOfficer', { officerId, shipId: select.value });
}

function unassignOfficer(shipId) {
  socket.emit('unassignOfficer', { shipId });
}

// --- Side Panel: Missions ---

function openMissionsPanel() {
  const panel = document.getElementById('side-panel');
  panel.style.display = 'flex';
  document.getElementById('side-panel-title').textContent = 'MISSIONS';

  const content = document.getElementById('side-panel-content');

  // Tabs: Active | Available
  let html = `<div class="panel-tabs">
    <button class="panel-tab active" onclick="showActiveMissions()">Active</button>
    <button class="panel-tab" onclick="showAvailableMissions()">Available</button>
  </div>`;
  html += '<div id="missions-tab-content"></div>';
  content.innerHTML = html;
  showActiveMissions();
}

function showActiveMissions() {
  const tabs = document.querySelectorAll('.panel-tab');
  tabs.forEach((t, i) => t.classList.toggle('active', i === 0));

  const container = document.getElementById('missions-tab-content');
  let html = '';

  const activeMissions = playerState.activeMissions || {};

  if (Object.keys(activeMissions).length === 0) {
    html += '<div style="color:#7f8c8d;font-size:12px;padding:20px;text-align:center;">No active missions. Check Available tab for new missions.</div>';
  }

  for (const [mId, mState] of Object.entries(activeMissions)) {
    const mission = mState;
    const progress = mission.progress || 0;
    const goal = mission.goal || 1;
    const pct = Math.min(100, Math.round((progress / goal) * 100));
    const isComplete = progress >= goal;

    html += `<div class="mission-item">
      <div class="mission-header">
        <span class="mission-name">${mission.name || mId}</span>
        <span class="mission-type ${mission.type || 'daily'}">${mission.type || 'daily'}</span>
      </div>
      <div class="mission-desc">${mission.description || ''}</div>
      <div class="mission-progress">
        <div class="progress-text">${progress}/${goal} (${pct}%)</div>
        <div class="progress-bar"><div class="progress-fill ${isComplete ? 'complete' : ''}" style="width:${pct}%"></div></div>
      </div>`;

    if (mission.rewards) {
      const rewardText = Object.entries(mission.rewards).map(([k, v]) => `${k}: ${v}`).join(', ');
      html += `<div class="mission-rewards">Rewards: ${rewardText}</div>`;
    }

    html += '</div>';
  }

  container.innerHTML = html;
}

function showAvailableMissions() {
  const tabs = document.querySelectorAll('.panel-tab');
  tabs.forEach((t, i) => t.classList.toggle('active', i === 1));

  // Request available missions from server
  socket.emit('getMissions');
}

function renderMissionsList(missions) {
  const container = document.getElementById('missions-tab-content');
  if (!container) return;

  let html = '';

  if (!missions || missions.length === 0) {
    html += '<div style="color:#7f8c8d;font-size:12px;padding:20px;text-align:center;">No missions available right now.</div>';
  }

  for (const mission of (missions || [])) {
    html += `<div class="mission-item">
      <div class="mission-header">
        <span class="mission-name">${mission.name}</span>
        <span class="mission-type ${mission.type || 'daily'}">${mission.type || 'daily'}</span>
      </div>
      <div class="mission-desc">${mission.description || ''}</div>`;

    if (mission.rewards) {
      const rewardText = Object.entries(mission.rewards).map(([k, v]) => `${k}: ${v}`).join(', ');
      html += `<div class="mission-rewards">Rewards: ${rewardText}</div>`;
    }

    html += `<button class="build-btn" onclick="acceptMission('${mission.id}')">ACCEPT</button>
    </div>`;
  }

  container.innerHTML = html;
}

function acceptMission(missionId) {
  socket.emit('acceptMission', { missionId });
}

// --- Side Panel: Factions ---

function openFactionsPanel() {
  const panel = document.getElementById('side-panel');
  panel.style.display = 'flex';
  document.getElementById('side-panel-title').textContent = 'FACTIONS';

  const content = document.getElementById('side-panel-content');
  let html = '';

  for (const [fId, faction] of Object.entries(factionData)) {
    const rep = (playerState.factionRep && playerState.factionRep[fId]) || 0;
    const color = FACTION_COLORS[fId] || '#5dade2';
    const fName = faction.name || FACTION_NAMES[fId] || fId;

    // Calculate tier
    let currentTier = 'Neutral';
    let nextTierRep = 0;
    let currentTierRep = 0;
    if (faction.tiers) {
      for (const tier of faction.tiers) {
        if (rep >= tier.minRep) {
          currentTier = tier.name;
          currentTierRep = tier.minRep;
        } else {
          nextTierRep = tier.minRep;
          break;
        }
      }
    }

    // Progress bar within current tier
    const tierRange = nextTierRep > currentTierRep ? nextTierRep - currentTierRep : 1;
    const tierProgress = nextTierRep > 0 ? Math.min(100, Math.round(((rep - currentTierRep) / tierRange) * 100)) : 100;

    html += `<div class="faction-item">
      <div class="faction-header">
        <span class="faction-name" style="color:${color}">${fName}</span>
        <span class="faction-tier" style="color:${color}">${currentTier}</span>
      </div>
      <div class="faction-desc">${faction.description || ''}</div>
      <div class="faction-rep-bar">
        <div class="faction-rep-fill" style="width:${tierProgress}%;background:${color}"></div>
      </div>
      <div class="faction-rep-text">Reputation: ${rep}${nextTierRep > 0 ? ' / ' + nextTierRep + ' (next tier)' : ' (MAX)'}</div>`;

    if (faction.bonus) {
      const bonusText = Object.entries(faction.bonus).map(([k, v]) => `${k}: +${Math.round(v * 100)}%`).join(', ');
      html += `<div class="faction-bonus">Faction bonus: ${bonusText}</div>`;
    }

    html += '</div>';
  }

  content.innerHTML = html;
}

// --- Side Panel: Alliance ---

function openAlliancePanel() {
  const panel = document.getElementById('side-panel');
  panel.style.display = 'flex';
  document.getElementById('side-panel-title').textContent = 'ALLIANCE';

  const content = document.getElementById('side-panel-content');

  if (playerState.allianceId) {
    // Request alliance state
    socket.emit('getAlliance');
    content.innerHTML = '<div style="color:#7f8c8d;font-size:12px;padding:20px;text-align:center;">Loading alliance info...</div>';
  } else {
    // Show create/join form
    let html = '<div class="alliance-create-form">';
    html += '<div class="panel-section-title">Create Alliance</div>';
    html += '<input type="text" id="alliance-name-input" placeholder="Alliance Name" maxlength="30">';
    html += '<input type="text" id="alliance-tag-input" placeholder="Tag (3-5 chars)" maxlength="5">';
    html += '<button class="build-btn" onclick="createAlliance()">CREATE ALLIANCE</button>';
    html += '</div>';
    html += '<div style="color:#7f8c8d;font-size:11px;padding:12px;text-align:center;">Or wait for an invitation from another player.</div>';
    content.innerHTML = html;
  }
}

function renderAllianceState(state) {
  const content = document.getElementById('side-panel-content');
  if (!content) return;
  const title = document.getElementById('side-panel-title');
  if (!title || title.textContent !== 'ALLIANCE') return;

  let html = '<div class="alliance-info">';
  html += `<div class="alliance-name-display">[${state.tag}] ${state.name}</div>`;
  html += `<div style="font-size:11px;color:#7f8c8d;margin-bottom:8px;">${state.members ? state.members.length : 0} members</div>`;
  html += '</div>';

  html += '<div class="panel-section-title">Members</div>';
  if (state.members) {
    for (const member of state.members) {
      html += `<div class="alliance-member">
        <span style="color:#ecf0f1">${member.name}</span>
        <span class="alliance-member-role ${member.role}">${member.role}</span>
      </div>`;
    }
  }

  // Invite player
  html += '<div class="panel-section-title">Invite Player</div>';
  html += `<div class="invite-row">
    <input type="text" id="invite-player-input" placeholder="Player name...">
    <button class="action-btn" onclick="invitePlayer()">Invite</button>
  </div>`;

  // Chat and Leave buttons
  html += `<div style="margin-top:16px;display:flex;gap:8px;">
    <button class="build-btn" onclick="toggleAllianceChat()">CHAT</button>
    <button class="build-btn" style="background:linear-gradient(135deg,#922,#c44);border-color:rgba(231,76,60,0.5);" onclick="leaveAlliance()">LEAVE</button>
  </div>`;

  content.innerHTML = html;
}

function createAlliance() {
  const name = document.getElementById('alliance-name-input').value.trim();
  const tag = document.getElementById('alliance-tag-input').value.trim().toUpperCase();
  if (!name || !tag) {
    addLog('Enter alliance name and tag.', 'warning');
    return;
  }
  if (tag.length < 2 || tag.length > 5) {
    addLog('Tag must be 2-5 characters.', 'warning');
    return;
  }
  socket.emit('createAlliance', { name, tag });
}

function invitePlayer() {
  const input = document.getElementById('invite-player-input');
  const name = input.value.trim();
  if (!name) return;
  socket.emit('inviteToAlliance', { targetPlayerName: name });
  input.value = '';
}

function leaveAlliance() {
  if (confirm('Are you sure you want to leave your alliance?')) {
    socket.emit('leaveAlliance');
  }
}

// --- Alliance Chat ---

function toggleAllianceChat() {
  const panel = document.getElementById('alliance-chat-panel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

function sendAllianceChat() {
  const input = document.getElementById('alliance-chat-input');
  const message = input.value.trim();
  if (!message) return;
  socket.emit('allianceChat', { message });
  input.value = '';
}

function addAllianceChatMessage(from, message) {
  const container = document.getElementById('alliance-chat-messages');
  const msg = document.createElement('div');
  msg.className = 'chat-msg';
  msg.innerHTML = `<span class="chat-sender">${from}:</span> ${message}`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;

  // Limit messages
  while (container.children.length > 100) {
    container.removeChild(container.firstChild);
  }
}

// --- Event Banner ---

function showEventBanner(text) {
  const banner = document.getElementById('event-banner');
  document.getElementById('event-banner-text').textContent = text;
  banner.style.display = 'block';
  setTimeout(() => {
    banner.style.display = 'none';
  }, 3000);
}

// --- Side Panel: Close ---

function closeSidePanel() {
  document.getElementById('side-panel').style.display = 'none';
}

// =============================================================
// STARBASE SCREEN — Full overlay base management view
// =============================================================

const BUILDING_CATEGORIES = {
  defense:    { name: 'Defense',    desc: 'Protective systems and weapons',   icon: '\u{1F6E1}', color: '#E74C3C' },
  production: { name: 'Production', desc: 'Resource generation facilities',   icon: '\u2699',    color: '#2ECC71' },
  research:   { name: 'Research',   desc: 'Technology advancement labs',      icon: '\u{1F52C}', color: '#3498DB' },
  shipyard:   { name: 'Shipyard',   desc: 'Ship construction and repair',    icon: '\u{1F680}', color: '#F1C40F' },
};

const BUILDING_UI_MAP = {
  shield_generator:  { category: 'defense',    icon: '\u{1F6E1}', gridPos: { left: 18, top: 8 }  },
  defense_platform:  { category: 'defense',    icon: '\u2694',     gridPos: { left: 43, top: 4 }  },
  refinery:          { category: 'production', icon: '\u2699',     gridPos: { left: 68, top: 8 }  },
  warehouse:         { category: 'production', icon: '\u{1F4E6}',  gridPos: { left: 12, top: 42 } },
  research_center:   { category: 'research',   icon: '\u{1F52C}',  gridPos: { left: 68, top: 42 } },
  shipyard:          { category: 'shipyard',   icon: '\u{1F680}',  gridPos: { left: 18, top: 72 } },
};

let currentSBCategory = 'defense';
let sbRefreshInterval = null;

function openStarbaseScreen() {
  document.getElementById('starbase-screen').style.display = 'flex';
  renderStarbaseHeader();
  renderStarbaseCategories();
  renderStarbaseGrid();
  renderConstructionQueue();

  renderStarbaseFleet();

  if (sbRefreshInterval) clearInterval(sbRefreshInterval);
  sbRefreshInterval = setInterval(() => {
    renderStarbaseHeader();
    renderConstructionQueue();
    renderStarbaseGrid();
    renderCategoryBuildings();
    renderStarbaseFleet();
  }, 1000);
}

function closeStarbaseScreen() {
  document.getElementById('starbase-screen').style.display = 'none';
  if (sbRefreshInterval) {
    clearInterval(sbRefreshInterval);
    sbRefreshInterval = null;
  }
}

function sbSwitchTab(tab) {
  document.getElementById('sb-tab-overview').classList.toggle('active', tab === 'overview');
  document.getElementById('sb-tab-construction').classList.toggle('active', tab === 'construction');
  // Both tabs show the same grid for now — construction tab could filter to upgrading only
  renderStarbaseGrid();
}

function renderStarbaseHeader() {
  const resContainer = document.getElementById('sb-resources');
  const resInfo = [
    { key: 'stellite',  name: 'Stellite',  color: '#E67E22', icon: '\u25C6' },
    { key: 'ferronite', name: 'Ferronite', color: '#8B8B8B', icon: '\u25C6' },
    { key: 'nexium',    name: 'Nexium',    color: '#9B59B6', icon: '\u25C6' },
    { key: 'pyrathium', name: 'Pyrathium', color: '#E74C3C', icon: '\u25C6' },
    { key: 'aurelium',  name: 'Aurelium',  color: '#F1C40F', icon: '\u25C6' },
  ];

  let html = '';
  for (const r of resInfo) {
    const amount = formatNum(Math.floor(playerState.resources[r.key] || 0));
    html += `<div class="sb-res-item">
      <span class="sb-res-icon" style="color:${r.color}">${r.icon}</span>
      <div>
        <div class="sb-res-amount" style="color:${r.color}">${amount}</div>
        <div class="sb-res-label">${r.name}</div>
      </div>
    </div>`;
  }
  resContainer.innerHTML = html;

  const officerCount = (playerState.officers || []).length;
  const totalOfficers = Object.keys(officerData).length;
  document.getElementById('sb-officers-count').innerHTML = `\u2734 ${officerCount}/${totalOfficers} Officers`;
}

function renderStarbaseCategories() {
  const container = document.getElementById('sb-category-list');
  let html = '';

  for (const [catId, cat] of Object.entries(BUILDING_CATEGORIES)) {
    const isActive = catId === currentSBCategory;
    html += `<div class="sb-cat-item ${isActive ? 'active' : ''}" style="--cat-color:${cat.color}" onclick="selectSBCategory('${catId}')">
      <span class="sb-cat-icon">${cat.icon}</span>
      <div>
        <div class="sb-cat-name">${cat.name}</div>
        <div class="sb-cat-desc">${cat.desc}</div>
      </div>
    </div>`;
  }

  container.innerHTML = html;
  renderCategoryBuildings();
}

function selectSBCategory(category) {
  currentSBCategory = category;
  renderStarbaseCategories();
}

function renderCategoryBuildings() {
  const container = document.getElementById('sb-category-buildings');
  const buildings = playerState.starbase ? playerState.starbase.buildings : {};
  const RES_COLORS = { stellite: '#E67E22', ferronite: '#8B8B8B', nexium: '#9B59B6', pyrathium: '#E74C3C', aurelium: '#F1C40F' };

  let html = '';

  for (const [bId, uiInfo] of Object.entries(BUILDING_UI_MAP)) {
    if (uiInfo.category !== currentSBCategory) continue;

    const bType = buildingTypes[bId];
    if (!bType) continue;

    const bState = buildings[bId] || { level: 0, upgrading: false };
    const currentLevel = bState.level;
    const isMaxed = currentLevel >= 10;
    const isUpgrading = bState.upgrading;
    const cat = BUILDING_CATEGORIES[uiInfo.category];
    const catColor = cat ? cat.color : '#5dade2';

    // Current effect text
    let effectText = '';
    if (currentLevel > 0 && bType.levels && bType.levels[currentLevel - 1]) {
      const effect = bType.levels[currentLevel - 1].effect;
      if (effect) {
        effectText = Object.entries(effect)
          .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').trim()}: +${Math.round(v * 100)}%`)
          .join(', ');
      }
    }

    // Cost for next level
    let costHtml = '';
    let canAfford = true;
    if (!isMaxed && bType.levels && bType.levels[currentLevel]) {
      const nextLevel = bType.levels[currentLevel];
      for (const [res, amount] of Object.entries(nextLevel.cost)) {
        const have = playerState.resources[res] || 0;
        const sufficient = have >= amount;
        if (!sufficient) canAfford = false;
        const rc = RES_COLORS[res] || '#bdc3c7';
        costHtml += `<span style="color:${sufficient ? rc : '#e74c3c'}">\u25C6 ${formatNum(amount)}</span>`;
      }
      costHtml += `<span style="color:#5a6a7a">\u23F1 ${formatTime(nextLevel.buildTime)}</span>`;
    }

    const canUpgrade = !isMaxed && !isUpgrading && canAfford;

    // Badge
    let badgeHtml = '';
    if (isUpgrading) {
      badgeHtml = '<div class="sb-building-card-badge" style="background:#e67e22">Upgrading</div>';
    } else if (canUpgrade) {
      badgeHtml = '<div class="sb-building-card-badge">Upgradeable</div>';
    } else if (isMaxed) {
      badgeHtml = '<div class="sb-building-card-badge" style="background:#3498db">Max Level</div>';
    }

    html += `<div class="sb-building-card" style="--cat-color:${catColor}" onclick="${canUpgrade ? `upgradeBuilding('${bId}')` : ''}">
      <div class="sb-building-card-img" style="background:linear-gradient(135deg, ${catColor}22, ${catColor}08)">
        <span style="font-size:36px;opacity:0.5">${uiInfo.icon}</span>
        <div class="sb-building-card-level">Level ${currentLevel}</div>
        ${badgeHtml}
      </div>
      <div class="sb-building-card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="sb-building-card-name">${bType.name}</span>
          <span class="sb-building-card-stars" style="color:${catColor}">\u2606 ${currentLevel}/10</span>
        </div>
        <div class="sb-building-card-stats">${effectText || 'No bonuses yet'}</div>
        ${costHtml ? `<div class="sb-building-card-costs">${costHtml} \u203A</div>` : ''}
      </div>
    </div>`;
  }

  if (!html) {
    html = '<div style="color:#3a4a5a;font-size:11px;padding:16px;text-align:center;">No buildings in this category</div>';
  }

  container.innerHTML = html;
}

function renderStarbaseGrid() {
  const grid = document.getElementById('sb-grid');
  const buildings = playerState.starbase ? playerState.starbase.buildings : {};
  let html = '';

  // Power core in the center
  html += `<div class="sb-power-core" style="left:calc(50% - 30px);top:calc(45% - 30px);">
    <span>\u26A1</span>
  </div>`;

  // Building slots
  for (const [bId, uiInfo] of Object.entries(BUILDING_UI_MAP)) {
    const bType = buildingTypes[bId];
    if (!bType) continue;

    const bState = buildings[bId] || { level: 0, upgrading: false };
    const currentLevel = bState.level;
    const isUpgrading = bState.upgrading;

    let progressHtml = '';
    if (isUpgrading && bState.upgradeCompleteTime) {
      const now = Date.now();
      const remaining = Math.max(0, bState.upgradeCompleteTime - now);
      const totalBuildTime = (bType.levels && bType.levels[currentLevel])
        ? bType.levels[currentLevel].buildTime * 1000
        : 60000;
      const elapsed = totalBuildTime - remaining;
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalBuildTime) * 100)));

      progressHtml = `<div class="sb-slot-progress">
        <div class="sb-slot-progress-text">\u{1F527} Building... ${pct}%</div>
        <div class="sb-slot-progress-bar"><div class="sb-slot-progress-fill" style="width:${pct}%"></div></div>
      </div>`;
    }

    html += `<div class="sb-slot ${uiInfo.category}" style="left:${uiInfo.gridPos.left}%;top:${uiInfo.gridPos.top}%;"
      onclick="selectSBCategory('${uiInfo.category}')">
      <span class="sb-slot-icon">${uiInfo.icon}</span>
      <span class="sb-slot-name">${bType.name}</span>
      <span class="sb-slot-level">Lv ${currentLevel}</span>
      ${progressHtml}
    </div>`;
  }

  // Locked/empty expansion slots
  html += `<div class="sb-slot" style="left:43%;top:72%;opacity:0.3;cursor:default;">
    <span class="sb-slot-icon" style="opacity:0.3">+</span>
    <span class="sb-slot-name" style="color:#3a4a5a">Locked</span>
  </div>`;
  html += `<div class="sb-slot" style="left:68%;top:72%;opacity:0.3;cursor:default;">
    <span class="sb-slot-icon" style="opacity:0.3">+</span>
    <span class="sb-slot-name" style="color:#3a4a5a">Locked</span>
  </div>`;

  grid.innerHTML = html;
}

function renderConstructionQueue() {
  const container = document.getElementById('sb-queue-items');
  const buildings = playerState.starbase ? playerState.starbase.buildings : {};
  let html = '';
  let queueCount = 0;

  for (const [bId, bState] of Object.entries(buildings)) {
    if (!bState.upgrading) continue;
    queueCount++;

    const bType = buildingTypes[bId];
    const uiInfo = BUILDING_UI_MAP[bId];
    const cat = uiInfo ? BUILDING_CATEGORIES[uiInfo.category] : null;
    const catColor = cat ? cat.color : '#5dade2';
    const icon = uiInfo ? uiInfo.icon : '\u{1F3D7}';
    const name = bType ? bType.name : bId.replace(/_/g, ' ');
    const nextLevel = bState.level + 1;

    const now = Date.now();
    const remaining = Math.max(0, (bState.upgradeCompleteTime || 0) - now);
    const totalBuildTime = (bType && bType.levels && bType.levels[bState.level])
      ? bType.levels[bState.level].buildTime * 1000
      : 60000;
    const elapsed = totalBuildTime - remaining;
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalBuildTime) * 100)));
    const timeStr = formatTime(Math.ceil(remaining / 1000));

    html += `<div class="sb-queue-item" style="border-left:3px solid ${catColor}">
      <div class="sb-queue-item-header">
        <div class="sb-queue-item-title">
          <span class="sb-queue-item-icon">${icon}</span>
          <div class="sb-queue-item-info">
            <div class="sb-queue-item-name">${name}</div>
            <div class="sb-queue-item-level">Level ${nextLevel}</div>
          </div>
        </div>
        <button class="sb-queue-item-cancel">&times;</button>
      </div>
      <div class="sb-queue-item-row">
        <span class="sb-queue-item-label">Construction Progress</span>
        <span class="sb-queue-item-value">${pct}%</span>
      </div>
      <div class="sb-queue-progress-bar">
        <div class="sb-queue-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="sb-queue-item-row">
        <span class="sb-queue-item-label">Time Remaining</span>
        <span class="sb-queue-item-value time">${timeStr}</span>
      </div>
    </div>`;
  }

  if (queueCount === 0) {
    html = '<div class="sb-queue-empty">No active construction projects.<br>Select a building category to start upgrading.</div>';
  }

  container.innerHTML = html;
  document.getElementById('sb-queue-count').innerHTML = `\u23F1 ${queueCount}`;
}

function renderStarbaseFleet() {
  const container = document.getElementById('sb-fleet-list');
  const countEl = document.getElementById('sb-fleet-count');
  if (!container || !playerState || !playerState.ships) return;

  const ships = Object.entries(playerState.ships);
  countEl.textContent = `${ships.length} ship${ships.length !== 1 ? 's' : ''}`;

  let html = '';
  // Sort: damaged first, then by state
  const sorted = ships.sort(([, a], [, b]) => {
    if (a.state === 'damaged' && b.state !== 'damaged') return -1;
    if (b.state === 'damaged' && a.state !== 'damaged') return 1;
    return 0;
  });

  for (const [shipId, ship] of sorted) {
    const isDamaged = ship.state === 'damaged';
    const hullPct = ship.maxHull > 0 ? Math.round((ship.hull / ship.maxHull) * 100) : 0;
    const hullColor = hullPct > 60 ? '#2ecc71' : hullPct > 30 ? '#f39c12' : '#e74c3c';
    const location = ship.systemId === playerState.homeSystemId
      ? 'Starbase'
      : ship.systemId.replace(/_/g, ' ');

    html += `<div class="sb-fleet-ship ${isDamaged ? 'damaged' : ''}" onclick="closeStarbaseScreen(); selectShip('${shipId}')">
      <span class="sb-fleet-ship-icon" style="color:${ship.color}">${ship.icon}</span>
      <div class="sb-fleet-ship-name">${ship.className}</div>
      <div class="sb-fleet-ship-state ${ship.state}">${ship.state}</div>
      <div class="sb-fleet-ship-location">${location}</div>
      <div class="sb-fleet-ship-hp">
        <div class="sb-fleet-ship-hp-fill" style="width:${hullPct}%;background:${hullColor}"></div>
      </div>
      ${isDamaged ? `<button class="sb-fleet-repair-btn" onclick="event.stopPropagation(); repairShip('${shipId}')">REPAIR</button>` : ''}
    </div>`;
  }

  if (ships.length === 0) {
    html = '<div style="color:#3a4a5a;font-size:11px;padding:10px;">No ships in fleet</div>';
  }

  container.innerHTML = html;
}

// --- Log ---

function addLog(message, type = 'info') {
  const container = document.getElementById('log-messages');
  const msg = document.createElement('div');
  msg.className = 'log-msg ' + type;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msg.textContent = `[${time}] ${message}`;
  container.insertBefore(msg, container.firstChild);

  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}
