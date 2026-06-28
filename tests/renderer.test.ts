import { describe, it, expect } from 'vitest';
import { Renderer, PLAY_SIZE, PLAY_OFFSET_X } from '../src/renderer.js';

describe('Renderer constants', () => {
  it('PLAY_SIZE is 540 (square inside 16:9 canvas)', () => {
    expect(PLAY_SIZE).toBe(540);
  });

  it('PLAY_OFFSET_X centers the square horizontally', () => {
    expect(PLAY_OFFSET_X).toBe(210); // (960 - 540) / 2
  });
});

describe('Renderer', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d')!;
  const renderer = new Renderer(ctx);

  it('clear() does not throw', () => {
    expect(() => renderer.clear()).not.toThrow();
  });

  it('drawBackground() does not throw', () => {
    expect(() => renderer.drawBackground()).not.toThrow();
  });

  it('drawGrid() does not throw', () => {
    expect(() => renderer.drawGrid()).not.toThrow();
  });

  it('drawWizard() does not throw', () => {
    expect(() => renderer.drawWizard(480, 270)).not.toThrow();
  });

  it('drawBall() does not throw with default and custom colors', () => {
    expect(() => renderer.drawBall(498, 282)).not.toThrow();
    expect(() => renderer.drawBall(498, 282, '#ff6600')).not.toThrow();
    expect(() => renderer.drawBall(498, 282, '#66ccff')).not.toThrow();
  });

  it('drawAimArrow() does not throw for all 8 directions', () => {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 - Math.PI / 2;
      expect(() => renderer.drawAimArrow(498, 282, angle)).not.toThrow();
    }
  });

  it('drawMonster() does not throw', () => {
    expect(() => renderer.drawMonster(480, 270)).not.toThrow();
  });

  it('drawMonsterHUD() does not throw', () => {
    expect(() => renderer.drawMonsterHUD(480, 270, 'A', 3, 3)).not.toThrow();
  });

  it('drawPowerMeter() does not throw for various levels', () => {
    expect(() => renderer.drawPowerMeter(498, 282, 0)).not.toThrow();
    expect(() => renderer.drawPowerMeter(498, 282, 0.5)).not.toThrow();
    expect(() => renderer.drawPowerMeter(498, 282, 1)).not.toThrow();
  });

  it('drawDamageFlash() does not throw', () => {
    expect(() => renderer.drawDamageFlash(480, 270, 1.0, '-1 HP!')).not.toThrow();
  });

  it('drawWizardStats() does not throw', () => {
    expect(() => renderer.drawWizardStats(10, 5, 1, 0, 0)).not.toThrow();
  });

  it('drawCourseInfo() does not throw', () => {
    expect(() => renderer.drawCourseInfo(1, 2, 3)).not.toThrow();
  });

  it('drawGameOver() does not throw for win and loss', () => {
    expect(() => renderer.drawGameOver(true, 2, 3)).not.toThrow();
    expect(() => renderer.drawGameOver(false, 5, 3)).not.toThrow();
  });

  it('drawHole() does not throw', () => {
    expect(() => renderer.drawHole(480, 270)).not.toThrow();
  });

  it('drawScreenFlash() does not throw', () => {
    expect(() => renderer.drawScreenFlash(0.2)).not.toThrow();
  });

  it('drawSpellButtons() does not throw', () => {
    expect(() => renderer.drawSpellButtons('regular', 5)).not.toThrow();
  });

  it('drawDragon() does not throw', () => {
    expect(() => renderer.drawDragon(480, 270)).not.toThrow();
  });

  it('drawFireball() does not throw', () => {
    expect(() => renderer.drawFireball(400, 200, 1.5)).not.toThrow();
  });

  it('spellButtonRects() returns 3 buttons in left panel', () => {
    const rects = renderer.spellButtonRects();
    expect(rects.length).toBe(3);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(PLAY_OFFSET_X);
    }
  });
});
