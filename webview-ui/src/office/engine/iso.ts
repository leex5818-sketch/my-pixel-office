// 2:1 아이소메트릭 투영 수식
// 월드 좌표: (wx, wy) in sprite-pixel units, TILE_SIZE=16 per tile
// 스크린 좌표: canvas pixel units (before zoom)

export const ISO_TILE_W = 32;       // 다이아몬드 가로
export const ISO_TILE_H = 16;       // 다이아몬드 세로
export const ISO_WALL_H = 24;       // 벽 높이 (px)
export const ISO_DESK_H = 10;       // 책상 높이
export const ISO_PARTITION_H = 20;  // 파티션 높이
export const TILE_SIZE = 16;        // 월드 타일 크기 (pixel-agents 호환)

/** 월드 픽셀 → 스크린 픽셀 (줌·오프셋 미포함) */
export function worldToScreen(wx: number, wy: number, wz = 0): { sx: number; sy: number } {
  const tx = wx / TILE_SIZE;
  const ty = wy / TILE_SIZE;
  return {
    sx: (tx - ty) * (ISO_TILE_W / 2),
    sy: (tx + ty) * (ISO_TILE_H / 2) - wz,
  };
}

/** 타일 인덱스 (col, row) → 다이아몬드 중심 스크린 좌표 */
export function tileToScreen(col: number, row: number): { sx: number; sy: number } {
  return {
    sx: (col - row) * (ISO_TILE_W / 2),
    sy: (col + row) * (ISO_TILE_H / 2),
  };
}

/** 스크린 좌표 → 타일 인덱스 (소수점 포함, Math.floor로 정수 변환) */
export function screenToTileF(sx: number, sy: number): { col: number; row: number } {
  const halfW = ISO_TILE_W / 2;
  const halfH = ISO_TILE_H / 2;
  return {
    col: (sx / halfW + sy / halfH) / 2,
    row: (sy / halfH - sx / halfW) / 2,
  };
}

/** 맵 전체 AABB (centering 계산용) */
export function mapBounds(cols: number, rows: number): {
  width: number;
  height: number;
  minX: number;
  minY: number;
} {
  const corners = [
    tileToScreen(0, 0),
    tileToScreen(cols, 0),
    tileToScreen(0, rows),
    tileToScreen(cols, rows),
  ];
  const xs = corners.map((c) => c.sx);
  const ys = corners.map((c) => c.sy);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    minX,
    minY,
    width: Math.max(...xs) - minX + ISO_TILE_W,
    height: Math.max(...ys) - minY + ISO_TILE_H,
  };
}

/** 깊이 키: col+row 기준, layer로 보조 정렬 */
export function depthKey(col: number, row: number, layer: number): number {
  return (col + row) * 10 + layer;
}
