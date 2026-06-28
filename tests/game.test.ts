import { describe, it, expect } from 'vitest';
import { Game } from '../src/game.js';
import { PLAY_SIZE, PLAY_OFFSET_X, CELL } from '../src/renderer.js';

function makeGame(): Game {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  return new Game(canvas);
}

function priv(game: Game): any {
  return game as any;
}

function cellOf(px: number, py: number): { col: number; row: number } {
  return {
    col: Math.floor((px - PLAY_OFFSET_X) / CELL),
    row: Math.floor(py / CELL),
  };
}

/** Set aim to one of the 8 cardinal/diagonal directions. 0=up, 1=NE, ..., 7=NW */
function aimDir(game: Game, dir: number): void {
  const angle = -Math.PI / 2 + dir * (Math.PI / 4);
  priv(game).aimAngle = angle;
}

/** Charge power meter to a specific level and shoot. */
function chargeAndShoot(game: Game, power: number): void {
  const g = priv(game);
  let t = 16;
  game.update(t); // init prevTimestamp

  g.powerPhase = 'charging';
  t += 16;
  game.update(t);

  // Set chargeStartTime so powerLevel reaches `power`
  const cycle = 1.4;
  let elapsed = Math.asin(2 * power - 1) * cycle / (Math.PI * 2);
  if (elapsed < 0) {
    elapsed = (Math.PI - Math.asin(2 * power - 1)) * cycle / (Math.PI * 2);
  }
  g.chargeStartTime = t - elapsed * 1000;
  t += 16;
  game.update(t);
  game.spacePressed();
}

