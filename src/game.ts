import { Renderer, PLAY_SIZE, PLAY_OFFSET_X, CELL } from './renderer.js';

const SHOT_SPEED = 320;       // px/s max speed
const FRICTION = 180;         // speed lost per second (px/s²)
const STOP_THRESHOLD = 5;     // px/s — treat as stopped below this
const BOUNCE_DAMP = 0.5;      // velocity retained on wall bounce
const POWER_MIN = 0.15;
const POWER_MAX = 1.0;
const POWER_CYCLE_S = 1.4;    // full oscillation period in seconds
const AIM_SPEED = 4;          // radians per second

const GRID_COLS = 9;
const GRID_ROWS = 9;
const MONSTER_ACT_DELAY = 400; // ms between monster actions
const ATTACK_DAMAGE = 1;
const BALL_RADIUS = 6;
const MONSTER_RADIUS = 20;
const HIT_DIST = BALL_RADIUS + MONSTER_RADIUS;
const HOLE_RADIUS = 14;
const HOLE_HIT_DIST = BALL_RADIUS + HOLE_RADIUS;

export type BallType = 'regular' | 'fire' | 'ice';
const BALL_STATS: Record<BallType, { damage: number; mpCost: number; color: string }> = {
  regular: { damage: 1, mpCost: 0, color: '#fff' },
  fire:    { damage: 2, mpCost: 2, color: '#ff6600' },
  ice:     { damage: 3, mpCost: 3, color: '#66ccff' },
};
const MAX_MP = 6;
const MP_REGEN = 1;
const FIREBALL_SPEED = 300;   // px/s
const FIREBALL_DAMAGE = 2;

export type PowerPhase = 'idle' | 'charging';
type TurnPhase = 'player' | 'monsters';
type MonsterKind = 'imp' | 'dragon';

interface Monster {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  label: string;
  kind: MonsterKind;
}

interface Fireball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number; // seconds until it fizzles
}

function cellCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: PLAY_OFFSET_X + col * CELL + CELL / 2,
    y: row * CELL + CELL / 2,
  };
}

function cellOf(px: number, py: number): { col: number; row: number } {
  return {
    col: Math.floor((px - PLAY_OFFSET_X) / CELL),
    row: Math.floor(py / CELL),
  };
}

function randomCell(excludeCol: number, excludeRow: number): { x: number; y: number } {
  let col: number, row: number;
  do {
    col = Math.floor(Math.random() * GRID_COLS);
    row = Math.floor(Math.random() * GRID_ROWS);
  } while (col === excludeCol && row === excludeRow);
  return cellCenter(col, row);
}

export class Game {
  private renderer: Renderer;
  private wizardX: number;
  private wizardY: number;
  private aimAngle: number;
  wizardHP = 10;
  wizardMP = MAX_MP;
  wizardLevel = 1;
  wizardExp = 0;
  golds = 0;
  selectedBall: BallType = 'regular';
  strokeCount = 0;
  courseNumber = 1;
  readonly coursePar = 3;

  // Ball state
  private ballX: number;
  private ballY: number;
  private ballVX = 0;
  private ballVY = 0;
  private ballMoving = false;
  private prevTimestamp = 0;

  // Aim input: -1 (left), 0 (none), 1 (right)
  private aimInput: -1 | 0 | 1 = 0;

  // Power meter
  powerPhase: PowerPhase = 'idle';
  powerLevel = POWER_MIN;
  private chargeStartTime = 0;

  // Turn system
  private turnPhase: TurnPhase = 'player';
  private monsterActIndex = 0;
  private monsterActTimer = 0;

  // End state
  gameOver = false;
  private won = false;

  // Feedback effects
  private damageFlashes: { x: number; y: number; timer: number; text: string }[] = [];
  private screenFlash = 0; // seconds remaining for red vignette

  // Hole
  private holeX = 0;
  private holeY = 0;

