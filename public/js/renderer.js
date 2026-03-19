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

  drawGalaxyMap(galaxyData, playerHomeSystem) {
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

    // Draw systems
    for (const sys of galaxyData) {
      const isHome = sys.id === playerHomeSystem;
      const isSafe = sys.type === 'safe';
      const baseRadius = 12 + (sys.shipCount || 0) * 2;
      const radius = Math.min(baseRadius, 24);

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

      // Border
      ctx.strokeStyle = isHome ? '#f1c40f' : (isSafe ? '#2ecc71' : '#e74c3c');
      ctx.lineWidth = isHome ? 3 : 1.5;
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

      // Ship count
      if (sys.shipCount > 0) {
        ctx.fillStyle = '#5dade2';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.fillText(`${sys.shipCount}`, sys.x, sys.y + 4);
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

  drawSystemView(systemState, playerId, selectedShipId) {
    const ctx = this.systemCtx;
    const w = this.systemCanvas.width;
    const h = this.systemCanvas.height;

    this.drawStarfield(ctx, w, h);

    if (!systemState) return;

    // Draw system name and type at top
    // (handled by overlay in HTML)

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

    // Ship body
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ship.angle || 0);

    // Draw ship shape based on class
    if (ship.classType === 'mining') {
      // Mining ship — square-ish
      ctx.fillStyle = isOwn ? ship.color : '#95a5a6';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeStyle = isOwn ? '#2ecc71' : '#666';
      ctx.lineWidth = 1;
      ctx.strokeRect(-8, -8, 16, 16);
    } else {
      // Combat / exploration — triangle
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

    // Ship name / owner
    ctx.fillStyle = isOwn ? '#5dade2' : '#e74c3c';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ship.className, x, y - 18);

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
