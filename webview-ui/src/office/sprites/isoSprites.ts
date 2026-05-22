// 마인크래프트 스타일 아이소메트릭 스프라이트
// 3-face cube rendering — top, NW(left), NE(right) 면 구성
// draw(ctx, x, y, zoom) 또는 draw(ctx, x, y, zoom, ...colors) 형태로 렌더러에서 호출

export type IsoSpriteDrawFn = (ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number) => void;

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const ISO_TILE_W = 32;  // 타일 전체 너비 (pixels, zoom=1 기준)
const ISO_TILE_H = 16;  // 타일 전체 높이
const BLOCK_DEPTH = 5;  // 큐브 측면 깊이 (pixels, zoom=1 기준)
const WALL_HEIGHT = 22; // 벽 높이 (pixels)

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

/** hex 색상을 명도 조정 */
function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

export { shadeColor };

/**
 * 3-면 Minecraft 큐브 상단 면 (다이아몬드/롬버스)
 * cx, cy = 다이아몬드 상단 꼭짓점
 */
function drawCubeTop(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
  topColor: string,
) {
  const w = (ISO_TILE_W / 2) * zoom; // half-width
  const h = (ISO_TILE_H / 2) * zoom; // half-height
  ctx.beginPath();
  ctx.moveTo(cx, cy);           // top point
  ctx.lineTo(cx + w, cy + h);  // right point
  ctx.lineTo(cx, cy + h * 2);  // bottom point
  ctx.lineTo(cx - w, cy + h);  // left point
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
}

/**
 * 3-면 Minecraft 큐브 NW(왼쪽) 측면
 * 상단 다이아몬드의 왼쪽 하단 → 아래로 내려가는 면
 */
function drawCubeNW(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
  nwColor: string,
  depth: number,
) {
  const w = (ISO_TILE_W / 2) * zoom;
  const h = (ISO_TILE_H / 2) * zoom;
  const d = depth * zoom;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + h);       // 다이아몬드 left point
  ctx.lineTo(cx, cy + h * 2);       // 다이아몬드 bottom point
  ctx.lineTo(cx, cy + h * 2 + d);   // 아래 오른쪽
  ctx.lineTo(cx - w, cy + h + d);   // 아래 왼쪽
  ctx.closePath();
  ctx.fillStyle = nwColor;
  ctx.fill();
}

/**
 * 3-면 Minecraft 큐브 NE(오른쪽) 측면
 */
function drawCubeNE(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
  neColor: string,
  depth: number,
) {
  const w = (ISO_TILE_W / 2) * zoom;
  const h = (ISO_TILE_H / 2) * zoom;
  const d = depth * zoom;
  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 2);       // 다이아몬드 bottom point
  ctx.lineTo(cx + w, cy + h);       // 다이아몬드 right point
  ctx.lineTo(cx + w, cy + h + d);   // 아래 오른쪽
  ctx.lineTo(cx, cy + h * 2 + d);   // 아래 왼쪽
  ctx.closePath();
  ctx.fillStyle = neColor;
  ctx.fill();
}

/** 픽셀 윤곽선 그리기 (3면 큐브 전체) */
function drawCubeOutline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
  depth: number,
) {
  const w = (ISO_TILE_W / 2) * zoom;
  const h = (ISO_TILE_H / 2) * zoom;
  const d = depth * zoom;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.7 * zoom;

  // 상단 다이아몬드 외곽
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + w, cy + h);
  ctx.lineTo(cx, cy + h * 2);
  ctx.lineTo(cx - w, cy + h);
  ctx.closePath();
  ctx.stroke();

  // 하단 꼭짓점에서 내려가는 세로선
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + h);
  ctx.lineTo(cx - w, cy + h + d);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 2);
  ctx.lineTo(cx, cy + h * 2 + d);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + w, cy + h);
  ctx.lineTo(cx + w, cy + h + d);
  ctx.stroke();

  // 하단 라인
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + h + d);
  ctx.lineTo(cx, cy + h * 2 + d);
  ctx.lineTo(cx + w, cy + h + d);
  ctx.stroke();
}

