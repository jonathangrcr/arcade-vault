"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BOARD_W = COLS * BLOCK;
const BOARD_H = ROWS * BLOCK;
const NEXT_SIZE = 120;
const NEXT_BLOCK = 30;

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type Piece = { shape: number[][]; x: number; y: number };

type TetrisGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type TetrisGameHandle = {
  restart: () => void;
};

const TetrisGame = forwardRef<TetrisGameHandle, TetrisGameProps>(
  function TetrisGame(
    { paused, onScoreChange, onLevelChange, onGameOver },
    ref,
  ) {
    const boardCanvasRef = useRef<HTMLCanvasElement>(null);
    const nextCanvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const restartFnRef = useRef<() => void>(() => {});

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useImperativeHandle(ref, () => ({
      restart: () => restartFnRef.current(),
    }));

    useEffect(() => {
      const boardCanvas = boardCanvasRef.current;
      const nextCanvas = nextCanvasRef.current;
      if (!boardCanvas || !nextCanvas) return;
      const boardContext = boardCanvas.getContext("2d");
      const nextContext = nextCanvas.getContext("2d");
      if (!boardContext || !nextContext) return;
      const ctx: CanvasRenderingContext2D = boardContext;
      const nextCtx: CanvasRenderingContext2D = nextContext;

      const CAPTURED_CODES = new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "KeyX",
        "Space",
      ]);

      let board: number[][] = [];
      let current: Piece;
      let next: Piece;
      let score = 0;
      let lines = 0;
      let level = 1;
      let gameOver = false;
      let dropInterval = 1000;
      let dropAccum = 0;
      let lastTime: number | null = null;
      let rafId = 0;

      function createBoard(): number[][] {
        return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
      }

      function randomPiece(): Piece {
        const type = Math.floor(Math.random() * 8) + 1;
        const shape = (PIECES[type] as number[][]).map((row) => [...row]);
        return {
          shape,
          x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
          y: 0,
        };
      }

      function collide(shape: number[][], ox: number, oy: number): boolean {
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const nx = ox + c;
            const ny = oy + r;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
          }
        }
        return false;
      }

      function rotateCW(shape: number[][]): number[][] {
        const rows = shape.length;
        const cols = shape[0].length;
        const result = Array.from({ length: cols }, () =>
          new Array(rows).fill(0),
        );
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
        return result;
      }

      function tryRotate() {
        const rotated = rotateCW(current.shape);
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
          if (!collide(rotated, current.x + kick, current.y)) {
            current.shape = rotated;
            current.x += kick;
            return;
          }
        }
      }

      function merge() {
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              board[current.y + r][current.x + c] = current.shape[r][c];
      }

      function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (board[r].every((v) => v !== 0)) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(0));
            cleared++;
            r++;
          }
        }
        if (cleared) {
          lines += cleared;
          score += (LINE_SCORES[cleared] || 0) * level;
          level = Math.floor(lines / 10) + 1;
          dropInterval = Math.max(100, 1000 - (level - 1) * 90);
          onScoreChange(score);
          onLevelChange(level);
        }
      }

      function ghostY(): number {
        let gy = current.y;
        while (!collide(current.shape, current.x, gy + 1)) gy++;
        return gy;
      }

      function hardDrop() {
        const gy = ghostY();
        score += (gy - current.y) * 2;
        current.y = gy;
        onScoreChange(score);
        lockPiece();
      }

      function softDrop() {
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
          score += 1;
          onScoreChange(score);
        } else {
          lockPiece();
        }
      }

      function lockPiece() {
        merge();
        clearLines();
        spawn();
      }

      function spawn() {
        current = next;
        next = randomPiece();
        if (collide(current.shape, current.x, current.y)) {
          endGame();
        }
      }

      function drawBlock(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        colorIndex: number,
        size: number,
        alpha?: number,
      ) {
        if (!colorIndex) return;
        context.globalAlpha = alpha ?? 1;
        context.fillStyle = COLORS[colorIndex] as string;
        context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        context.fillStyle = "rgba(255,255,255,0.12)";
        context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
        context.globalAlpha = 1;
      }

      function drawGrid() {
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(c * BLOCK, 0);
          ctx.lineTo(c * BLOCK, ROWS * BLOCK);
          ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * BLOCK);
          ctx.lineTo(COLS * BLOCK, r * BLOCK);
          ctx.stroke();
        }
      }

      function draw() {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, BOARD_W, BOARD_H);
        drawGrid();

        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            drawBlock(ctx, c, r, board[r][c], BLOCK);

        const gy = ghostY();
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              drawBlock(
                ctx,
                current.x + c,
                gy + r,
                current.shape[r][c],
                BLOCK,
                0.2,
              );

        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            drawBlock(
              ctx,
              current.x + c,
              current.y + r,
              current.shape[r][c],
              BLOCK,
            );

        nextCtx.fillStyle = "#000";
        nextCtx.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE);
        const shape = next.shape;
        const offX = Math.floor((4 - shape[0].length) / 2);
        const offY = Math.floor((4 - shape.length) / 2);
        for (let r = 0; r < shape.length; r++)
          for (let c = 0; c < shape[r].length; c++)
            drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
      }

      function endGame() {
        gameOver = true;
        cancelAnimationFrame(rafId);
        onGameOver(score);
      }

      function onKeyDown(e: KeyboardEvent) {
        if (CAPTURED_CODES.has(e.code)) e.preventDefault();
        if (pausedRef.current || gameOver) return;
        switch (e.code) {
          case "ArrowLeft":
            if (!collide(current.shape, current.x - 1, current.y)) current.x--;
            break;
          case "ArrowRight":
            if (!collide(current.shape, current.x + 1, current.y)) current.x++;
            break;
          case "ArrowDown":
            softDrop();
            break;
          case "ArrowUp":
          case "KeyX":
            tryRotate();
            break;
          case "Space":
            hardDrop();
            break;
        }
      }

      function loop(ts: number) {
        if (gameOver) return;
        const dt = lastTime === null ? 0 : ts - lastTime;
        lastTime = ts;
        if (!pausedRef.current) {
          dropAccum += dt;
          if (dropAccum >= dropInterval) {
            dropAccum = 0;
            if (!collide(current.shape, current.x, current.y + 1)) {
              current.y++;
            } else {
              lockPiece();
            }
          }
        }
        if (gameOver) return;
        draw();
        rafId = requestAnimationFrame(loop);
      }

      function initGame() {
        board = createBoard();
        score = 0;
        lines = 0;
        level = 1;
        gameOver = false;
        dropInterval = 1000;
        dropAccum = 0;
        lastTime = null;
        next = randomPiece();
        spawn();
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
          gap: 16,
        }}
      >
        <canvas
          ref={boardCanvasRef}
          width={BOARD_W}
          height={BOARD_H}
          style={{ height: "100%", width: "auto", display: "block" }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--ink-dim)",
            }}
          >
            SIGUIENTE
          </div>
          <canvas
            ref={nextCanvasRef}
            width={NEXT_SIZE}
            height={NEXT_SIZE}
            style={{ height: "20%", width: "auto", display: "block" }}
          />
        </div>
      </div>
    );
  },
);

export default TetrisGame;
