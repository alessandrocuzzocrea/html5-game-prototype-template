import { describe, it, expect, beforeEach } from 'vitest';
import { Renderer, CANVAS_WIDTH, CANVAS_HEIGHT } from '../src/renderer.js';

describe('Renderer', () => {
  let renderer: Renderer;
  let image: HTMLImageElement;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    renderer = new Renderer(ctx);

    image = new Image();
    image.naturalWidth = 200;
    image.naturalHeight = 100;
    image.complete = true;
  });

  it('constructs without throwing', () => {
    expect(() => new Renderer(image as any)).not.toThrow();
  });

  it('clear() does not throw', () => {
    expect(() => renderer.clear()).not.toThrow();
  });

  it('drawImage() does not throw with and without tint', () => {
    expect(() => renderer.drawImage(image, 100, 100, 160, 80, null)).not.toThrow();
    expect(() => renderer.drawImage(image, 100, 100, 160, 80, '#ff0044')).not.toThrow();
  });

  it('drawHello() does not throw', () => {
    expect(() => renderer.drawHello()).not.toThrow();
  });

  it('drawHitMarker() does not throw', () => {
    expect(() => renderer.drawHitMarker(480, 270)).not.toThrow();
  });

  it('CANVAS_WIDTH is 960', () => {
    expect(CANVAS_WIDTH).toBe(960);
  });

  it('CANVAS_HEIGHT is 540', () => {
    expect(CANVAS_HEIGHT).toBe(540);
  });
});