/** 잔디 블록 상단 디더링 패턴 */
function drawGrassDither(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
) {
  const w = (ISO_TILE_W / 2) * zoom;
  const h = (ISO_TILE_H / 2) * zoom;
  const dotSize = Math.max(1, zoom * 0.8);
  ctx.fillStyle = '#4A7A3B';

  // 이소메트릭 다이아몬드 내부에 체커보드 패턴
  const step = 4 * zoom;
  const offsets = [
    { dx: -w * 0.5, dy: h * 0.3 },
    { dx: w * 0.1,  dy: h * 0.6 },
    { dx: -w * 0.2, dy: h * 1.2 },
    { dx: w * 0.4,  dy: h * 0.15 },
    { dx: -w * 0.6, dy: h * 0.8 },
    { dx: w * 0.6,  dy: h * 0.85 },
    { dx: 0,        dy: h * 1.5 },
    { dx: -w * 0.35,dy: h * 0.55 },
  ];
  for (const o of offsets) {
    ctx.fillRect(cx + o.dx, cy + o.dy, dotSize, dotSize);
  }
  void step;
}

/** 돌 블록 상단 노이즈 패턴 */
function drawStoneDither(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
) {
  const w = (ISO_TILE_W / 2) * zoom;
  const h = (ISO_TILE_H / 2) * zoom;
  const dotSize = Math.max(1, zoom * 0.8);
  ctx.fillStyle = 'rgba(80,80,80,0.35)';

  const offsets = [
    { dx: -w * 0.4, dy: h * 0.5 },
    { dx: w * 0.3,  dy: h * 0.4 },
    { dx: -w * 0.1, dy: h * 1.1 },
    { dx: w * 0.5,  dy: h * 1.0 },
    { dx: -w * 0.55,dy: h * 1.3 },
    { dx: w * 0.1,  dy: h * 1.6 },
  ];
  for (const o of offsets) {
    ctx.fillRect(cx + o.dx, cy + o.dy, dotSize, dotSize);
  }
}

/** 나무 결 패턴 */
function drawWoodGrain(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
) {
  const w = (ISO_TILE_W / 2) * zoom;
  const h = (ISO_TILE_H / 2) * zoom;
  ctx.strokeStyle = 'rgba(80,50,10,0.3)';
  ctx.lineWidth = 0.5 * zoom;

  // 이소메트릭 방향 곡선 결무늬 (단순화: 짧은 사선)
  const lines = [
    [cx - w * 0.5, cy + h * 0.6, cx + w * 0.1, cy + h * 0.3],
    [cx - w * 0.2, cy + h * 1.2, cx + w * 0.4, cy + h * 0.9],
  ];
  for (const [x1, y1, x2, y2] of lines) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

// ─── 벽 벽돌 모르타르 패턴 ────────────────────────────────────────────────────

/** 벽 면에 벽돌 모르타르 선 그리기 (NW면 기준) */
function drawBrickMortarNW(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
  faceH: number,
) {
  const w = (ISO_TILE_W / 2) * zoom;
  const h = (ISO_TILE_H / 2) * zoom;
  const brickH = 7 * zoom; // 벽돌 한 줄 높이

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.6 * zoom;

  // NW 면은: 왼쪽 꼭짓점(cx-w, cy+h) → 하단 꼭짓점(cx, cy+h*2) → 수직으로 faceH
  let rowY = brickH;
  while (rowY < faceH) {
    // 수평 모르타르 선 (이소메트릭 평행선 — NW 기울기)
    const t = rowY / faceH;
    const lx1 = cx - w;
    const ly1 = cy + h + rowY;
    const lx2 = cx;
    const ly2 = cy + h * 2 + rowY;
    ctx.beginPath();
    ctx.moveTo(lx1, ly1);
    ctx.lineTo(lx2, ly2);
    ctx.stroke();
    void t;
    rowY += brickH;
  }

  // 수직 모르타르 선 (벽돌 구분)
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, cy + h);
  ctx.lineTo(cx - w * 0.5, cy + h + faceH);
  ctx.stroke();
}