  private monsters: Monster[] = [];
  private fireballs: Fireball[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.renderer = new Renderer(ctx);
    this.wizardX = PLAY_OFFSET_X + PLAY_SIZE / 2;
    this.wizardY = PLAY_SIZE / 2;
    this.aimAngle = -Math.PI / 2;
    this.ballX = this.wizardX + 18;
    this.ballY = this.wizardY + 12;

    const m1 = { ...randomCell(4, 4), hp: 3, maxHp: 3, label: 'A', kind: 'imp' as MonsterKind };
    let m2 = { ...randomCell(4, 4), hp: 3, maxHp: 3, label: 'B', kind: 'imp' as MonsterKind };
    while (m2.x === m1.x && m2.y === m1.y) {
      m2 = { ...randomCell(4, 4), hp: 3, maxHp: 3, label: 'B', kind: 'imp' };
    }
    // Dragon: more HP, different label
    let d = { ...randomCell(4, 4), hp: 5, maxHp: 5, label: 'D', kind: 'dragon' as MonsterKind };
    while ((d.x === m1.x && d.y === m1.y) || (d.x === m2.x && d.y === m2.y)) {
      d = { ...randomCell(4, 4), hp: 5, maxHp: 5, label: 'D', kind: 'dragon' };
    }
    this.monsters = [m1, m2, d];
    this.placeHole();
  }

  private placeHole(): void {
    const occupied = new Set<string>();
    occupied.add('4,4'); // wizard start
    for (const m of this.monsters) {
      const c = cellOf(m.x, m.y);
      occupied.add(`${c.col},${c.row}`);
    }
    let col: number, row: number;
    do {
      col = Math.floor(Math.random() * GRID_COLS);
      row = Math.floor(Math.random() * GRID_ROWS);
    } while (occupied.has(`${col},${row}`));
    const center = cellCenter(col, row);
    this.holeX = center.x;
    this.holeY = center.y;
  }

  private get isPlayerTurn(): boolean {
    return this.turnPhase === 'player' && this.powerPhase === 'idle' && !this.ballMoving;
  }

  setAimInput(dir: -1 | 0 | 1): void {
    if (this.gameOver) return;
    this.aimInput = dir;
  }

  selectBall(type: BallType): void {
    if (this.gameOver) return;
    if (!this.isPlayerTurn) return;
    const stats = BALL_STATS[type];
    if (this.wizardMP >= stats.mpCost) {
      this.selectedBall = type;
    }
  }

  debugWin(): void {
    this.monsters = [];
    this.fireballs = [];
  }

  debugKillPlayer(): void {
    this.wizardHP = 0;
  }

  reset(): void {
    this.fullReset();
  }

  retry(): void {
    if (!this.gameOver) return;
    if (this.won) {
      this.nextCourse();
    } else {
      this.fullReset();
    }
  }

  private fullReset(): void {
    this.wizardHP = 10;
    this.wizardMP = MAX_MP;
    this.wizardLevel = 1;
    this.wizardExp = 0;
    this.golds = 0;
    this.courseNumber = 1;
    this.courseReset();
  }

  private nextCourse(): void {
    this.courseNumber++;
    // HP persists between courses
    this.courseReset();
  }

  private courseReset(): void {
    // HP and MP persist between courses
    this.selectedBall = 'regular';
    this.strokeCount = 0;
    this.gameOver = false;
    this.won = false;
    this.ballX = PLAY_OFFSET_X + PLAY_SIZE / 2 + 18;
    this.ballY = PLAY_SIZE / 2 + 12;
    this.ballVX = 0;
    this.ballVY = 0;
    this.ballMoving = false;
    this.powerPhase = 'idle';
    this.powerLevel = POWER_MIN;
    this.turnPhase = 'player';
    this.aimAngle = -Math.PI / 2;
    this.aimInput = 0;
    this.fireballs = [];
    this.damageFlashes = [];
    this.screenFlash = 0;
    this.wizardX = PLAY_OFFSET_X + PLAY_SIZE / 2;
    this.wizardY = PLAY_SIZE / 2;

    const m1 = { ...randomCell(4, 4), hp: 3, maxHp: 3, label: 'A', kind: 'imp' as MonsterKind };
    let m2 = { ...randomCell(4, 4), hp: 3, maxHp: 3, label: 'B', kind: 'imp' as MonsterKind };
    while (m2.x === m1.x && m2.y === m1.y) {
      m2 = { ...randomCell(4, 4), hp: 3, maxHp: 3, label: 'B', kind: 'imp' };
    }
    let d = { ...randomCell(4, 4), hp: 5, maxHp: 5, label: 'D', kind: 'dragon' as MonsterKind };
    while ((d.x === m1.x && d.y === m1.y) || (d.x === m2.x && d.y === m2.y)) {
      d = { ...randomCell(4, 4), hp: 5, maxHp: 5, label: 'D', kind: 'dragon' };
    }
    this.monsters = [m1, m2, d];
    this.placeHole();
  }