describe('Game', () => {
  describe('wizard starting position', () => {
    it('starts at the center of the play square', () => {
      const g = priv(makeGame());
      expect(g.wizardX).toBe(PLAY_OFFSET_X + PLAY_SIZE / 2); // 480
      expect(g.wizardY).toBe(PLAY_SIZE / 2); // 270
    });

    it('wizard is inside the play area', () => {
      const g = priv(makeGame());
      expect(g.wizardX).toBeGreaterThanOrEqual(PLAY_OFFSET_X);
      expect(g.wizardX).toBeLessThanOrEqual(PLAY_OFFSET_X + PLAY_SIZE);
      expect(g.wizardY).toBeGreaterThanOrEqual(0);
      expect(g.wizardY).toBeLessThanOrEqual(PLAY_SIZE);
    });
  });

  describe('ball initial position', () => {
    it('starts at wizard feet offset', () => {
      const g = priv(makeGame());
      expect(g.ballX).toBe(g.wizardX + 18);
      expect(g.ballY).toBe(g.wizardY + 12);
    });

    it('starts inside the play area', () => {
      const g = priv(makeGame());
      expect(g.ballX).toBeGreaterThan(PLAY_OFFSET_X);
      expect(g.ballX).toBeLessThan(PLAY_OFFSET_X + PLAY_SIZE);
      expect(g.ballY).toBeGreaterThan(0);
      expect(g.ballY).toBeLessThan(PLAY_SIZE);
    });

    it('starts not moving', () => {
      const g = priv(makeGame());
      expect(g.ballMoving).toBe(false);
      expect(g.ballVX).toBe(0);
      expect(g.ballVY).toBe(0);
    });
  });

  describe('aim angle', () => {
    it('starts aiming up (-π/2)', () => {
      const g = priv(makeGame());
      expect(g.aimAngle).toBeCloseTo(-Math.PI / 2);
    });

    it('continuous rotation clockwise', () => {
      const game = makeGame();
      const g = priv(game);
      const before = g.aimAngle;

      game.setAimInput(1);
      game.update(16); // 16ms frame
      // AIM_SPEED = 4 rad/s, dt = 0.016 → change = 0.064 rad
      expect(g.aimAngle).toBeGreaterThan(before);
    });

    it('continuous rotation counter-clockwise', () => {
      const game = makeGame();
      const g = priv(game);
      const before = g.aimAngle;

      game.setAimInput(-1);
      game.update(16);
      expect(g.aimAngle).toBeLessThan(before);
    });

    it('full 360° rotation with enough time', () => {
      const game = makeGame();
      const g = priv(game);
      const original = g.aimAngle;

      // AIM_SPEED = 4 rad/s, 2π / 4 = ~1.57s for a full rotation
      game.setAimInput(1);
      let t = 0;
      for (let i = 0; i < 100; i++) {
        t += 16;
        game.update(t);
      }
      // Should have rotated about 4 * 1.6 = 6.4 rad ≈ 366°
      expect(g.aimAngle - original).toBeCloseTo(2 * Math.PI, -1); // within ~0.1
    });

    it('no rotation with zero input', () => {
      const game = makeGame();
      const g = priv(game);
      const before = g.aimAngle;
      game.update(16);
      game.update(32);
      expect(g.aimAngle).toBe(before);
    });

    it('cannot rotate while charging', () => {
      const game = makeGame();
      const g = priv(game);
      const before = g.aimAngle;

      game.spacePressed(); // start charging
      game.setAimInput(1);
      game.update(16);
      expect(g.aimAngle).toBe(before); // unchanged
    });

    it('cannot rotate while ball is moving', () => {
      const game = makeGame();
      const g = priv(game);

      // Rotate a bit, then charge and shoot
      game.setAimInput(1);
      let t = 16; game.update(t);
      game.setAimInput(0);
      game.spacePressed();
      t += 16; game.update(t);
      g.chargeStartTime = t - 350; // set power high
      t += 16; game.update(t);
      game.spacePressed();
      expect(g.ballMoving).toBe(true);

      const angleDuringFlight = g.aimAngle;
      game.setAimInput(1);
      t += 16; game.update(t);
      expect(g.aimAngle).toBe(angleDuringFlight); // unchanged
    });
  });

  describe('power meter', () => {
    it('starts idle with min power', () => {
      const g = priv(makeGame());
      expect(g.powerPhase).toBe('idle');
      expect(g.powerLevel).toBeCloseTo(0.15);
    });

    it('first space press starts charging', () => {
      const game = makeGame();
      const g = priv(game);
      game.spacePressed();
      expect(g.powerPhase).toBe('charging');
    });

    it('power oscillates while charging', () => {
      const game = makeGame();
      const g = priv(game);
      game.spacePressed();

      // After ~0.35s (quarter of 1.4s cycle) power should be near peak
      game.update(g.chargeStartTime + 350);
      expect(g.powerLevel).toBeGreaterThan(0.95);

      // After ~1.05s (3/4 cycle) power should be near min
      game.update(g.chargeStartTime + 1050);
      expect(g.powerLevel).toBeLessThan(0.05);
    });

    it('second space press shoots and resets power', () => {
      const game = makeGame();
      const g = priv(game);

      game.spacePressed(); // start charging
      game.update(g.chargeStartTime + 350); // power near peak
      const powerAtShot = g.powerLevel;

      game.spacePressed(); // shoot!
      expect(g.powerPhase).toBe('idle');
      expect(g.powerLevel).toBeCloseTo(0.15); // reset
      expect(g.ballMoving).toBe(true);

      // Speed should reflect the power
      const speed = Math.sqrt(g.ballVX ** 2 + g.ballVY ** 2);
      const expected = 320 * (0.15 + powerAtShot * 0.85);
      expect(speed).toBeCloseTo(expected, -1);
    });

    it('space press ignored while ball is moving', () => {
      const game = makeGame();
      const g = priv(game);

      // Charge and shoot with consistent timestamps
      let t = 16; game.update(t);
      game.spacePressed();
      t += 16; game.update(t);
      g.chargeStartTime = t - 200; // mid power
      t += 16; game.update(t);
      game.spacePressed();
      expect(g.ballMoving).toBe(true);

      // Space during flight should do nothing
      game.spacePressed();
      expect(g.powerPhase).toBe('idle');
    });

    it('cannot rotate aim while charging', () => {
      const game = makeGame();
      const g = priv(game);

      const before = g.aimAngle;
      game.spacePressed(); // start charging
      game.setAimInput(1);
      game.update(16);
      expect(g.aimAngle).toBe(before); // unchanged
    });
  });

  describe('shooting', () => {
    it('full power shot moves ball faster than weak shot', () => {
      const game1 = makeGame();
      chargeAndShoot(game1, 1.0);
      const speedFull = Math.sqrt(priv(game1).ballVX ** 2 + priv(game1).ballVY ** 2);

      const game2 = makeGame();
      chargeAndShoot(game2, 0.2);
      const speedWeak = Math.sqrt(priv(game2).ballVX ** 2 + priv(game2).ballVY ** 2);

      expect(speedFull).toBeGreaterThan(speedWeak * 2);
    });

    it('shooting up moves ball upward', () => {
      const game = makeGame();
      chargeAndShoot(game, 0.5);
      const g = priv(game);
      expect(g.ballMoving).toBe(true);
      expect(g.ballVY).toBeLessThan(0);
      expect(g.ballVX).toBeCloseTo(0);
    });

    it('shooting right moves ball right', () => {
      const game = makeGame();
      aimDir(game, 2); // E
      chargeAndShoot(game, 0.5);
      const g = priv(game);
      expect(g.ballVX).toBeGreaterThan(0);
      expect(g.ballVY).toBeCloseTo(0);
    });

    it('shooting diagonal moves ball in both axes', () => {
      const game = makeGame();
      aimDir(game, 1); // NE
      chargeAndShoot(game, 0.5);
      const g = priv(game);
      expect(g.ballVX).toBeGreaterThan(0);
      expect(g.ballVY).toBeLessThan(0);
    });
  });

  describe('ball physics', () => {
    function quickShoot(game: Game, steps: number): number {
      aimDir(game, steps);
      let t = 16; game.update(t); // init
      game.spacePressed();
      t += 16; game.update(t);
      priv(game).chargeStartTime = t - 350;
      t += 16; game.update(t);
      game.spacePressed();
      return t;
    }

    it('ball slows down over time', () => {
      const game = makeGame();
      const g = priv(game);

      let t = quickShoot(game, 2); // aim E
      const initialSpeed = Math.sqrt(g.ballVX ** 2 + g.ballVY ** 2);

      for (let i = 0; i < 30; i++) {
        t += 16;
        game.update(t);
      }
      const laterSpeed = Math.sqrt(g.ballVX ** 2 + g.ballVY ** 2);
      expect(laterSpeed).toBeLessThan(initialSpeed);
    });

    it('ball eventually stops', () => {
      const game = makeGame();
      const g = priv(game);

      let t = quickShoot(game, 0); // shoot up
      for (let i = 0; i < 500; i++) {
        t += 16;
        game.update(t);
        if (!g.ballMoving) break;
      }
      expect(g.ballMoving).toBe(false);
      expect(g.ballVX).toBe(0);
      expect(g.ballVY).toBe(0);
    });

    it('ball bounces off left boundary', () => {
      const game = makeGame();

      aimDir(game, 6); // aim W
      let t = 16; game.update(t); // init
      game.spacePressed();
      t += 16; game.update(t);
      priv(game).chargeStartTime = t - 350;
      t += 16; game.update(t);
      game.spacePressed();

      for (let i = 0; i < 200; i++) {
        t += 16;
        game.update(t);
        if (!priv(game).ballMoving) break;
      }
      expect(priv(game).ballX).toBeGreaterThanOrEqual(PLAY_OFFSET_X);
      expect(priv(game).ballX).toBeLessThanOrEqual(PLAY_OFFSET_X + PLAY_SIZE);
    });

    it('ball bounces off right boundary', () => {
      const game = makeGame();

      aimDir(game, 2); // aim E
      let t = 16; game.update(t); // init
      game.spacePressed();
      t += 16; game.update(t);
      priv(game).chargeStartTime = t - 350;
      t += 16; game.update(t);
      game.spacePressed();

      for (let i = 0; i < 200; i++) {
        t += 16;
        game.update(t);
        if (!priv(game).ballMoving) break;
      }
      expect(priv(game).ballX).toBeGreaterThanOrEqual(PLAY_OFFSET_X);
      expect(priv(game).ballX).toBeLessThanOrEqual(PLAY_OFFSET_X + PLAY_SIZE);
    });
  });

  describe('snap to cell', () => {
    function shootAndWait(game: Game): void {
      aimDir(game, 2); // aim E
      let t = 16; game.update(t); // init
      game.spacePressed();
      t += 16; game.update(t);
      priv(game).chargeStartTime = t - 350;
      t += 16; game.update(t);
      game.spacePressed();

      for (let i = 0; i < 300; i++) {
        t += 16;
        game.update(t);
        if (!priv(game).ballMoving) break;
      }
    }

    it('ball snaps to cell center after stopping', () => {
      const game = makeGame();
      const g = priv(game);
      shootAndWait(game);

      expect(g.ballMoving).toBe(false);
      const col = Math.floor((g.ballX - PLAY_OFFSET_X) / CELL);
      const row = Math.floor(g.ballY / CELL);
      const cx = PLAY_OFFSET_X + col * CELL + CELL / 2;
      const cy = row * CELL + CELL / 2;
      expect(g.ballX).toBe(cx);
      expect(g.ballY).toBe(cy);
    });

    it('wizard is offset from ball after snapping', () => {
      const game = makeGame();
      const g = priv(game);
      shootAndWait(game);

      expect(g.wizardX).toBe(g.ballX - 18);
      expect(g.wizardY).toBe(g.ballY - 12);
    });

    it('wizard stays put while ball is in flight', () => {
      const game = makeGame();
      const g = priv(game);

      const startWizardX = g.wizardX;
      const startWizardY = g.wizardY;
      const startBallX = g.ballX;

      aimDir(game, 2); // aim E
      let t = 16; game.update(t); // init
      game.spacePressed();
      t += 16; game.update(t);
      g.chargeStartTime = t - 350;
      t += 16; game.update(t);
      game.spacePressed();

      for (let i = 0; i < 5; i++) {
        t += 16;
        game.update(t);
      }

      expect(g.wizardX).toBe(startWizardX);
      expect(g.wizardY).toBe(startWizardY);
      expect(g.ballX).not.toBe(startBallX);
    });
  });

  describe('monsters', () => {
    it('spawns 3 monsters (2 imps + 1 dragon)', () => {
      const g = priv(makeGame());
      expect(g.monsters.length).toBe(3);
    });

    it('monsters have labels A, B, D', () => {
      const g = priv(makeGame());
      expect(g.monsters[0].label).toBe('A');
      expect(g.monsters[1].label).toBe('B');
      expect(g.monsters[2].label).toBe('D');
      expect(g.monsters[2].kind).toBe('dragon');
    });

    it('monsters have correct HP', () => {
      const g = priv(makeGame());
      // Imps have 3 HP, dragon has 5 HP
      expect(g.monsters[0].hp).toBe(3);
      expect(g.monsters[0].maxHp).toBe(3);
      expect(g.monsters[1].hp).toBe(3);
      expect(g.monsters[1].maxHp).toBe(3);
      expect(g.monsters[2].hp).toBe(5);
      expect(g.monsters[2].maxHp).toBe(5);
    });

    it('monsters are in different cells', () => {
      const g = priv(makeGame());
      const m1 = g.monsters[0];
      const m2 = g.monsters[1];
      expect(m1.x === m2.x && m1.y === m2.y).toBe(false);
    });

    it('monsters are at cell centers', () => {
      const g = priv(makeGame());
      for (const m of g.monsters) {
        const col = (m.x - PLAY_OFFSET_X) / CELL;
        const row = m.y / CELL;
        expect(col % 1).toBeCloseTo(0.5, 5);
        expect(row % 1).toBeCloseTo(0.5, 5);
      }
    });

    it('monsters are not at the center cell (wizard start)', () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const g = priv(makeGame());
        const centerX = PLAY_OFFSET_X + 4 * CELL + CELL / 2;
        const centerY = 4 * CELL + CELL / 2;
        for (const m of g.monsters) {
          expect(m.x === centerX && m.y === centerY).toBe(false);
        }
      }
    });

    it('monsters are inside the play area', () => {
      const g = priv(makeGame());
      for (const m of g.monsters) {
        expect(m.x).toBeGreaterThanOrEqual(PLAY_OFFSET_X);
        expect(m.x).toBeLessThanOrEqual(PLAY_OFFSET_X + PLAY_SIZE);
        expect(m.y).toBeGreaterThanOrEqual(0);
        expect(m.y).toBeLessThanOrEqual(PLAY_SIZE);
      }
    });
  });

  describe('wizard HP / MP / strokes', () => {
    it('starts at 10 HP', () => {
      expect(makeGame().wizardHP).toBe(10);
    });

    it('starts at max MP (6)', () => {
      expect(makeGame().wizardMP).toBe(6);
    });

    it('stroke count starts at 0', () => {
      expect(makeGame().strokeCount).toBe(0);
    });

    it('course starts at 1', () => {
      expect(makeGame().courseNumber).toBe(1);
    });

    it('level starts at 1, exp at 0', () => {
      const game = makeGame();
      expect(game.wizardLevel).toBe(1);
      expect(game.wizardExp).toBe(0);
    });

    it('course par is 3', () => {
      expect(makeGame().coursePar).toBe(3);
    });
  });

  describe('ball types', () => {
    it('starts with regular ball selected', () => {
      expect(makeGame().selectedBall).toBe('regular');
    });

    it('can switch to fireball if enough MP', () => {
      const game = makeGame();
      game.selectBall('fire');
      expect(game.selectedBall).toBe('fire');
    });

    it('cannot switch to ice ball without enough MP', () => {
      const game = makeGame();
      game.wizardMP = 2;
      game.selectBall('ice');
      expect(game.selectedBall).toBe('regular'); // unchanged
    });

    it('selectBall ignored during monster turn', () => {
      const game = makeGame();
      const g = priv(game);
      g.turnPhase = 'monsters';
      game.selectBall('fire');
      expect(game.selectedBall).toBe('regular');
    });

    it('fireball deals 2x damage to imp (weakness)', () => {
      const game = makeGame();
      const g = priv(game);
      game.selectBall('fire');
      expect(game.selectedBall).toBe('fire');

      // Hold reference to imp A before it potentially gets spliced
      const imp = g.monsters[0];
      imp.hp = 3;
      imp.x = PLAY_OFFSET_X + 5 * CELL + CELL / 2;
      imp.y = 4 * CELL + CELL / 2;
      g.ballX = imp.x - 10;
      g.ballY = imp.y;
      g.ballVX = 100;
      g.ballVY = 0;
      g.ballMoving = true;

      game.update(16);
      // Imps weak to fire: 2 base * 2 = 4, 3 - 4 = -1
      expect(imp.hp).toBe(-1);
      expect(g.damageFlashes[0].text).toContain('-4');
    });

    it('recovers 1 MP when player turn starts', () => {
      const game = makeGame();
      const g = priv(game);
      game.wizardMP = 3;

      // Simulate last monster acting → player turn starts
      g.turnPhase = 'monsters';
      g.monsterActIndex = 2; // last monster (dragon, index 2)
      g.monsterActTimer = 0;
      g.updateMonsterTurn(0.4);

      expect(game.wizardMP).toBe(4);
      expect(g.turnPhase).toBe('player');
      const mpFlash = g.damageFlashes.find((f: any) => f.text === '+1 MP');
      expect(mpFlash).toBeDefined();
    });

    it('MP does not exceed max of 6', () => {
      const game = makeGame();
      const g = priv(game);
      game.wizardMP = 6;

      g.turnPhase = 'monsters';
      g.monsterActIndex = 2; // last monster (dragon)
      g.monsterActTimer = 0;
      g.updateMonsterTurn(0.4);

      expect(game.wizardMP).toBe(6);
    });

    it('shooting consumes MP and increments stroke count', () => {
      const game = makeGame();
      const g = priv(game);
      game.selectBall('fire');
      const mpBefore = game.wizardMP;
      const strokesBefore = game.strokeCount;

      // Charge and shoot
      g.powerPhase = 'charging';
      g.chargeStartTime = performance.now() - 350;
      game.update(performance.now());
      game.spacePressed();

      expect(game.wizardMP).toBe(mpBefore - 2);
      expect(game.strokeCount).toBe(strokesBefore + 1);
    });
  });

  describe('turn phases', () => {
    function shootAndWaitMonsters(game: Game): number {
      // Shoot the ball and let it stop, triggering monster phase
      aimDir(game, 2); // aim E
      let t = 16; game.update(t);
      priv(game).powerPhase = 'charging';
      t += 16; game.update(t);
      priv(game).chargeStartTime = t - 350;
      t += 16; game.update(t);
      game.spacePressed();

      // Let ball stop
      for (let i = 0; i < 300; i++) {
        t += 16;
        game.update(t);
        if (!priv(game).ballMoving) break;
      }
      return t;
    }

    it('switches to monster turn after ball stops', () => {
      const game = makeGame();
      shootAndWaitMonsters(game);
      expect(priv(game).turnPhase).toBe('monsters');
    });

    it('monsters act and return to player turn', () => {
      const game = makeGame();
      let t = shootAndWaitMonsters(game);

      // Advance time past both monster action delays
      for (let i = 0; i < 100; i++) {
        t += 16;
        game.update(t);
        if (priv(game).turnPhase === 'player') break;
      }
      expect(priv(game).turnPhase).toBe('player');
    });

    it('cannot shoot during monster turn', () => {
      const game = makeGame();
      shootAndWaitMonsters(game);
      expect(priv(game).turnPhase).toBe('monsters');

      game.spacePressed(); // should be ignored
      expect(priv(game).powerPhase).toBe('idle');
    });
  });

  describe('monster AI', () => {
    it('ball damages monster on hit', () => {
      const game = makeGame();
      const g = priv(game);

      const imp = g.monsters[0]; // hold ref
      imp.x = PLAY_OFFSET_X + 5 * CELL + CELL / 2;
      imp.y = 4 * CELL + CELL / 2;
      imp.hp = 3;

      g.ballX = imp.x - 25;
      g.ballY = imp.y;
      g.ballVX = 300;
      g.ballVY = 0;
      g.ballMoving = true;

      game.update(16);

      expect(imp.hp).toBe(2); // 3 - 1
      expect(g.damageFlashes.length).toBeGreaterThan(0);
      expect(Math.abs(g.ballVX)).toBeLessThan(300);
    });

    it('monster dies at 0 HP', () => {
      const game = makeGame();
      const g = priv(game);

      g.monsters[0].hp = 1;
      g.monsters[0].x = PLAY_OFFSET_X + 5 * CELL + CELL / 2;
      g.monsters[0].y = 4 * CELL + CELL / 2;
      g.ballX = g.monsters[0].x - 25;
      g.ballY = g.monsters[0].y;
      g.ballVX = 300;
      g.ballVY = 0;
      g.ballMoving = true;

      const countBefore = g.monsters.length;
      game.update(16);
      expect(g.monsters.length).toBe(countBefore - 1);
    });

    it('ice ball deals 2x damage to dragon', () => {
      const game = makeGame();
      const g = priv(game);
      const dragon = g.monsters.find((m: any) => m.kind === 'dragon');
      expect(dragon).toBeDefined();

      game.selectBall('ice');
      game.wizardMP = 5;

      dragon.hp = 5;
      dragon.x = PLAY_OFFSET_X + 5 * CELL + CELL / 2;
      dragon.y = 4 * CELL + CELL / 2;
      g.ballX = dragon.x - 25;
      g.ballY = dragon.y;
      g.ballVX = 300;
      g.ballVY = 0;
      g.ballMoving = true;

      game.update(16);
      // Ice does 3 base * 2 = 6 damage to dragon
      expect(dragon.hp).toBe(-1); // 5 - 6 = -1, dead
      expect(g.damageFlashes[0].text).toContain('-6');
      expect(g.damageFlashes[0].text).toContain('x2');
    });

    it('fireball deals 2x damage to imp', () => {
      const game = makeGame();
      const g = priv(game);
      game.selectBall('fire');
      game.wizardMP = 5;

      const imp = g.monsters[0]; // hold ref before splice
      imp.hp = 3;
      imp.x = PLAY_OFFSET_X + 5 * CELL + CELL / 2;
      imp.y = 4 * CELL + CELL / 2;
      g.ballX = imp.x - 25;
      g.ballY = imp.y;
      g.ballVX = 300;
      g.ballVY = 0;
      g.ballMoving = true;

      game.update(16);
      expect(imp.hp).toBe(-1); // 3 - 4 = -1, dead
      expect(g.damageFlashes[0].text).toContain('-4');
      expect(g.damageFlashes[0].text).toContain('x2');
    });

    it('fireball deals 0 damage to dragon (resist)', () => {
      const game = makeGame();
      const g = priv(game);
      const dragon = g.monsters.find((m: any) => m.kind === 'dragon');
      expect(dragon).toBeDefined();

      game.selectBall('fire');
      game.wizardMP = 5;

      dragon.hp = 5;
      dragon.x = PLAY_OFFSET_X + 5 * CELL + CELL / 2;
      dragon.y = 4 * CELL + CELL / 2;
      g.ballX = dragon.x - 25;
      g.ballY = dragon.y;
      g.ballVX = 300;
      g.ballVY = 0;
      g.ballMoving = true;

      game.update(16);
      expect(dragon.hp).toBe(5); // unchanged
      expect(g.damageFlashes[0].text).toContain('RESIST');
    });

    it('dragon shoots fireball aimed directly at wizard', () => {
      const game = makeGame();
      const g = priv(game);

      // Dragon to the right of wizard on same row (wizard at 480,270; dragon at 660,270)
      g.monsters[2].x = PLAY_OFFSET_X + 7 * CELL + CELL / 2;
      g.monsters[2].y = 4 * CELL + CELL / 2;
      g.monsters[2].kind = 'dragon';

      g.turnPhase = 'monsters';
      g.monsterActIndex = 2;
      g.monsterActTimer = 0;

      const origRandom = Math.random;
      Math.random = () => 0.5; // < 0.8 → shoot
      try {
        g.updateMonsterTurn(0.4);
        expect(g.fireballs.length).toBe(1);
        // Fireball should move left toward wizard (same row)
        expect(g.fireballs[0].vx).toBeLessThan(0);
        expect(g.fireballs[0].vy).toBeCloseTo(0);
      } finally {
        Math.random = origRandom;
      }
    });

    it('dragon moves 20% of the time', () => {
      const game = makeGame();
      const g = priv(game);

      // Place dragon far from wizard (not adjacent, so no melee)
      g.monsters[2].x = PLAY_OFFSET_X + 1 * CELL + CELL / 2;
      g.monsters[2].y = 1 * CELL + CELL / 2;
      g.monsters[2].kind = 'dragon';
      const origX = g.monsters[2].x;
      const origY = g.monsters[2].y;

      g.turnPhase = 'monsters';
      g.monsterActIndex = 2;
      g.monsterActTimer = 0;

      const origRandom = Math.random;
      Math.random = () => 0.9; // > 0.8 → not shoot, not adjacent → move
      try {
        g.updateMonsterTurn(0.4);
        expect(g.fireballs.length).toBe(0);
        const moved = g.monsters[2].x !== origX || g.monsters[2].y !== origY;
        expect(moved).toBe(true);
      } finally {
        Math.random = origRandom;
      }
    });

    it('spawns damage flash on attack', () => {
      const game = makeGame();
      const g = priv(game);

      // Place monster adjacent
      g.monsters[0].x = PLAY_OFFSET_X + 2 * CELL + CELL / 2;
      g.monsters[0].y = 3 * CELL + CELL / 2;
      g.wizardX = PLAY_OFFSET_X + 3 * CELL + CELL / 2 - 18;
      g.wizardY = 3 * CELL + CELL / 2 - 12;

      g.turnPhase = 'monsters';
      g.monsterActIndex = 0;
      g.monsterActTimer = 0;

      expect(g.damageFlashes.length).toBe(0);
      g.updateMonsterTurn(0.4);
      expect(g.damageFlashes.length).toBe(1);
      expect(g.damageFlashes[0].text).toBe('-1 HP!');
      expect(g.screenFlash).toBeGreaterThan(0);
    });

    it('monster attacks wizard when adjacent', () => {
      const game = makeGame();
      const g = priv(game);

      // Place monster at a known cell and wizard adjacent
      const mcx = PLAY_OFFSET_X + 2 * CELL + CELL / 2; // col 2
      const mcy = 3 * CELL + CELL / 2;                   // row 3
      g.monsters[0].x = mcx;
      g.monsters[0].y = mcy;

      // Place wizard adjacent (to the right: col 3, row 3)
      const wcx = PLAY_OFFSET_X + 3 * CELL + CELL / 2;
      const wcy = 3 * CELL + CELL / 2;
      g.wizardX = wcx - 18;
      g.wizardY = wcy - 12;

      // Trigger monster turn
      g.turnPhase = 'monsters';
      g.monsterActIndex = 0;
      g.monsterActTimer = 0;

      const hpBefore = game.wizardHP;
      g.updateMonsterTurn(0.4);
      expect(game.wizardHP).toBe(hpBefore - 1);
    });

    it('monsters never occupy the same cell after movement', () => {
      // Run multiple full monster-turn cycles and verify no collisions
      for (let attempt = 0; attempt < 10; attempt++) {
        const game = makeGame();
        const g = priv(game);

        // Place all 3 monsters in adjacent cells to force potential collisions
        g.monsters[0].x = PLAY_OFFSET_X + 3 * CELL + CELL / 2;
        g.monsters[0].y = 3 * CELL + CELL / 2;
        g.monsters[1].x = PLAY_OFFSET_X + 4 * CELL + CELL / 2;
        g.monsters[1].y = 3 * CELL + CELL / 2;
        g.monsters[2].x = PLAY_OFFSET_X + 3 * CELL + CELL / 2;
        g.monsters[2].y = 4 * CELL + CELL / 2;

        // Run full monster turn sequence
        g.turnPhase = 'monsters';
        g.monsterActIndex = 0;
        g.monsterActTimer = 0;

        let t = 0;
        for (let i = 0; i < 200; i++) {
          t += 16;
          game.update(t);
          if (g.turnPhase === 'player') break;
        }

        // No two monsters should share a cell
        const cells = g.monsters.map((m: any) => {
          const c = { col: Math.floor((m.x - PLAY_OFFSET_X) / CELL), row: Math.floor(m.y / CELL) };
          return `${c.col},${c.row}`;
        });
        expect(new Set(cells).size).toBe(g.monsters.length);
      }
    });

    it('occupiedCellKeys blocks wizard cell', () => {
      const game = makeGame();
      const g = priv(game);
      // Wizard at (4,4) by default
      const occupied = g.occupiedCellKeys(-1);
      expect(occupied.has('4,4')).toBe(true);
    });

    it('occupiedCellKeys excludes the given index', () => {
      const game = makeGame();
      const g = priv(game);
      const m0cell = cellOf(g.monsters[0].x, g.monsters[0].y);
      const key = `${m0cell.col},${m0cell.row}`;
      // When excluding index 0, that monster's cell should NOT be in the set
      const occupied = g.occupiedCellKeys(0);
      expect(occupied.has(key)).toBe(false);
    });

    it('monster moves to adjacent cell when not adjacent', () => {
      const game = makeGame();
      const g = priv(game);

      // Place monster far from wizard (wizard at center 4,4; monster at 0,0)
      const corner = { x: PLAY_OFFSET_X + 0 * CELL + CELL / 2, y: 0 * CELL + CELL / 2 };
      g.monsters[0].x = corner.x;
      g.monsters[0].y = corner.y;
      const origX = corner.x;
      const origY = corner.y;

      // Trigger monster turn
      g.turnPhase = 'monsters';
      g.monsterActIndex = 0;
      g.monsterActTimer = 0;

      g.updateMonsterTurn(0.4);
      // Monster should have moved
      expect(g.monsters[0].x === origX && g.monsters[0].y === origY).toBe(false);
      // New position should be at a cell center
      const m = g.monsters[0];
      const col = (m.x - PLAY_OFFSET_X) / CELL;
      const row = m.y / CELL;
      expect(col % 1).toBeCloseTo(0.5, 5);
      expect(row % 1).toBeCloseTo(0.5, 5);
      // Should be within bounds
      expect(m.x).toBeGreaterThanOrEqual(PLAY_OFFSET_X);
      expect(m.x).toBeLessThan(PLAY_OFFSET_X + PLAY_SIZE);
    });
  });

  describe('game over', () => {
    it('HP 0 triggers game over', () => {
      const game = makeGame();
      const g = priv(game);
      g.wizardHP = 0;
      game.update(16);
      expect(game.gameOver).toBe(true);
      expect(g.won).toBe(false);
    });

    it('ball entering hole triggers win', () => {
      const game = makeGame();
      const g = priv(game);

      // Place ball right at the hole
      g.ballX = g.holeX;
      g.ballY = g.holeY;
      g.ballVX = 10;
      g.ballVY = 0;
      g.ballMoving = true;

      game.update(16);
      expect(game.gameOver).toBe(true);
      expect(g.won).toBe(true);
    });

    it('killing all monsters does NOT win (must hole in)', () => {
      const game = makeGame();
      const g = priv(game);
      g.monsters = []; // all dead
      g.turnPhase = 'player';
      g.ballMoving = false;
      game.update(16);
      expect(game.gameOver).toBe(false); // still playing
    });

    it('full reset (death) restores to course 1 with full HP', () => {
      const game = makeGame();
      game.wizardHP = 0;
      game.strokeCount = 5;
      game.courseNumber = 3;
      game.wizardLevel = 5;
      game.golds = 99;
      game.gameOver = true;
      game.won = false;
      game.retry(); // death → fullReset

      expect(game.gameOver).toBe(false);
      expect(game.wizardHP).toBe(10);
      expect(game.wizardLevel).toBe(1);
      expect(game.golds).toBe(0);
      expect(game.courseNumber).toBe(1);
      expect(game.wizardMP).toBe(6);
      expect(game.strokeCount).toBe(0);
      expect(game.selectedBall).toBe('regular');
      expect(priv(game).monsters.length).toBe(3);
    });

    it('next course (win) advances course and keeps HP', () => {
      const game = makeGame();
      game.wizardHP = 4; // damaged
      game.wizardMP = 2; // used some MP
      game.strokeCount = 2;
      game.courseNumber = 2;
      game.golds = 50;
      game.gameOver = true;
      game.won = true;
      game.retry(); // win → nextCourse

      expect(game.gameOver).toBe(false);
      expect(game.wizardHP).toBe(4); // HP persisted!
      expect(game.golds).toBe(50); // golds persisted!
      expect(game.courseNumber).toBe(3);
      expect(game.wizardMP).toBe(2); // MP persisted (not refilled)
      expect(game.strokeCount).toBe(0); // strokes reset
      expect(priv(game).monsters.length).toBe(3);
    });

    it('input blocked when game over', () => {
      const game = makeGame();
      game.gameOver = true;
      game.spacePressed();
      game.setAimInput(1);
      game.selectBall('fire');
      expect(priv(game).aimInput).toBe(0);
      expect(game.selectedBall).toBe('regular');
    });
  });

  describe('draw and update', () => {
    it('draw() does not throw', () => {
      const game = makeGame();
      expect(() => game.draw()).not.toThrow();
    });

    it('update() does not throw', () => {
      const game = makeGame();
      expect(() => game.update(16)).not.toThrow();
    });
  });
});