/** 벽 면에 벽돌 모르타르 선 그리기 (NE면 기준) */
function drawBrickMortarNE(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  zoom: number,
  faceH: number,
) {
  const w = (ISO_TILE_W / 2) * zoom;
  const h = (ISO_TILE_H / 2) * zoom;
  const brickH = 7 * zoom;

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.6 * zoom;

  let rowY = brickH;
  while (rowY < faceH) {
    const lx1 = cx;
    const ly1 = cy + h * 2 + rowY;
    const lx2 = cx + w;
    const ly2 = cy + h + rowY;
    ctx.beginPath();
    ctx.moveTo(lx1, ly1);
    ctx.lineTo(lx2, ly2);
    ctx.stroke();
    rowY += brickH;
  }

  ctx.beginPath();
  ctx.moveTo(cx + w * 0.5, cy + h);
  ctx.lineTo(cx + w * 0.5, cy + h + faceH);
  ctx.stroke();
}

// ─── 공개 스프라이트 함수 ─────────────────────────────────────────────────────

/**
 * 바닥 타일 — Minecraft 큐브 상단 (3면)
 * fillColor = top color, edgeColor = 사용 안 함 (하위 호환), topColor/nwColor/neColor 지원
 */
export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  fillColor: string,
  edgeColor: string,
  nwColor?: string,
  neColor?: string,
) {
  const topColor = fillColor;
  const nw = nwColor ?? shadeColor(fillColor, -45);
  const ne = neColor ?? shadeColor(fillColor, -25);
  const d = BLOCK_DEPTH;

  drawCubeTop(ctx, x, y, zoom, topColor);
  drawCubeNW(ctx, x, y, zoom, nw, d);
  drawCubeNE(ctx, x, y, zoom, ne, d);
  drawCubeOutline(ctx, x, y, zoom, d);
  void edgeColor;
}

/** 벽 타일 (NW 방향 — 왼쪽 면) — Minecraft 돌 블록 스타일 */
export function drawWallNW(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  color: string,
) {
  const tw = (ISO_TILE_W / 2) * zoom;
  const th = (ISO_TILE_H / 2) * zoom;
  const wh = WALL_HEIGHT * zoom;

  // NW 벽면 (왼쪽)
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - tw, y + th);
  ctx.lineTo(x - tw, y + th + wh);
  ctx.lineTo(x, y + wh);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -35);
  ctx.fill();

  // 벽돌 모르타르
  drawBrickMortarNW(ctx, x - tw / 2, y - th / 2, zoom, wh + th);

  ctx.strokeStyle = shadeColor(color, -60);
  ctx.lineWidth = 0.7 * zoom;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - tw, y + th);
  ctx.lineTo(x - tw, y + th + wh);
  ctx.lineTo(x, y + wh);
  ctx.closePath();
  ctx.stroke();
}

/** 벽 타일 (NE 방향 — 오른쪽 면) — Minecraft 돌 블록 스타일 */
export function drawWallNE(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  color: string,
) {
  const tw = (ISO_TILE_W / 2) * zoom;
  const th = (ISO_TILE_H / 2) * zoom;
  const wh = WALL_HEIGHT * zoom;

  // NE 벽면 (오른쪽, 약간 밝게)
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x + tw, y + th + wh);
  ctx.lineTo(x, y + wh);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -15);
  ctx.fill();

  // 벽돌 모르타르
  drawBrickMortarNE(ctx, x + tw / 2, y - th / 2, zoom, wh + th);

  ctx.strokeStyle = shadeColor(color, -60);
  ctx.lineWidth = 0.7 * zoom;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x + tw, y + th + wh);
  ctx.lineTo(x, y + wh);
  ctx.closePath();
  ctx.stroke();
}

