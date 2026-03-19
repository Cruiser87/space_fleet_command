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

// --- Initialize ---
window.addEventListener('DOMContentLoaded', () => {
  renderer = new Renderer();
  renderer.drawLoginStars();

  // Enter key to join
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

    // Switch to game screen
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    document.getElementById('player-name-display').textContent = playerState.name;

    updateResourceDisplay();
    updateShipList();
    showSystemView();
    addLog('Welcome, ' + playerState.name + '! Your fleet awaits.', 'info');
    addLog('You are stationed in the ' + playerState.homeSystemId.replace(/_/g, ' ').toUpperCase() + ' system.', 'info');

    // Start render loop
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
    playerState = state;
    updateResourceDisplay();
    updateShipList();
  });

  socket.on('galaxyUpdate', (data) => {
    galaxyData = data;
  });

  socket.on('warpResult', (data) => {
    if (data.success) {
      const jumps = data.jumps || 1;
      const dest = data.arrivalSystem.replace(/_/g, ' ');
      addLog(`Warping to ${dest} (${jumps} jump${jumps > 1 ? 's' : ''})...`, 'warp');
      // Switch view to target system after all warps complete
      const arrivalTime = jumps > 1 ? (jumps * 2500) + 100 : 2100;
      setTimeout(() => {
        socket.emit('viewSystem', data.arrivalSystem);
        updateSystemOverlay();
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
      openUpgradeMenu(); // Refresh
    } else {
      addLog(`Upgrade failed: ${data.error}`, 'warning');
    }
  });
}

// --- Game Loop ---
function gameLoop() {
  if (currentView === 'galaxy') {
    renderer.drawGalaxyMap(galaxyData, playerState?.homeSystemId, playerState?.id);
  } else {
    renderer.drawSystemView(currentSystemState, playerState?.id, selectedShipId);
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
}

function showSystemView() {
  currentView = 'system';
  document.getElementById('galaxy-canvas').style.display = 'none';
  document.getElementById('system-canvas').style.display = 'block';
  document.getElementById('btn-galaxy-view').classList.remove('active');
  document.getElementById('btn-system-view').classList.add('active');
  updateSystemOverlay();
}

function updateSystemOverlay() {
  if (!currentSystemState) return;
  const overlay = document.getElementById('system-info-overlay');
  overlay.style.display = 'block';
  document.getElementById('system-info-name').textContent = currentSystemState.name;
  const typeEl = document.getElementById('system-info-type');
  typeEl.textContent = currentSystemState.type === 'safe' ? 'SAFE ZONE' : 'DANGER ZONE - PVP';
  typeEl.className = currentSystemState.type;
  document.getElementById('system-info-details').textContent =
    `Level ${currentSystemState.level} • ${currentSystemState.ships.length} ships • ${currentSystemState.miningNodes.length} planets`;
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
    // Find ship in current system state or just show basic info
    // Try current system first, fall back to player state ship data
    let shipData = null;
    if (currentSystemState) {
      shipData = currentSystemState.ships.find(s => s.id === shipId);
    }
    if (!shipData && playerState.ships) {
      shipData = playerState.ships[shipId];
    }

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
    container.appendChild(div);
  }
}

function selectShip(shipId) {
  selectedShipId = shipId;
  updateShipList();
  updateShipInfoPanel();
}

function updateShipInfoPanel() {
  const panel = document.getElementById('ship-info-panel');
  if (!selectedShipId) {
    panel.style.display = 'none';
    return;
  }

  // Try current system first, fall back to player state ship data
  let ship = null;
  if (currentSystemState) {
    ship = currentSystemState.ships.find(s => s.id === selectedShipId);
  }
  if (!ship && playerState && playerState.ships) {
    ship = playerState.ships[selectedShipId];
  }
  if (!ship) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  document.getElementById('ship-info-title').textContent = ship.className;

  const stats = document.getElementById('ship-stats');
  const hullPct = Math.round((ship.hull / ship.maxHull) * 100);
  const armorPct = Math.round((ship.armor / ship.maxArmor) * 100);
  const shieldPct = ship.maxShields > 0 ? Math.round((ship.shields / ship.maxShields) * 100) : 0;
  const totalCargo = Math.floor(Object.values(ship.cargo || {}).reduce((a, b) => a + b, 0));

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

  // Actions
  const actions = document.getElementById('ship-actions');
  let actionsHtml = '';

  if (ship.state === 'damaged') {
    // Damaged ship — only show repair button
    actionsHtml += `<button class="action-btn danger" onclick="repairShip('${ship.id}')">Repair (30% build cost)</button>`;
  } else {
    // Dock button (if in home system)
    if (playerState && ship.systemId === playerState.homeSystemId) {
      actionsHtml += `<button class="action-btn" onclick="dockShip('${ship.id}')">Dock</button>`;
    }

    // Warp button
    actionsHtml += `<button class="action-btn" onclick="showWarpMenu('${ship.id}')">Warp</button>`;

    // Mining (if mining ship and mining nodes exist)
    if (ship.miningRate > 0 && currentSystemState.miningNodes.length > 0) {
      actionsHtml += `<button class="action-btn" onclick="showMiningMenu('${ship.id}')">Mine</button>`;
    }

    // Stop
    if (ship.state === 'mining' || ship.state === 'moving') {
      actionsHtml += `<button class="action-btn" onclick="stopShip('${ship.id}')">Stop</button>`;
    }
  }

  actions.innerHTML = actionsHtml;
}

// --- Canvas Click Handling ---

document.addEventListener('DOMContentLoaded', () => {
  // System canvas — move ships / select ships
  const systemCanvas = document.getElementById('system-canvas');
  systemCanvas.addEventListener('click', (e) => {
    if (currentView !== 'system' || !currentSystemState) return;

    const rect = systemCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (systemCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (systemCanvas.height / rect.height);

    // Check if clicking on a ship
    for (const ship of currentSystemState.ships) {
      const dx = x - ship.x;
      const dy = y - ship.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        if (ship.playerId === playerState.id) {
          selectShip(ship.id);
        } else if (selectedShipId) {
          // Clicked NPC or enemy ship — attack with selected ship
          // NPCs can be attacked anywhere; players only in PVP zones
          socket.emit('attackShip', {
            attackerShipId: selectedShipId,
            targetShipId: ship.id,
          });
        }
        return;
      }
    }

    // Otherwise, move selected ship to click location
    if (selectedShipId) {
      socket.emit('moveShip', { shipId: selectedShipId, x, y });
    }
  });

  // Right-click for context actions
  systemCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // Could add context menu here later
  });

  // Galaxy canvas — single click: warp selected ship, or view system
  const galaxyCanvas = document.getElementById('galaxy-canvas');
  galaxyCanvas.addEventListener('click', (e) => {
    if (currentView !== 'galaxy') return;

    const rect = galaxyCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (galaxyCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (galaxyCanvas.height / rect.height);

    const sys = renderer.getGalaxySystemAt(x, y, galaxyData);
    if (!sys) return;

    if (selectedShipId) {
      // Ship is selected — warp it to the clicked system
      socket.emit('warpShipTo', { shipId: selectedShipId, targetSystemId: sys.id });
    } else {
      // No ship selected — view the system
      socket.emit('viewSystem', sys.id);
      showSystemView();
      addLog(`Viewing ${sys.name} system. Select a ship first to warp.`, 'info');
    }
  });

  // Double-click galaxy — always view system (even if ship selected)
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
});