  handleClick(sx: number, sy: number): void {
    if (!this.isPlayerTurn) return;
    // Spell buttons occupy the left panel area
    if (sx <= PLAY_OFFSET_X) {
      const btnInfo = this.renderer.spellButtonRects();
      for (const b of btnInfo) {
        if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
          this.selectBall(b.type);
          return;
        }
      }
    }
  }

  /** First press → start charging. Second press → shoot. */
  spacePressed(): void {
    if (this.gameOver) return;
    if (this.turnPhase !== 'player' || this.ballMoving) return;

    if (this.powerPhase === 'idle') {
      this.powerPhase = 'charging';
      this.chargeStartTime = performance.now();
    } else if (this.powerPhase === 'charging') {
      this.shoot();
    }
  }

  private shoot(): void {
    const stats = BALL_STATS[this.selectedBall];
    if (this.wizardMP < stats.mpCost) return;

    this.wizardMP -= stats.mpCost;
    this.strokeCount++;
    const speed = POWER_MIN + this.powerLevel * (POWER_MAX - POWER_MIN);
    this.ballVX = Math.cos(this.aimAngle) * SHOT_SPEED * speed;
    this.ballVY = Math.sin(this.aimAngle) * SHOT_SPEED * speed;
    this.ballMoving = true;
    this.powerPhase = 'idle';
    this.powerLevel = POWER_MIN;
  }

  update(timestamp: number): void {
    // Check end conditions
    if (this.wizardHP <= 0) {
      this.gameOver = true;
      this.won = false;
      this.prevTimestamp = timestamp;
      return;
    }

    const dt = Math.min((timestamp - this.prevTimestamp) / 1000, 0.05);

    // Continuous aim rotation while idle
    if (this.isPlayerTurn && this.aimInput !== 0) {
      this.aimAngle += this.aimInput * AIM_SPEED * dt;
    }

    // Oscillate power meter while charging
    if (this.powerPhase === 'charging') {
      const elapsed = (timestamp - this.chargeStartTime) / 1000;
      this.powerLevel = (Math.sin(elapsed / POWER_CYCLE_S * Math.PI * 2) + 1) / 2;
    }

    // Update damage flash timers
    this.damageFlashes = this.damageFlashes.filter(f => {
      f.timer -= dt;
      return f.timer > 0;
    });
    this.screenFlash = Math.max(0, this.screenFlash - dt);

    // Update fireballs (always, regardless of turn)
    this.updateFireballs(dt);

    // Monster turn timer
    if (this.turnPhase === 'monsters') {
      this.updateMonsterTurn(dt);
    }

    if (!this.ballMoving) {
      this.prevTimestamp = timestamp;
      return;
    }

    this.prevTimestamp = timestamp;

    // Move ball
    this.ballX += this.ballVX * dt;
    this.ballY += this.ballVY * dt;

    // Apply friction (deceleration)
    let speed = Math.sqrt(this.ballVX ** 2 + this.ballVY ** 2);
    if (speed > 0) {
      const newSpeed = Math.max(0, speed - FRICTION * dt);
      const ratio = newSpeed / speed;
      this.ballVX *= ratio;
      this.ballVY *= ratio;
    }

    // Check hole
    const hdx = this.ballX - this.holeX;
    const hdy = this.ballY - this.holeY;
    if (Math.sqrt(hdx * hdx + hdy * hdy) < HOLE_HIT_DIST) {
      this.gameOver = true;
      this.won = true;
      return;
    }

    // Check monster collisions
    this.checkMonsterCollisions();

    // Clamp to play area
    const left = PLAY_OFFSET_X;
    const right = PLAY_OFFSET_X + PLAY_SIZE;
    const top = 0;
    const bottom = PLAY_SIZE;

    if (this.ballX < left || this.ballX > right) {
      this.ballVX *= -BOUNCE_DAMP;
      this.ballX = Math.max(left, Math.min(right, this.ballX));
    }
    if (this.ballY < top || this.ballY > bottom) {
      this.ballVY *= -BOUNCE_DAMP;
      this.ballY = Math.max(top, Math.min(bottom, this.ballY));
    }

    // Stop if slow enough (recompute speed after all changes)
    speed = Math.sqrt(this.ballVX ** 2 + this.ballVY ** 2);
    if (speed < STOP_THRESHOLD) {
      this.ballVX = 0;
      this.ballVY = 0;
      this.ballMoving = false;
      this.snapToCell();
      this.startMonsterTurn();
    }
  }

  private startPlayerTurn(): void {
    this.turnPhase = 'player';
    // Regen MP
    if (this.wizardMP < MAX_MP) {
      this.wizardMP = Math.min(MAX_MP, this.wizardMP + MP_REGEN);
      this.damageFlashes.push({
        x: this.wizardX,
        y: this.wizardY - 30,
        timer: 1.5,
        text: `+${MP_REGEN} MP`,
      });
    }
  }

  private occupiedCellKeys(excludeIndex: number): Set<string> {
    const set = new Set<string>();
    for (let i = 0; i < this.monsters.length; i++) {
      if (i === excludeIndex) continue;
      const c = cellOf(this.monsters[i].x, this.monsters[i].y);
      set.add(`${c.col},${c.row}`);
    }
    // Also block wizard's cell (wizard occupies a cell)
    const wc = cellOf(this.wizardX, this.wizardY);
    set.add(`${wc.col},${wc.row}`);
    return set;
  }

  private startMonsterTurn(): void {
    if (this.monsters.length === 0) return;
    this.turnPhase = 'monsters';
    this.monsterActIndex = 0;
    this.monsterActTimer = MONSTER_ACT_DELAY;
  }

  private updateMonsterTurn(dt: number): void {
    if (this.turnPhase !== 'monsters') return;

    this.monsterActTimer -= dt * 1000;
    if (this.monsterActTimer > 0) return;

    // Current monster acts
    const m = this.monsters[this.monsterActIndex];
    const wCell = cellOf(this.wizardX, this.wizardY);
    const mCell = cellOf(m.x, m.y);
    const dx = Math.abs(mCell.col - wCell.col);
    const dy = Math.abs(mCell.row - wCell.row);
    const adjacent = (dx + dy) === 1;

    if (m.kind === 'dragon' && Math.random() < 0.8) {
      // Dragon shoots fireball directly toward wizard (80% chance)
      const wcx = this.wizardX;
      const wcy = this.wizardY;
      const ddx = wcx - m.x;
      const ddy = wcy - m.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      const vx = (ddx / dist) * FIREBALL_SPEED;
      const vy = (ddy / dist) * FIREBALL_SPEED;
      this.fireballs.push({
        x: m.x + (ddx / dist) * CELL,
        y: m.y + (ddy / dist) * CELL,
        vx,
        vy,
        timer: 2.0,
      });
    } else if (adjacent) {
      // Melee attack
      this.wizardHP = Math.max(0, this.wizardHP - ATTACK_DAMAGE);
      this.damageFlashes.push({
        x: this.wizardX,
        y: this.wizardY - 20,
        timer: 1.2,
        text: '-1 HP!',
      });
      this.screenFlash = 0.25;
    } else {
      // Move to random adjacent cell (avoid other monsters and wizard ball position)
      const occupied = this.occupiedCellKeys(this.monsterActIndex);
      const dirs = [
        { col: 0, row: -1 },
        { col: 0, row: 1 },
        { col: -1, row: 0 },
        { col: 1, row: 0 },
      ];
      const valid = dirs.filter(d => {
        const nc = mCell.col + d.col;
        const nr = mCell.row + d.row;
        if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) return false;
        return !occupied.has(`${nc},${nr}`);
      });
      if (valid.length > 0) {
        const pick = valid[Math.floor(Math.random() * valid.length)];
        const center = cellCenter(mCell.col + pick.col, mCell.row + pick.row);
        m.x = center.x;
        m.y = center.y;
      }
    }

    this.monsterActIndex++;
    if (this.monsterActIndex >= this.monsters.length) {
      this.startPlayerTurn();
    } else {
      this.monsterActTimer = MONSTER_ACT_DELAY;
    }
  }

  private updateFireballs(dt: number): void {
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.x += fb.vx * dt;
      fb.y += fb.vy * dt;
      fb.timer -= dt;

      // Check collision with wizard
      const wcx = this.wizardX; // wizard center-ish
      const wcy = this.wizardY;
      const dist = Math.sqrt((fb.x - wcx) ** 2 + (fb.y - wcy) ** 2);
      if (dist < 25) {
        this.wizardHP = Math.max(0, this.wizardHP - FIREBALL_DAMAGE);
        this.damageFlashes.push({
          x: wcx, y: wcy - 20, timer: 1.2, text: `-${FIREBALL_DAMAGE} HP!`,
        });
        this.screenFlash = 0.25;
        this.fireballs.splice(i, 1);
        continue;
      }

      // Remove if out of play area or expired
      if (fb.timer <= 0 ||
          fb.x < PLAY_OFFSET_X || fb.x > PLAY_OFFSET_X + PLAY_SIZE ||
          fb.y < 0 || fb.y > PLAY_SIZE) {
        this.fireballs.splice(i, 1);
      }
    }
  }

  private checkMonsterCollisions(): void {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      const dx = this.ballX - m.x;
      const dy = this.ballY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < HIT_DIST) {
        // Elemental matchups
        let dmg = BALL_STATS[this.selectedBall].damage;
        let dmgText = `-${dmg} HP!`;
        if (m.kind === 'dragon') {
          if (this.selectedBall === 'ice') {
            dmg *= 2;
            dmgText = `-${dmg} HP! ❄️x2`;
          } else if (this.selectedBall === 'fire') {
            dmg = 0;
            dmgText = 'RESIST! 🔥';
          }
        } else if (m.kind === 'imp') {
          if (this.selectedBall === 'fire') {
            dmg *= 2;
            dmgText = `-${dmg} HP! 🔥x2`;
          }
        }
        if (dmg > 0) {
          m.hp -= dmg;
        }
        this.damageFlashes.push({
          x: m.x,
          y: m.y - 20,
          timer: 1.0,
          text: dmgText,
        });
        // Bounce ball away from monster
        if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const speed = Math.sqrt(this.ballVX ** 2 + this.ballVY ** 2);
          // Reflect velocity and push ball outside
          const dot = this.ballVX * nx + this.ballVY * ny;
          if (dot < 0) {
            this.ballVX -= 2 * dot * nx;
            this.ballVY -= 2 * dot * ny;
          }
          // Push ball outside monster
          const overlap = HIT_DIST - dist;
          this.ballX += nx * overlap;
          this.ballY += ny * overlap;
          // Dampen
          this.ballVX *= 0.7;
          this.ballVY *= 0.7;
        }
        // Remove dead monsters
        if (m.hp <= 0) {
          this.monsters.splice(i, 1);
        }
      }
    }
  }

  private snapToCell(): void {
    // Snap ball to cell center, wizard offset beside it
    const col = Math.floor((this.ballX - PLAY_OFFSET_X) / CELL);
    const row = Math.floor(this.ballY / CELL);
    const cx = PLAY_OFFSET_X + col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    this.ballX = cx;
    this.ballY = cy;
    this.wizardX = cx - 18;
    this.wizardY = cy - 12;
  }

  draw(): void {
    this.renderer.clear();
    this.renderer.drawBackground();
    this.renderer.drawGrid();

    if (this.gameOver) {
      this.renderer.drawGameOver(this.won, this.strokeCount, this.coursePar);
      return;
    }
    this.renderer.drawHole(this.holeX, this.holeY);
    this.renderer.drawBall(this.ballX, this.ballY, BALL_STATS[this.selectedBall].color);
    if (!this.ballMoving) {
      this.renderer.drawAimArrow(this.ballX, this.ballY, this.aimAngle);
    }
    if (this.isPlayerTurn) {
      this.renderer.drawTurnLabel('Player turn');
      this.renderer.drawSpellButtons(this.selectedBall, this.wizardMP);
    } else if (this.turnPhase === 'monsters') {
      this.renderer.drawTurnLabel('Monster turn');
    }
    this.renderer.drawCourseInfo(this.courseNumber, this.strokeCount, this.coursePar);
    this.renderer.drawWizardStats(this.wizardHP, this.wizardMP, this.wizardLevel, this.wizardExp, this.golds);
    if (this.powerPhase === 'charging') {
      this.renderer.drawPowerMeter(this.ballX, this.ballY, this.powerLevel);
    }
    for (const m of this.monsters) {
      if (m.kind === 'dragon') {
        this.renderer.drawDragon(m.x, m.y);
      } else {
        this.renderer.drawMonster(m.x, m.y);
      }
      this.renderer.drawMonsterHUD(m.x, m.y, m.label, m.hp, m.maxHp);
    }
    for (const fb of this.fireballs) {
      this.renderer.drawFireball(fb.x, fb.y, fb.timer);
    }
    this.renderer.drawWizard(this.wizardX, this.wizardY);

    // Damage effects
    for (const f of this.damageFlashes) {
      this.renderer.drawDamageFlash(f.x, f.y, f.timer, f.text);
    }
    if (this.screenFlash > 0) {
      this.renderer.drawScreenFlash(this.screenFlash);
    }
  }
}