/** 파티션 — 반높이 돌 벽 블록 (Minecraft 돌담 스타일) */
export function drawPartitionH(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  color: string,
) {
  const tw = (ISO_TILE_W / 2) * zoom;
  const th = (ISO_TILE_H / 2) * zoom;
  const ph = 12 * zoom; // 파티션 높이

  // 상면 (밝은 회색)
  ctx.beginPath();
  ctx.moveTo(x, y - ph);
  ctx.lineTo(x + tw, y + th - ph);
  ctx.lineTo(x, y + th * 2 - ph);
  ctx.lineTo(x - tw, y + th - ph);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, 15);
  ctx.fill();
  ctx.strokeStyle = shadeColor(color, -30);
  ctx.lineWidth = 0.7 * zoom;
  ctx.stroke();

  // 앞면 좌 (NW)
  ctx.beginPath();
  ctx.moveTo(x - tw, y + th - ph);
  ctx.lineTo(x, y + th * 2 - ph);
  ctx.lineTo(x, y + th * 2);
  ctx.lineTo(x - tw, y + th);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -30);
  ctx.fill();
  // 모르타르 선
  ctx.strokeStyle = shadeColor(color, -50);
  ctx.lineWidth = 0.5 * zoom;
  ctx.beginPath();
  ctx.moveTo(x - tw, y + th - ph + ph * 0.5);
  ctx.lineTo(x, y + th * 2 - ph + ph * 0.5);
  ctx.stroke();
  ctx.strokeStyle = shadeColor(color, -40);
  ctx.lineWidth = 0.7 * zoom;
  ctx.beginPath();
  ctx.moveTo(x - tw, y + th - ph);
  ctx.lineTo(x, y + th * 2 - ph);
  ctx.lineTo(x, y + th * 2);
  ctx.lineTo(x - tw, y + th);
  ctx.closePath();
  ctx.stroke();

  // 앞면 우 (NE)
  ctx.beginPath();
  ctx.moveTo(x, y + th * 2 - ph);
  ctx.lineTo(x + tw, y + th - ph);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x, y + th * 2);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -10);
  ctx.fill();
  ctx.strokeStyle = shadeColor(color, -50);
  ctx.lineWidth = 0.5 * zoom;
  ctx.beginPath();
  ctx.moveTo(x, y + th * 2 - ph + ph * 0.5);
  ctx.lineTo(x + tw, y + th - ph + ph * 0.5);
  ctx.stroke();
  ctx.strokeStyle = shadeColor(color, -40);
  ctx.lineWidth = 0.7 * zoom;
  ctx.beginPath();
  ctx.moveTo(x, y + th * 2 - ph);
  ctx.lineTo(x + tw, y + th - ph);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x, y + th * 2);
  ctx.closePath();
  ctx.stroke();
}

/** 파티션 (row 방향 — 같은 모양) */
export function drawPartitionV(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  color: string,
) {
  drawPartitionH(ctx, x, y, zoom, color);
}

/**
 * 책상 — Minecraft Crafting Table 스타일
 * 나무 갈색 상단 + 크래프팅 그리드 + 픽셀 모니터
 */
