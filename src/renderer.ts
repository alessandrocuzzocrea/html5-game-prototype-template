const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
export const CELL = 60;

// The play area is a 540×540 square (9×9 cells) centered in the 16:9 canvas
export const PLAY_SIZE = 540;
export const PLAY_OFFSET_X = (CANVAS_WIDTH - PLAY_SIZE) / 2; // 210
const GRID_COLS = PLAY_SIZE / CELL; // 9
const GRID_ROWS = PLAY_SIZE / CELL; // 9

const GRASS_A = '#3d6b2e';
const GRASS_B = '#4a7d35';
const OUT_OF_BOUNDS = '#1a1a2e';

export class Renderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  clear(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawBackground(): void {
    const ctx = this.ctx;
    // Out-of-bounds side panels
    ctx.fillStyle = OUT_OF_BOUNDS;
    ctx.fillRect(0, 0, PLAY_OFFSET_X, CANVAS_HEIGHT);
    ctx.fillRect(PLAY_OFFSET_X + PLAY_SIZE, 0, PLAY_OFFSET_X, CANVAS_HEIGHT);
  }

  drawGrid(): void {
    const ctx = this.ctx;

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? GRASS_A : GRASS_B;
        ctx.fillRect(PLAY_OFFSET_X + x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  drawDamageFlash(x: number, y: number, timer: number, text: string): void {
    const ctx = this.ctx;
    const alpha = Math.min(1, timer / 0.3);
    const offsetY = (1.5 - timer) * 24;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.startsWith('+') ? '#66ccff' : '#ff3333';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText(text, x, y - offsetY);
    ctx.restore();
  }

  drawScreenFlash(timer: number): void {
    const ctx = this.ctx;
    const alpha = timer / 0.25 * 0.35; // peak opacity at 35%
    ctx.fillStyle = `rgba(255,0,0,${alpha})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawGameOver(won: boolean, strokes: number, par: number): void {
    const ctx = this.ctx;
    // Dark backdrop over the play area
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(PLAY_OFFSET_X, 0, PLAY_SIZE, CANVAS_HEIGHT);

    const cx = PLAY_OFFSET_X + PLAY_SIZE / 2;
    const cy = CANVAS_HEIGHT / 2;

    if (won) {
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 64px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('HOLE IN!', cx, cy - 35);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Score: ${strokes} (Par ${par})`, cx, cy + 15);
    } else {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 30;
      ctx.fillText("GOLF'D", cx, cy - 15);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(won ? 'Press Enter for next course' : 'Press Enter to retry', cx, cy + 70);
  }

  drawCourseInfo(course: number, strokes: number, par: number): void {
    const ctx = this.ctx;
    const rx = PLAY_OFFSET_X + PLAY_SIZE;
    const cx = rx + PLAY_OFFSET_X / 2;
    let y = 12;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Course ${course}`, cx, y + 16);
    y += 32;

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Par ${par}`, cx, y + 14);
    y += 28;

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Strokes: ${strokes}`, cx, y + 14);

    // How to play at bottom right
    const howY = CANVAS_HEIGHT - 90;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(rx + 8, howY, PLAY_OFFSET_X - 16, 72);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 11px Arial';
    const lines = ['A/D or ←/→ : aim', 'Space: charge & shoot', 'Click left: pick spell'];
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], cx, howY + 18 + i * 18);
    }
  }

  drawWizardStats(hp: number, mp: number, level: number, exp: number, golds: number): void {
    const ctx = this.ctx;
    const pad = 12;
    const barW = PLAY_OFFSET_X - pad * 2;
    const barH = 12;
    const barX = pad;
    let y = 8;
    const maxHP = 10;
    const maxMP = 6;

    // Level and EXP
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Lv ${level}`, barX, y + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`EXP ${exp}`, barX + barW, y + 12);
    y += 16;

    // Golds
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🪙 ${golds} Gs`, barX + barW / 2, y + 10);
    y += 16;

    // HP bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, y, barW, barH);
    const hpPct = hp / maxHP;
    ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, y, barW * hpPct, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`HP ${hp}/${maxHP}`, barX + barW / 2, y + 10);

    // MP bar
    y += 16;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, y, barW, barH);
    const mpPct = mp / maxMP;
    ctx.fillStyle = '#66ccff';
    ctx.fillRect(barX, y, barW * mpPct, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(`MP ${mp}/${maxMP}`, barX + barW / 2, y + 10);

    // RPG stats
    y += 18;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('STR 5  DEX 7', barX, y + 10);
    y += 14;
    ctx.fillText('INT 9  VIT 4', barX, y + 10);
  }

  spellButtonRects(): { type: import('../src/game.js').BallType; x: number; y: number; w: number; h: number }[] {
    const bx = 12;
    const bw = PLAY_OFFSET_X - 24;
    const bh = 44;
    const gap = 10;
    const top = 130; // below stats panel
    return [
      { type: 'regular', x: bx, y: top,                  w: bw, h: bh },
      { type: 'fire',    x: bx, y: top + bh + gap,       w: bw, h: bh },
      { type: 'ice',     x: bx, y: top + (bh + gap) * 2, w: bw, h: bh },
    ];
  }

  drawSpellButtons(selected: import('../src/game.js').BallType, mp: number): void {
    const ctx = this.ctx;
    const buttons = this.spellButtonRects();
    const labels: Record<string, { text: string; cost: number; color: string }> = {
      regular: { text: '⚪ Regular', cost: 0, color: '#ddd' },
      fire:    { text: '🔥 Fireball', cost: 2, color: '#ff6600' },
      ice:     { text: '❄️ Ice Ball', cost: 3, color: '#66ccff' },
    };

    for (const b of buttons) {
      const info = labels[b.type];
      const active = selected === b.type;
      const canAfford = mp >= info.cost;

      // Button background
      ctx.fillStyle = active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = active ? info.color : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 6);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = canAfford ? info.color : 'rgba(255,255,255,0.2)';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(info.text, b.x + b.w / 2, b.y + 20);

      // Cost badge
      ctx.fillStyle = canAfford ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`${info.cost} MP`, b.x + b.w / 2, b.y + 36);
    }
  }

  drawTurnLabel(text: string): void {
    const ctx = this.ctx;
    const cx = PLAY_OFFSET_X + PLAY_SIZE / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(PLAY_OFFSET_X, 0, PLAY_SIZE, 30);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, 22);
  }

  drawWizard(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // Robe / body
    ctx.fillStyle = '#3b2d7a';
    ctx.beginPath();
    ctx.moveTo(-10, 16);
    ctx.lineTo(10, 16);
    ctx.lineTo(14, 28);
    ctx.lineTo(-14, 28);
    ctx.closePath();
    ctx.fill();

    // Robe trim
    ctx.fillStyle = '#5b4daa';
    ctx.beginPath();
    ctx.moveTo(-10, 14);
    ctx.lineTo(10, 14);
    ctx.lineTo(12, 28);
    ctx.lineTo(-12, 28);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#f4cda5';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.fillStyle = '#2a1f6e';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-9, 2);
    ctx.lineTo(9, 2);
    ctx.closePath();
    ctx.fill();

    // Hat brim
    ctx.fillStyle = '#3b2d7a';
    ctx.fillRect(-11, -2, 22, 4);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-3, -1, 1.2, 0, Math.PI * 2);
    ctx.arc(3, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Beard
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(0, 14);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawHole(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // Outer rim (dark)
    ctx.fillStyle = '#1a1a0a';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // Grass lip
    ctx.fillStyle = '#2d5a1e';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hole
    ctx.fillStyle = '#0a0a05';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Flag pole
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, -20);
    ctx.stroke();

    // Flag
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(12, -16);
    ctx.lineTo(0, -12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawMonster(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.8, 1.8);

    // Body shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(2, 4, 13, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(0, 2, 13, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, 4, 8, 0, Math.PI * 2);
    ctx.fill();

    // Left horn
    ctx.fillStyle = '#5c1a10';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-10, -18);
    ctx.lineTo(-2, -6);
    ctx.closePath();
    ctx.fill();

    // Right horn
    ctx.beginPath();
    ctx.moveTo(6, -8);
    ctx.lineTo(10, -18);
    ctx.lineTo(2, -6);
    ctx.closePath();
    ctx.fill();

    // Eyes (white)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-5, -1, 4, 0, Math.PI * 2);
    ctx.arc(5, -1, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-5, -1, 2, 0, Math.PI * 2);
    ctx.arc(5, -1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (fangs)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 6, 3, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-2, 5);
    ctx.lineTo(-1, 10);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 5);
    ctx.lineTo(1, 10);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();

    // Feet
    ctx.fillStyle = '#5c1a10';
    ctx.beginPath();
    ctx.ellipse(-7, 14, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7, 14, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawDragon(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(2.0, 2.0);

    // Wings
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(-22, -14);
    ctx.lineTo(-18, -4);
    ctx.lineTo(-11, 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(22, -14);
    ctx.lineTo(18, -4);
    ctx.lineTo(11, 2);
    ctx.closePath();
    ctx.fill();

    // Tail
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.moveTo(-4, 14);
    ctx.lineTo(-12, 24);
    ctx.lineTo(-2, 18);
    ctx.closePath();
    ctx.fill();
    // Tail spike
    ctx.beginPath();
    ctx.moveTo(-12, 24);
    ctx.lineTo(-16, 28);
    ctx.lineTo(-9, 24);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = '#cc2200';
    ctx.beginPath();
    ctx.arc(0, 2, 14, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#ff4422';
    ctx.beginPath();
    ctx.arc(0, 5, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(-5, -3, 4, 0, Math.PI * 2);
    ctx.arc(5, -3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-5, -3, 2, 0, Math.PI * 2);
    ctx.arc(5, -3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#aa1800';
    ctx.beginPath();
    ctx.ellipse(0, 2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nostrils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-2, 2, 1.2, 0, Math.PI * 2);
    ctx.arc(2, 2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Feet
    ctx.fillStyle = '#661000';
    ctx.beginPath();
    ctx.ellipse(-7, 15, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7, 15, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawFireball(x: number, y: number, timer: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    const alpha = Math.min(1, timer / 0.3);
    ctx.globalAlpha = alpha;

    // Outer glow
    ctx.fillStyle = 'rgba(255,100,0,0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hot center
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawMonsterHUD(x: number, y: number, label: string, hp: number, maxHp: number): void {
    const ctx = this.ctx;
    const barW = 44;
    const barH = 6;
    const barY = y - 36;
    const barX = x - barW / 2;

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Monster ${label}`, x, barY - 4);

    // HP bar background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX, barY, barW, barH);

    // HP bar fill
    const pct = hp / maxHp;
    ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, barW * pct, barH);

    // HP text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(`${hp}/${maxHp}`, x, barY + barH + 12);
  }

  drawBall(x: number, y: number, color = '#fff'): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball glow for special types
    if (color !== '#fff') {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
    }

    // Ball
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Dimples
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(-2, -2, 1.2, 0, Math.PI * 2);
    ctx.arc(2, -2, 1.2, 0, Math.PI * 2);
    ctx.arc(-2, 2, 1.2, 0, Math.PI * 2);
    ctx.arc(2, 2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawAimArrow(fromX: number, fromY: number, angle: number): void {
    const ctx = this.ctx;
    const len = 36;
    const tipX = fromX + Math.cos(angle) * len;
    const tipY = fromY + Math.sin(angle) * len;

    ctx.save();

    // Arrow shaft
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff0';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Arrowhead
    const headLen = 10;
    const headAngle = Math.PI / 5;
    const a1 = angle + Math.PI - headAngle;
    const a2 = angle + Math.PI + headAngle;
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX + Math.cos(a1) * headLen,
      tipY + Math.sin(a1) * headLen,
    );
    ctx.lineTo(
      tipX + Math.cos(a2) * headLen,
      tipY + Math.sin(a2) * headLen,
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawPowerMeter(x: number, y: number, level: number): void {
    const ctx = this.ctx;
    const barX = x + 16;
    const barY = y - 36;
    const barW = 10;
    const barH = 70;

    // Background track
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 5);
    ctx.fill();
    ctx.stroke();

    // Filled portion (bottom-up)
    const fillH = barH * level;
    const fillY = barY + barH - fillH;

    let color: string;
    if (level < 0.33) {
      color = '#e74c3c';
    } else if (level < 0.66) {
      color = '#f39c12';
    } else {
      color = '#2ecc71';
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(barX + 1, fillY, barW - 2, Math.max(0, fillH), 4);
    ctx.fill();

    // Glow at the current level line
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(barX, fillY - 1, barW, 2);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(level * 100)}%`, barX + barW / 2, barY - 7);
  }
}
