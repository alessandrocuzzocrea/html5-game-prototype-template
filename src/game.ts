import { Renderer, CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer.js';

const SPEED = 160; // px/s
const LOGO_SCALE = 0.8;

const COLORS = [
  '#ff0044', '#ff8800', '#ffee00', '#00ff44',
  '#00ccff', '#8844ff', '#ff44cc', '#ffffff',
];

export class Game {
  private renderer: Renderer;
  private image: HTMLImageElement | null = null;
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private w = 0;
  private h = 0;
  private prevTimestamp = 0;
  private tint: string | null = null;
  private tintTimer = 0;
  private cornerFlash = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.renderer = new Renderer(ctx);
    this.loadImage();
  }

  private loadImage(): void {
    this.image = new Image();
    this.image.onload = () => {
      this.w = this.image!.naturalWidth * LOGO_SCALE;
      this.h = this.image!.naturalHeight * LOGO_SCALE;
      this.x = Math.random() * (CANVAS_WIDTH - this.w);
      this.y = Math.random() * (CANVAS_HEIGHT - this.h);
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * SPEED;
      this.vy = Math.sin(angle) * SPEED;
      this.prevTimestamp = performance.now();
    };
    this.image.src = 'assets/dvd-logo.png';
  }

  update(timestamp: number): void {
    if (!this.image || !this.image.complete) return;

    const dt = Math.min((timestamp - this.prevTimestamp) / 1000, 0.05);
    this.prevTimestamp = timestamp;

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    let hitCorner = false;

    // Bounce off edges
    if (this.x <= 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
      this.changeTint();
      if (this.y <= 0 || this.y + this.h >= CANVAS_HEIGHT) hitCorner = true;
    }
    if (this.x + this.w >= CANVAS_WIDTH) {
      this.x = CANVAS_WIDTH - this.w;
      this.vx = -Math.abs(this.vx);
      this.changeTint();
      if (this.y <= 0 || this.y + this.h >= CANVAS_HEIGHT) hitCorner = true;
    }
    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy);
      this.changeTint();
      if (this.x <= 0 || this.x + this.w >= CANVAS_WIDTH) hitCorner = true;
    }
    if (this.y + this.h >= CANVAS_HEIGHT) {
      this.y = CANVAS_HEIGHT - this.h;
      this.vy = -Math.abs(this.vy);
      this.changeTint();
      if (this.x <= 0 || this.x + this.w >= CANVAS_WIDTH) hitCorner = true;
    }

    if (hitCorner) {
      this.cornerFlash = 0.6;
    }

    // Fade tint after 1.5s
    if (this.tintTimer > 0) {
      this.tintTimer -= dt;
      if (this.tintTimer <= 0) this.tint = null;
    }

    // Fade corner flash
    this.cornerFlash = Math.max(0, this.cornerFlash - dt);
  }

  private changeTint(): void {
    this.tint = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.tintTimer = 1.5;
  }

  draw(): void {
    this.renderer.clear();

    // Draw Hello World behind everything
    this.renderer.drawHello();

    if (!this.image || !this.image.complete) return;

    if (this.cornerFlash > 0) {
      this.renderer.drawHitMarker(
        this.x + this.w / 2,
        this.y + this.h / 2,
      );
    }

    this.renderer.drawImage(this.image, this.x, this.y, this.w, this.h, this.tint);
  }
}
