"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { FRUIT_SPRITES } from "./snake-sprites";

const COLS = 22;
const ROWS = 22;
const CELL = 24;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;

const FRUIT_KEYS = Object.keys(FRUIT_SPRITES);
const FRUITS_EVERY_SPEEDUP = 5;
const BASE_TICK_MS = 160;
const MIN_TICK_MS = 70;
const TICK_STEP_MS = 12;

type Cell = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

type SnakeGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type SnakeGameHandle = {
  restart: () => void;
};

const SnakeGame = forwardRef<SnakeGameHandle, SnakeGameProps>(
  function SnakeGame(
    { paused, onScoreChange, onLevelChange, onGameOver },
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
      const context = canvas.getContext("2d");
      if (!context) return;
      const ctx: CanvasRenderingContext2D = context;

      const CAPTURED_CODES = new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
      ]);

      const fruitImage = new Image();
      fruitImage.src = "/sprites/fruits.png";
      let fruitImageReady = false;
      fruitImage.onload = () => {
        fruitImageReady = true;
      };

      let snake: Cell[] = [];
      let direction: Direction = "right";
      let pendingDirection: Direction = "right";
      let food: { cell: Cell; sprite: string } = {
        cell: { x: 0, y: 0 },
        sprite: FRUIT_KEYS[0],
      };
      let score = 0;
      let fruitsEaten = 0;
      let level = 1;
      let tickIntervalMs = BASE_TICK_MS;
      let gameOver = false;
      let tickAccum = 0;
      let lastTime: number | null = null;
      let rafId = 0;

      function randomEmptyCell(): Cell {
        const occupied = new Set(snake.map((c) => `${c.x},${c.y}`));
        let cell: Cell;
        do {
          cell = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS),
          };
        } while (occupied.has(`${cell.x},${cell.y}`));
        return cell;
      }

      function spawnFood() {
        const sprite =
          FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
        food = { cell: randomEmptyCell(), sprite };
      }

      function drawGrid() {
        ctx.strokeStyle = "rgba(0,255,136,0.08)";
        ctx.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(c * CELL, 0);
          ctx.lineTo(c * CELL, ROWS * CELL);
          ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * CELL);
          ctx.lineTo(COLS * CELL, r * CELL);
          ctx.stroke();
        }
      }

      function drawSnakeBlock(cell: Cell, isHead: boolean) {
        ctx.save();
        ctx.shadowColor = "rgba(0,255,136,0.9)";
        ctx.shadowBlur = isHead ? 14 : 8;
        ctx.fillStyle = isHead ? "#baffde" : "#00ff88";
        ctx.fillRect(cell.x * CELL + 1, cell.y * CELL + 1, CELL - 2, CELL - 2);
        ctx.restore();
      }

      function drawFood() {
        const rect = FRUIT_SPRITES[food.sprite];
        const dx = food.cell.x * CELL;
        const dy = food.cell.y * CELL;
        if (fruitImageReady) {
          ctx.drawImage(
            fruitImage,
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            dx + 1,
            dy + 1,
            CELL - 2,
            CELL - 2,
          );
        }
      }

      function draw() {
        ctx.fillStyle = "#061511";
        ctx.fillRect(0, 0, BOARD_W, BOARD_H);
        drawGrid();
        drawFood();
        snake.forEach((cell, i) => drawSnakeBlock(cell, i === 0));
      }

      function endGame() {
        gameOver = true;
        cancelAnimationFrame(rafId);
        onGameOver(score);
      }

      function advance() {
        direction = pendingDirection;
        const head = snake[0];
        const delta = DELTA[direction];
        const newHead: Cell = { x: head.x + delta.x, y: head.y + delta.y };

        if (
          newHead.x < 0 ||
          newHead.x >= COLS ||
          newHead.y < 0 ||
          newHead.y >= ROWS
        ) {
          endGame();
          return;
        }
        if (snake.some((c) => c.x === newHead.x && c.y === newHead.y)) {
          endGame();
          return;
        }

        snake.unshift(newHead);

        if (newHead.x === food.cell.x && newHead.y === food.cell.y) {
          score += 10;
          fruitsEaten++;
          onScoreChange(score);
          const newLevel = Math.floor(fruitsEaten / FRUITS_EVERY_SPEEDUP) + 1;
          if (newLevel !== level) {
            level = newLevel;
            tickIntervalMs = Math.max(
              MIN_TICK_MS,
              BASE_TICK_MS - (level - 1) * TICK_STEP_MS,
            );
            onLevelChange(level);
          }
          spawnFood();
        } else {
          snake.pop();
        }
      }

      function onKeyDown(e: KeyboardEvent) {
        if (CAPTURED_CODES.has(e.code)) e.preventDefault();
        if (pausedRef.current || gameOver) return;
        let next: Direction | null = null;
        switch (e.code) {
          case "ArrowUp":
            next = "up";
            break;
          case "ArrowDown":
            next = "down";
            break;
          case "ArrowLeft":
            next = "left";
            break;
          case "ArrowRight":
            next = "right";
            break;
        }
        if (next && OPPOSITE[next] !== direction) {
          pendingDirection = next;
        }
      }

      function loop(ts: number) {
        if (gameOver) return;
        const dt = lastTime === null ? 0 : ts - lastTime;
        lastTime = ts;
        if (!pausedRef.current) {
          tickAccum += dt;
          if (tickAccum >= tickIntervalMs) {
            tickAccum = 0;
            advance();
          }
        }
        if (gameOver) return;
        draw();
        rafId = requestAnimationFrame(loop);
      }

      function initGame() {
        const startX = Math.floor(COLS / 2);
        const startY = Math.floor(ROWS / 2);
        snake = [
          { x: startX, y: startY },
          { x: startX - 1, y: startY },
          { x: startX - 2, y: startY },
        ];
        direction = "right";
        pendingDirection = "right";
        score = 0;
        fruitsEaten = 0;
        level = 1;
        tickIntervalMs = BASE_TICK_MS;
        gameOver = false;
        tickAccum = 0;
        lastTime = null;
        spawnFood();
        onScoreChange(score);
        onLevelChange(level);
        cancelAnimationFrame(rafId);
        draw();
        rafId = requestAnimationFrame(loop);
      }

      restartFnRef.current = () => initGame();

      initGame();

      window.addEventListener("keydown", onKeyDown);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          width={BOARD_W}
          height={BOARD_H}
          style={{ height: "100%", width: "auto", display: "block" }}
        />
      </div>
    );
  },
);

export default SnakeGame;
