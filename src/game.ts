import { Renderer } from './renderer.js';

export class Game {
  private renderer: Renderer;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.renderer = new Renderer(ctx);
  }

  update(_timestamp: number): void {
    // Game logic goes here
  }

  draw(): void {
    this.renderer.clear();
    this.renderer.drawHello();
  }
}