export function drawDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  color = '#C8A45E',
) {
  const tw = (ISO_TILE_W / 2) * zoom;
  const th = (ISO_TILE_H / 2) * zoom;
  const dh = 10 * zoom; // 책상 높이

  // 상면 (oak plank 색)
  ctx.beginPath();
  ctx.moveTo(x, y - dh);
  ctx.lineTo(x + tw, y + th - dh);
  ctx.lineTo(x, y + th * 2 - dh);
  ctx.lineTo(x - tw, y + th - dh);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, 15);
  ctx.fill();

  // 크래프팅 테이블 그리드 (3×3 크로스 패턴 간략화)
  const gColor = shadeColor(color, -35);
  ctx.strokeStyle = gColor;
  ctx.lineWidth = 0.7 * zoom;
  // 수평 그리드선 (이소메트릭 방향)
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.3, y + th * 0.6 - dh);
  ctx.lineTo(x + tw * 0.7, y + th * 0.1 - dh);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.7, y + th * 1.1 - dh);
  ctx.lineTo(x + tw * 0.3, y + th * 0.6 - dh);
  ctx.stroke();
  // 수직 그리드선
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.1, y + th * 0.2 - dh);
  ctx.lineTo(x - tw * 0.4, y + th * 1.4 - dh);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + tw * 0.4, y - dh * 0.1);
  ctx.lineTo(x + tw * 0.1, y + th * 1.2 - dh);
  ctx.stroke();

  // 나무 결
  drawWoodGrain(ctx, x, y - dh, zoom);

  ctx.strokeStyle = shadeColor(color, -40);
  ctx.lineWidth = 0.8 * zoom;
  ctx.beginPath();
  ctx.moveTo(x, y - dh);
  ctx.lineTo(x + tw, y + th - dh);
  ctx.lineTo(x, y + th * 2 - dh);
  ctx.lineTo(x - tw, y + th - dh);
  ctx.closePath();
  ctx.stroke();

  // 왼쪽 측면 (나무 갈색, 어둡게)
  ctx.beginPath();
  ctx.moveTo(x - tw, y + th - dh);
  ctx.lineTo(x, y + th * 2 - dh);
  ctx.lineTo(x, y + th * 2);
  ctx.lineTo(x - tw, y + th);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -30);
  ctx.fill();
  ctx.strokeStyle = shadeColor(color, -50);
  ctx.lineWidth = 0.7 * zoom;
  ctx.stroke();

  // 오른쪽 측면
  ctx.beginPath();
  ctx.moveTo(x, y + th * 2 - dh);
  ctx.lineTo(x + tw, y + th - dh);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x, y + th * 2);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -15);
  ctx.fill();
  ctx.strokeStyle = shadeColor(color, -50);
  ctx.lineWidth = 0.7 * zoom;
  ctx.stroke();

  // 픽셀 모니터 (밝은 파란 화면)
  const mx = x + tw * 0.28;
  const my = y + th * 0.45 - dh;
  const mw = 9 * zoom;
  const mh = 7 * zoom;
  // 모니터 프레임 (검정)
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(mx - mw / 2, my - mh, mw, mh);
  // 화면 (밝은 파랑 → 마인크래프트 픽셀 GUI 느낌)
  ctx.fillStyle = '#3a9bd5';
  ctx.fillRect(mx - mw / 2 + zoom, my - mh + zoom, mw - 2 * zoom, mh - 2 * zoom);
  // 화면 하이라이트
  ctx.fillStyle = '#6abfef';
  ctx.fillRect(mx - mw / 2 + zoom, my - mh + zoom, (mw - 2 * zoom) * 0.4, zoom);
  // 모니터 받침대
  ctx.fillStyle = '#555';
  ctx.fillRect(mx - 1.5 * zoom, my, 3 * zoom, 3 * zoom);
}

/**
 * 의자 — 픽셀 블록형 (좌석 + 등받이, 팀 컬러)
 */
