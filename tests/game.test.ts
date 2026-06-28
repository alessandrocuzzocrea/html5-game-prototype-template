import { describe, it, expect } from 'vitest';
import { Game } from '../src/game.js';

describe('Game', () => {
  function makeGame(): Game {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    return new Game(canvas);
  }

  it('constructs without throwing', () => {
    expect(() => makeGame()).not.toThrow();
  });

  it('update() does not throw', () => {
    const game = makeGame();
    expect(() => game.update(16)).not.toThrow();
  });

  it('draw() does not throw', () => {
    const game = makeGame();
    expect(() => game.draw()).not.toThrow();
  });
});