// --- Ship Actions ---

function dockShip(shipId) {
  socket.emit('dockShip', { shipId });
}

function stopShip(shipId) {
  // Move to current position to stop
  const ship = currentSystemState?.ships.find(s => s.id === shipId);
  if (ship) {
    socket.emit('moveShip', { shipId, x: ship.x, y: ship.y });
  }
}

function repairShip(shipId) {
  socket.emit('repairShip', { shipId });
}

function showWarpMenu(shipId) {
  if (!currentSystemState) return;

  // Remove existing warp menu
  const existing = document.querySelector('.warp-menu');
  if (existing) existing.remove();

  const ship = currentSystemState.ships.find(s => s.id === shipId);
  if (!ship) return;

  const menu = document.createElement('div');
  menu.className = 'warp-menu';
  menu.style.left = '50%';
  menu.style.top = '50%';
  menu.style.transform = 'translate(-50%, -50%)';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:13px;color:#5dade2;margin-bottom:8px;text-align:center;letter-spacing:1px;';
  title.textContent = 'WARP TO';
  menu.appendChild(title);

  for (const connId of currentSystemState.connections) {
    const sys = galaxyData.find(s => s.id === connId);
    if (!sys) continue;

    const opt = document.createElement('div');
    opt.className = 'warp-option';

    const typeSpan = document.createElement('span');
    typeSpan.className = sys.type === 'safe' ? 'warp-type-safe' : 'warp-type-dangerous';
    typeSpan.textContent = sys.type === 'safe' ? ' [SAFE]' : ' [PVP]';

    opt.textContent = sys.name;
    opt.appendChild(typeSpan);
    opt.onclick = () => {
      socket.emit('warpShip', { shipId, targetSystemId: connId });
      menu.remove();
    };
    menu.appendChild(opt);
  }

  // Close button
  const closeBtn = document.createElement('div');
  closeBtn.className = 'warp-option';
  closeBtn.style.color = '#e74c3c';
  closeBtn.style.textAlign = 'center';
  closeBtn.textContent = 'Cancel';
  closeBtn.onclick = () => menu.remove();
  menu.appendChild(closeBtn);

  document.getElementById('game-area').appendChild(menu);
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

// --- Side Panel: Starbase ---

function openStarbase() {
  const panel = document.getElementById('side-panel');
  panel.style.display = 'flex';
  document.getElementById('side-panel-title').textContent = 'STARBASE';

  const content = document.getElementById('side-panel-content');
  let html = '<div class="starbase-info"><h4>Resources</h4><div class="starbase-resources">';

  const resNames = { stellite: 'Stellite', ferronite: 'Ferronite', nexium: 'Nexium', pyrathium: 'Pyrathium', aurelium: 'Aurelium' };
  const resColors = { stellite: '#E67E22', ferronite: '#8B8B8B', nexium: '#9B59B6', pyrathium: '#E74C3C', aurelium: '#F1C40F' };

  for (const [key, name] of Object.entries(resNames)) {
    const amount = Math.floor(playerState.resources[key] || 0);
    html += `<div class="starbase-res-row">
      <span class="starbase-res-name" style="color:${resColors[key]}">${name}</span>
      <span class="starbase-res-amount">${formatNum(amount)}</span>
    </div>`;
  }
  html += '</div></div>';

  // Docked ships
  html += '<div class="docked-ships"><h4>Ships</h4>';
  let shipCount = 0;
  if (currentSystemState) {
    for (const ship of currentSystemState.ships) {
      if (ship.playerId === playerState.id) {
        shipCount++;
        html += `<div class="docked-ship-item">
          <span style="color:${ship.color}">${ship.icon} ${ship.className}</span>
          <span style="color:#7f8c8d">${ship.state}</span>
        </div>`;
      }
    }
  }
  if (shipCount === 0) {
    html += '<div style="color:#555;font-size:12px;">No ships in this system</div>';
  }
  html += '</div>';

  content.innerHTML = html;
}

// --- Side Panel: Build Ships ---

function openBuildMenu() {
  const panel = document.getElementById('side-panel');
  panel.style.display = 'flex';
  document.getElementById('side-panel-title').textContent = 'BUILD SHIPS';

  const content = document.getElementById('side-panel-content');
  let html = '';

  for (const [classId, sc] of Object.entries(shipClasses)) {
    html += `<div class="build-item">
      <div class="build-item-header">
        <span class="build-item-name" style="color:${sc.color}">${sc.icon} ${sc.name}</span>
        <span class="build-item-class">${sc.class}</span>
      </div>
      <div class="build-item-desc">${sc.description}</div>
      <div class="build-item-cost">`;

    let canAfford = true;
    for (const [res, amount] of Object.entries(sc.cost)) {
      const have = playerState.resources[res] || 0;
      const sufficient = have >= amount;
      if (!sufficient) canAfford = false;
      html += `<span class="cost-entry ${sufficient ? '' : 'insufficient'}">${res}: ${amount}</span>`;
    }

    html += `</div>
      <button class="build-btn" ${canAfford ? '' : 'disabled'} onclick="buildShip('${classId}')">BUILD</button>
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

  const ship = currentSystemState?.ships.find(s => s.id === selectedShipId);
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
      const nextTier = tiers[currentTier]; // 0-based: tiers[currentTier] = next tier data
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

// --- Side Panel: Close ---

function closeSidePanel() {
  document.getElementById('side-panel').style.display = 'none';
}

// --- Log ---

function addLog(message, type = 'info') {
  const container = document.getElementById('log-messages');
  const msg = document.createElement('div');
  msg.className = 'log-msg ' + type;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msg.textContent = `[${time}] ${message}`;
  container.insertBefore(msg, container.firstChild);

  // Keep max 50 messages
  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}
