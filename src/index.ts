import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #gameCanvas not found');

const game = new Game(canvas);

function loop(timestamp: number): void {
  game.update(timestamp);
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