export function drawChair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  color = '#4a4a6a',
) {
  const tw = 9 * zoom;
  const th = 4.5 * zoom;
  const ch = 5 * zoom;  // 좌석 높이
  const bh = 7 * zoom;  // 등받이 높이

  // 등받이 (뒤쪽, 세워진 블록)
  const bkTop = y - ch - bh;
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.4, bkTop);
  ctx.lineTo(x + tw * 0.1, bkTop + th * 0.4);
  ctx.lineTo(x + tw * 0.1, bkTop + bh + th * 0.4);
  ctx.lineTo(x - tw * 0.4, bkTop + bh);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -20);
  ctx.fill();
  ctx.strokeStyle = shadeColor(color, -45);
  ctx.lineWidth = 0.5 * zoom;
  ctx.stroke();

  // 좌석 상면
  ctx.beginPath();
  ctx.moveTo(x, y - ch);
  ctx.lineTo(x + tw, y + th - ch);
  ctx.lineTo(x, y + th * 2 - ch);
  ctx.lineTo(x - tw, y + th - ch);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = shadeColor(color, -40);
  ctx.lineWidth = 0.6 * zoom;
  ctx.stroke();

  // 좌석 앞면
  ctx.beginPath();
  ctx.moveTo(x - tw, y + th - ch);
  ctx.lineTo(x + tw, y + th - ch);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x - tw, y + th);
  ctx.closePath();
  ctx.fillStyle = shadeColor(color, -25);
  ctx.fill();
  ctx.strokeStyle = shadeColor(color, -45);
  ctx.lineWidth = 0.5 * zoom;
  ctx.stroke();
}

/**
 * 식물 화분 — Minecraft 스타일 잎 블록 + 갈색 화분
 */
export function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number) {
  const tw = 7 * zoom;
  const th = 3.5 * zoom;
  const potH = 5 * zoom;

  // 화분 상면
  ctx.beginPath();
  ctx.moveTo(x, y - potH);
  ctx.lineTo(x + tw, y + th - potH);
  ctx.lineTo(x, y + th * 2 - potH);
  ctx.lineTo(x - tw, y + th - potH);
  ctx.closePath();
  ctx.fillStyle = '#7B3B10';
  ctx.fill();

  // 화분 왼쪽면
  ctx.beginPath();
  ctx.moveTo(x - tw, y + th - potH);
  ctx.lineTo(x, y + th * 2 - potH);
  ctx.lineTo(x, y + th * 2);
  ctx.lineTo(x - tw, y + th);
  ctx.closePath();
  ctx.fillStyle = '#5A2A08';
  ctx.fill();

  // 화분 오른쪽면
  ctx.beginPath();
  ctx.moveTo(x, y + th * 2 - potH);
  ctx.lineTo(x + tw, y + th - potH);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x, y + th * 2);
  ctx.closePath();
  ctx.fillStyle = '#6B3210';
  ctx.fill();

  ctx.strokeStyle = '#3A1A04';
  ctx.lineWidth = 0.6 * zoom;
  ctx.beginPath();
  ctx.moveTo(x, y - potH);
  ctx.lineTo(x + tw, y + th - potH);
  ctx.lineTo(x, y + th * 2 - potH);
  ctx.lineTo(x - tw, y + th - potH);
  ctx.closePath();
  ctx.stroke();

  // 잎 블록 (픽셀 정사각형들) — Minecraft leaf block
  const leafSize = 6 * zoom;
  const leafColors = ['#228B22', '#1A6B1A', '#32CD32', '#2AAA2A'];
  const leafPositions = [
    { dx: -4 * zoom, dy: -potH - leafSize - 2 * zoom },
    { dx: 1 * zoom,  dy: -potH - leafSize * 1.5 },
    { dx: -6 * zoom, dy: -potH - leafSize * 0.3 },
    { dx: 2 * zoom,  dy: -potH - leafSize * 0.6 },
  ];
  for (let i = 0; i < leafPositions.length; i++) {
    const lp = leafPositions[i];
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.fillRect(x + lp.dx, y + lp.dy, leafSize, leafSize);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.4 * zoom;
    ctx.strokeRect(x + lp.dx, y + lp.dy, leafSize, leafSize);
  }
}

/**
 * 정수기 — 마인크래프트 배럴/통 스타일
 */
