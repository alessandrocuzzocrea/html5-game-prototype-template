import { describe, it, expect } from 'vitest';
import { Renderer, CANVAS_WIDTH, CANVAS_HEIGHT } from '../src/renderer.js';

describe('Renderer', () => {
  function makeRenderer(): Renderer {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    return new Renderer(ctx);
  }

  it('constructs without throwing', () => {
    expect(() => makeRenderer()).not.toThrow();
  });

  it('clear() does not throw', () => {
    const renderer = makeRenderer();
    expect(() => renderer.clear()).not.toThrow();
  });

  it('drawHello() does not throw', () => {
    const renderer = makeRenderer();
    expect(() => renderer.drawHello()).not.toThrow();
  });

  it('CANVAS_WIDTH is 960', () => {
    expect(CANVAS_WIDTH).toBe(960);
  });

  it('CANVAS_HEIGHT is 540', () => {
    expect(CANVAS_HEIGHT).toBe(540);
  });
});
