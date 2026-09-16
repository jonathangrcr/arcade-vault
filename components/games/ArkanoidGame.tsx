"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const PADDLE_W = 81;
const PADDLE_H = 14;
const PADDLE_Y = 560;
const BALL_SIZE = 16;

const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;

const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

const EXPLOSION_DURATION = 300;

const BLOCK_COLORS: Record<string, string> = {
  red: "#ff3860",
  yellow: "#ffae00",
  cyan: "#00f5ff",
  magenta: "#ff006e",
  hotpink: "#ff5fa2",
  green: "#00ff88",
  gray: "#9ea0b0",
};

type BlockDef = { col: number; row: number; color: string };
type LevelDef = { blocks: BlockDef[]; speed: number };

const LEVELS: LevelDef[] = (() => {
  const rowColors1 = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2 = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4 = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: BlockDef[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: BlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

type ArkanoidGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type ArkanoidGameHandle = {
  restart: () => void;
};

const ArkanoidGame = forwardRef<ArkanoidGameHandle, ArkanoidGameProps>(
  function ArkanoidGame(
    { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const restartFnRef = useRef<() => void>(() => {});

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useImperativeHandle(ref, () => ({
      restart: () => restartFnRef.current(),
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context2d = canvas.getContext("2d");
      if (!context2d) return;
      const ctx: CanvasRenderingContext2D = context2d;

      const bounceSound = new Audio("/sounds/ball-bounce.mp3");
      const breakSound = new Audio("/sounds/break-sound.mp3");
      const playBounce = () => {
        (bounceSound.cloneNode() as HTMLAudioElement).play().catch(() => {});
      };
      const playBreak = () => {
        (breakSound.cloneNode() as HTMLAudioElement).play().catch(() => {});
      };

      const keys: Record<string, boolean> = {};
      const CAPTURED_CODES = new Set(["ArrowLeft", "ArrowRight"]);

      const onKeyDown = (e: KeyboardEvent) => {
        if (CAPTURED_CODES.has(e.code)) e.preventDefault();
        keys[e.code] = true;
      };
      const onKeyUp = (e: KeyboardEvent) => {
        keys[e.code] = false;
      };

      type Block = {
        x: number;
        y: number;
        w: number;
        h: number;
        color: string;
        alive: boolean;
      };
      type Explosion = {
        x: number;
        y: number;
        w: number;
        h: number;
        color: string;
        elapsed: number;
      };

      const paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
      const ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };

      let blocks: Block[] = [];
      let explosions: Explosion[] = [];
      let lives = 3;
      let score = 0;
      let currentLevel = 1;
      let state: "playing" | "gameover" = "playing";

      function initPaddle() {
        paddle.x = (W - paddle.w) / 2;
      }

      function loadLevel(n: number) {
        currentLevel = n;
        const level = LEVELS[n - 1];
        blocks = level.blocks.map((b) => ({
          x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
          y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
          w: BLOCK_W,
          h: BLOCK_H,
          color: b.color,
          alive: true,
        }));
        explosions = [];
        ball.x = paddle.x + (paddle.w - ball.w) / 2;
        ball.y = paddle.y - ball.h;
        ball.vx = BASE_BALL_VX * level.speed;
        ball.vy = BASE_BALL_VY * level.speed;
        onLevelChange(currentLevel);
      }

      function initBall() {
        const speed = LEVELS[currentLevel - 1].speed;
        ball.x = paddle.x + (paddle.w - ball.w) / 2;
        ball.y = paddle.y - ball.h;
        ball.vx = BASE_BALL_VX * speed;
        ball.vy = BASE_BALL_VY * speed;
      }

      function collideAABB(block: Block) {
        return (
          ball.x < block.x + block.w &&
          ball.x + ball.w > block.x &&
          ball.y < block.y + block.h &&
          ball.y + ball.h > block.y
        );
      }

      function initGame() {
        lives = 3;
        score = 0;
        state = "playing";
        initPaddle();
        loadLevel(1);
        onScoreChange(score);
        onLivesChange(lives);
      }

      function update(dt: number) {
        if (state !== "playing") return;

        if (keys["ArrowLeft"])
          paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
        if (keys["ArrowRight"])
          paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x <= 0) {
          ball.x = 0;
          ball.vx = Math.abs(ball.vx);
          playBounce();
        }
        if (ball.x + ball.w >= W) {
          ball.x = W - ball.w;
          ball.vx = -Math.abs(ball.vx);
          playBounce();
        }
        if (ball.y <= 0) {
          ball.y = 0;
          ball.vy = Math.abs(ball.vy);
          playBounce();
        }

        if (
          ball.vy > 0 &&
          ball.x + ball.w > paddle.x &&
          ball.x < paddle.x + paddle.w &&
          ball.y + ball.h >= paddle.y &&
          ball.y + ball.h <= paddle.y + paddle.h + 8
        ) {
          ball.y = paddle.y - ball.h;
          ball.vy = -Math.abs(ball.vy);
          playBounce();
        }

        for (const block of blocks) {
          if (!block.alive) continue;
          if (collideAABB(block)) {
            block.alive = false;
            explosions.push({
              x: block.x,
              y: block.y,
              w: block.w,
              h: block.h,
              color: block.color,
              elapsed: 0,
            });
            score += 10;
            onScoreChange(score);
            ball.vy = -ball.vy;
            playBreak();
            if (blocks.every((b) => !b.alive)) {
              if (currentLevel < 5) {
                loadLevel(currentLevel + 1);
              } else {
                state = "gameover";
                onGameOver(score);
              }
            }
            break;
          }
        }

        for (const exp of explosions) exp.elapsed += dt * 1000;
        explosions = explosions.filter(
          (exp) => exp.elapsed < EXPLOSION_DURATION,
        );

        if (ball.y > H) {
          lives--;
          onLivesChange(lives);
          if (lives <= 0) {
            lives = 0;
            state = "gameover";
            onGameOver(score);
          } else {
            initBall();
          }
        }
      }

      function draw() {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        for (const block of blocks) {
          if (!block.alive) continue;
          const color = BLOCK_COLORS[block.color] ?? "#9ea0b0";
          ctx.fillStyle = color;
          ctx.fillRect(block.x, block.y, block.w, block.h);
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = 2;
          ctx.strokeRect(block.x, block.y, block.w, block.h);
        }

        for (const exp of explosions) {
          const t = exp.elapsed / EXPLOSION_DURATION;
          const alpha = Math.max(0, 1 - t);
          const cx = exp.x + exp.w / 2;
          const cy = exp.y + exp.h / 2;
          const radius = (Math.max(exp.w, exp.h) / 2) * (0.6 + t * 1.2);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = BLOCK_COLORS[exp.color] ?? "#fff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = BLOCK_COLORS[exp.color] ?? "#fff";
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = "#00f5ff";
        ctx.shadowColor = "#00f5ff";
        ctx.shadowBlur = 8;
        ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(
          ball.x + ball.w / 2,
          ball.y + ball.h / 2,
          ball.w / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      let rafId = 0;
      let lastTime: number | null = null;

      function loop(ts: number) {
        const dt =
          lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;
        if (!pausedRef.current) update(dt);
        draw();
        rafId = requestAnimationFrame(loop);
      }

      restartFnRef.current = () => initGame();

      initGame();
      rafId = requestAnimationFrame(loop);

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    );
  },
);

export default ArkanoidGame;