export function drawCooler(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number) {
  const tw = 5 * zoom;
  const th = 2.5 * zoom;
  const h = 14 * zoom;

  // 본체 상면
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + tw, y + th - h);
  ctx.lineTo(x, y + th * 2 - h);
  ctx.lineTo(x - tw, y + th - h);
  ctx.closePath();
  ctx.fillStyle = '#87CEEB';
  ctx.fill();
  ctx.strokeStyle = '#5a9ab5';
  ctx.lineWidth = 0.6 * zoom;
  ctx.stroke();

  // 본체 왼쪽면
  ctx.beginPath();
  ctx.moveTo(x - tw, y + th - h);
  ctx.lineTo(x, y + th * 2 - h);
  ctx.lineTo(x, y + th * 2);
  ctx.lineTo(x - tw, y + th);
  ctx.closePath();
  ctx.fillStyle = '#ccc';
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.5 * zoom;
  ctx.stroke();

  // 본체 오른쪽면
  ctx.beginPath();
  ctx.moveTo(x, y + th * 2 - h);
  ctx.lineTo(x + tw, y + th - h);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x, y + th * 2);
  ctx.closePath();
  ctx.fillStyle = '#ddd';
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.5 * zoom;
  ctx.stroke();

  // 물통 부분 (상단 파란 줄무늬)
  ctx.fillStyle = '#5abcde';
  ctx.fillRect(x - tw + zoom, y - h + zoom, tw * 2 - 2 * zoom, h * 0.45);
  ctx.strokeStyle = '#3a9ab5';
  ctx.lineWidth = 0.4 * zoom;
  ctx.strokeRect(x - tw + zoom, y - h + zoom, tw * 2 - 2 * zoom, h * 0.45);

  // 버튼 (분배 레버)
  ctx.fillStyle = '#e55';
  ctx.fillRect(x - zoom, y - 2 * zoom, 2 * zoom, 2 * zoom);
}

/**
 * 화이트보드 — 마인크래프트 표지판 스타일
 */
export function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number) {
  const w = 22 * zoom;
  const h = 14 * zoom;
  const borderW = 1.5 * zoom;

  // 보드 테두리 (나무 프레임)
  ctx.fillStyle = '#7A5E2A';
  ctx.fillRect(x - w / 2 - borderW, y - h - borderW, w + borderW * 2, h + borderW * 2);

  // 보드 면 (흰색)
  ctx.fillStyle = '#f0f0e8';
  ctx.fillRect(x - w / 2, y - h, w, h);

  // 마커 낙서 (마인크래프트 픽셀 글씨 느낌)
  ctx.fillStyle = '#3a7bd5';
  // 파란 픽셀 라인 (수평)
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - w * 0.35, y - h + (3 + i * 3.5) * zoom, w * 0.7, zoom);
  }

  // 빨간 픽셀 원 대신 사각형 닷
  ctx.fillStyle = '#e55';
  ctx.fillRect(x - 2 * zoom, y - h * 0.4, 4 * zoom, 4 * zoom);
  ctx.fillStyle = '#ee8';
  ctx.fillRect(x + 4 * zoom, y - h * 0.5, 3 * zoom, 3 * zoom);

  // 받침대
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 1.5 * zoom, y, 3 * zoom, 3 * zoom);
}

/** 그림자 타원 (캐릭터 발밑) */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(x, y, 8 * zoom, 4 * zoom, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();
}

// ─── 텍스처 디테일 추가 함수 (바닥 타일용 오버레이) ─────────────────────────

/**
 * 팀 ID에 따른 텍스처 디테일 (잔디 디더링, 돌 노이즈 등) 오버레이
 * isoRenderer에서 바닥 타일 그린 후 선택적으로 호출
 */
export function drawFloorTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  teamId: string,
) {
  switch (teamId) {
    case 'newsletter':
      drawGrassDither(ctx, x, y, zoom);
      break;
    case 'data':
    case 'ops':
      drawStoneDither(ctx, x, y, zoom);
      break;
    case 'research':
      drawWoodGrain(ctx, x, y, zoom);
      break;
    default:
      break;
  }
}
