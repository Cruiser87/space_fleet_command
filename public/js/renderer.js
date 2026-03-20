// ============================================================
// RENDERER — Canvas drawing for Galaxy Map and System View
// ============================================================

class Renderer {
  constructor() {
    this.galaxyCanvas = document.getElementById('galaxy-canvas');
    this.galaxyCtx = this.galaxyCanvas.getContext('2d');
    this.systemCanvas = document.getElementById('system-canvas');
    this.systemCtx = this.systemCanvas.getContext('2d');

    // Star field cache
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    this.animFrame = 0;
  }

  // ----------------------------------------------------------
  // STAR BACKGROUND
  // ----------------------------------------------------------

  drawStarfield(ctx, w, h) {
    ctx.fillStyle = '#060612';
    ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const twinkle = Math.sin(this.animFrame * star.twinkleSpeed) * 0.3 + star.brightness;
      ctx.fillStyle = `rgba(200, 220, 255, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x % w, star.y % h, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    this.animFrame++;
  }

  // ----------------------------------------------------------
  // GALAXY MAP
  // ----------------------------------------------------------

  drawGalaxyMap(galaxyData, playerHomeSystem, playerId) {
    const ctx = this.galaxyCtx;
    const w = this.galaxyCanvas.width;
    const h = this.galaxyCanvas.height;

    this.drawStarfield(ctx, w, h);

    if (!galaxyData || galaxyData.length === 0) return;

    // Draw connections (warp lanes) first
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
    ctx.lineWidth = 1;
    for (const sys of galaxyData) {
      for (const connId of sys.connections) {
        const conn = galaxyData.find(s => s.id === connId);
        if (conn && sys.id < connId) {  // draw each line once
          ctx.beginPath();
          ctx.moveTo(sys.x, sys.y);
          ctx.lineTo(conn.x, conn.y);
          ctx.stroke();
        }
      }
    }

    // Faction territory colors
    const factionColors = { solari: '#E74C3C', nexari: '#3498DB', aurani: '#F1C40F' };

    // Draw systems
    for (const sys of galaxyData) {
      const isHome = sys.id === playerHomeSystem;
      const isSafe = sys.type === 'safe';
      const baseRadius = 12 + (sys.shipCount || 0) * 2;
      const radius = Math.min(baseRadius, 24);

      // Faction territory glow (outer ring)
      if (sys.faction && factionColors[sys.faction]) {
        const fColor = factionColors[sys.faction];
        const fGrad = ctx.createRadialGradient(sys.x, sys.y, radius * 1.5, sys.x, sys.y, radius * 3.5);
        fGrad.addColorStop(0, fColor + '20');
        fGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(sys.x, sys.y, radius * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glow
      const gradient = ctx.createRadialGradient(sys.x, sys.y, 0, sys.x, sys.y, radius * 2.5);
      gradient.addColorStop(0, sys.color + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sys.x, sys.y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // System circle
      ctx.fillStyle = sys.color;
      ctx.beginPath();
      ctx.arc(sys.x, sys.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Border — faction color if present, otherwise default
      if (isHome) {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 3;
      } else if (sys.faction && factionColors[sys.faction]) {
        ctx.strokeStyle = factionColors[sys.faction];
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = isSafe ? '#2ecc71' : '#e74c3c';
        ctx.lineWidth = 1.5;
      }
      ctx.stroke();

      // System name
      ctx.fillStyle = '#bdc3c7';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sys.name, sys.x, sys.y + radius + 16);

      // Level indicator
      ctx.fillStyle = '#7f8c8d';
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.fillText(`Lv.${sys.level}`, sys.x, sys.y + radius + 28);

      // Faction label on galaxy map
      if (sys.faction && factionColors[sys.faction]) {
        ctx.fillStyle = factionColors[sys.faction] + 'AA';
        ctx.font = '8px "Segoe UI", sans-serif';
        ctx.fillText(sys.faction.toUpperCase(), sys.x, sys.y + radius + 38);
      }

      // Type indicator
      if (!isSafe) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillText('PVP', sys.x, sys.y - radius - 8);
      }

      // Home indicator
      if (isHome) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillText('HOME', sys.x, sys.y - radius - 8);
      }

      // Ship count (total)
      if (sys.shipCount > 0) {
        ctx.fillStyle = '#5dade2';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.fillText(`${sys.shipCount}`, sys.x, sys.y + 4);
      }

      // Player's own ships indicator
      const myShipCount = playerId && sys.playerShips ? (sys.playerShips[playerId] || 0) : 0;
      if (myShipCount > 0) {
        const iconX = sys.x + radius + 8;
        const iconY = sys.y - 4;

        // Ship icon (small triangle)
        ctx.save();
        ctx.translate(iconX, iconY);
        ctx.fillStyle = '#5dade2';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Ship count badge
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`x${myShipCount}`, iconX + 10, iconY + 4);
        ctx.textAlign = 'center'; // reset
      }
    }
  }

  getGalaxySystemAt(x, y, galaxyData) {
    for (const sys of galaxyData) {
      const dx = x - sys.x;
      const dy = y - sys.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) return sys;
    }
    return null;
  }

  // ----------------------------------------------------------
  // SYSTEM VIEW
  // ----------------------------------------------------------

  drawSystemView(systemState, playerId, selectedShipId, homeSystemId) {
    const ctx = this.systemCtx;
    const w = this.systemCanvas.width;
    const h = this.systemCanvas.height;

    this.drawStarfield(ctx, w, h);

    if (!systemState) return;

    // Draw starbase if this is the player's home system
    if (homeSystemId && systemState.id === homeSystemId) {
      this.drawStarbase(ctx, 400, 520);
    }

    // Draw mining nodes (planets)
    for (const node of systemState.miningNodes || []) {
      this.drawMiningNode(ctx, node);
    }

    // Draw ships
    for (const ship of systemState.ships || []) {
      const isOwn = ship.playerId === playerId;
      const isSelected = ship.id === selectedShipId;
      this.drawShip(ctx, ship, isOwn, isSelected);
    }
  }

  drawStarbase(ctx, x, y) {
    // Outer glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
    gradient.addColorStop(0, 'rgba(241, 196, 15, 0.15)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();

    // Base platform (hexagon)
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#1a2a3a';
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(angle) * 22;
      const py = Math.sin(angle) * 22;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Antenna spokes
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
      ctx.lineTo(Math.cos(angle) * 28, Math.sin(angle) * 28);
      ctx.stroke();
    }

    ctx.restore();

    // Label
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STARBASE', x, y + 36);
  }

  drawMiningNode(ctx, node) {
    const resourceColors = {
      stellite: '#E67E22',
      ferronite: '#8B8B8B',
      nexium: '#9B59B6',
      pyrathium: '#E74C3C',
      aurelium: '#F1C40F',
    };

    const color = resourceColors[node.resource] || '#ffffff';
    const x = node.x;
    const y = node.y;

    // Planet glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();

    // Planet body
    ctx.fillStyle = color + '80';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#95a5a6';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.name, x, y + 26);

    // Resource label
    ctx.fillStyle = color;
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.fillText(node.resource.toUpperCase(), x, y + 37);
  }

  drawShip(ctx, ship, isOwn, isSelected) {
    const x = ship.x;
    const y = ship.y;
    const isNpc = ship.isNpc;

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // NPC threat glow
    if (isNpc) {
      const glowRadius = 20;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, ship.color + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ship body
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ship.angle || 0);

    if (isNpc) {
      // NPC ships — inverted triangle / diamond shapes
      ctx.fillStyle = ship.color;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 4);
      ctx.lineTo(0, 10);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (ship.classType === 'mining') {
      // Mining ship — square-ish
      ctx.fillStyle = isOwn ? ship.color : '#95a5a6';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeStyle = isOwn ? '#2ecc71' : '#666';
      ctx.lineWidth = 1;
      ctx.strokeRect(-8, -8, 16, 16);
    } else {
      // Player combat / exploration — triangle
      ctx.fillStyle = isOwn ? ship.color : '#c0392b';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isOwn ? '#5dade2' : '#e74c3c';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    // Ship name / owner label
    if (isNpc) {
      ctx.fillStyle = ship.color;
      ctx.font = 'bold 9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ship.className, x, y - 18);
    } else {
      // Alliance tag + ship name
      let shipLabel = ship.className;
      if (ship.allianceTag) {
        shipLabel = `[${ship.allianceTag}] ${shipLabel}`;
      }
      ctx.fillStyle = isOwn ? '#5dade2' : '#e74c3c';
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shipLabel, x, y - 18);
    }

    // Combat role indicator (small colored dot)
    if (ship.combatRole) {
      const roleColors = { explorer: '#2ecc71', interceptor: '#e74c3c', battleship: '#3498db' };
      const roleColor = roleColors[ship.combatRole] || '#fff';
      ctx.fillStyle = roleColor;
      ctx.beginPath();
      ctx.arc(x + 18, y - 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active ability glow
    if (ship.activeAbility) {
      ctx.strokeStyle = '#e67e22';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Kill count badge for player ships
    if (isOwn && ship.kills > 0) {
      ctx.fillStyle = '#f39c12';
      ctx.font = 'bold 8px "Segoe UI", sans-serif';
      ctx.fillText(`${ship.kills} kills`, x, y - 28);
    }

    // Damaged indicator
    if (ship.state === 'damaged') {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillText('DAMAGED', x, y - 28);
      // Flashing red ring
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Health bars
    this.drawHealthBars(ctx, x, y + 14, ship);

    // Mining indicator
    if (ship.state === 'mining') {
      ctx.fillStyle = '#2ecc71';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText('⛏ Mining', x, y - 28);
    }

    // Combat indicator
    if (ship.state === 'combat') {
      ctx.fillStyle = '#e74c3c';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText('⚔ Combat', x, y - 28);
    }

    // Cargo indicator
    const totalCargo = Object.values(ship.cargo || {}).reduce((a, b) => a + b, 0);
    if (totalCargo > 0) {
      const cargoPercent = Math.round((totalCargo / ship.maxCargo) * 100);
      ctx.fillStyle = '#f39c12';
      ctx.font = '8px "Segoe UI", sans-serif';
      ctx.fillText(`Cargo: ${cargoPercent}%`, x, y + 38);
    }
  }

  drawHealthBars(ctx, x, y, ship) {
    const barWidth = 30;
    const barHeight = 3;
    const gap = 2;

    // Shield bar (blue)
    const shieldPct = ship.maxShields > 0 ? ship.shields / ship.maxShields : 0;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x - barWidth / 2, y, barWidth * shieldPct, barHeight);

    // Armor bar (grey)
    const armorPct = ship.maxArmor > 0 ? ship.armor / ship.maxArmor : 0;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - barWidth / 2, y + barHeight + gap, barWidth, barHeight);
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(x - barWidth / 2, y + barHeight + gap, barWidth * armorPct, barHeight);

    // Hull bar (green/yellow/red)
    const hullPct = ship.maxHull > 0 ? ship.hull / ship.maxHull : 0;
    const hullColor = hullPct > 0.6 ? '#2ecc71' : hullPct > 0.3 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - barWidth / 2, y + (barHeight + gap) * 2, barWidth, barHeight);
    ctx.fillStyle = hullColor;
    ctx.fillRect(x - barWidth / 2, y + (barHeight + gap) * 2, barWidth * hullPct, barHeight);
  }

  // ----------------------------------------------------------
  // LOGIN SCREEN STARS
  // ----------------------------------------------------------

  drawLoginStars() {
    const container = document.getElementById('stars-bg');
    if (!container || container.children.length > 0) return;

    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      star.style.cssText = `
        position: absolute;
        width: ${Math.random() * 2 + 1}px;
        height: ${Math.random() * 2 + 1}px;
        background: rgba(200, 220, 255, ${Math.random() * 0.5 + 0.2});
        border-radius: 50%;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
      `;
      container.appendChild(star);
    }
  }
}
