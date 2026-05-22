// 2.5D 아이소메트릭 렌더러
// 기존 renderer.ts의 renderFrame 시그니처와 호환

import { TileType, TILE_SIZE, CharacterState } from '../types.js'
import type {
  FurnitureInstance,
  Character,
  FloorColor,
  PlacedFurniture,
} from '../types.js'
type TileTypeVal = (typeof TileType)[keyof typeof TileType]
import { getCachedSprite } from '../sprites/spriteCache.js'
import { getCharacterSprite } from './characters.js'
import { getCharacterSprites } from '../sprites/spriteData.js'
import { renderMatrixEffect } from './matrixEffect.js'
import {
  worldToScreen,
  tileToScreen,
  mapBounds,
  depthKey,
  ISO_TILE_H,
} from './iso.js'
import {
  drawFloorTile,
  drawWallNW,
  drawWallNE,
  drawPartitionH,
  drawDesk,
  drawChair,
  drawPlant,
  drawCooler,
  drawWhiteboard,
  drawShadow,
} from '../sprites/isoSprites.js'

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface IsoDrawOp {
  depth: number
  draw: (ctx: CanvasRenderingContext2D) => void
}

// ─── Minecraft 블록 팔레트 ────────────────────────────────────────────────────

const TEAM_BLOCK_COLORS: Record<string, { top: string; nw: string; ne: string }> = {
  // Activity zones
  explore: { top: '#7CBD6B', nw: '#4A7A3B', ne: '#5C9A4A' }, // 잔디 (Grass)
  plan:    { top: '#C8A45E', nw: '#7A5E2A', ne: '#A07840' }, // 오크 판자 (Oak plank)
  dev:     { top: '#9B9B9B', nw: '#6B6B6B', ne: '#808080' }, // 돌 (Stone)
  comms:   { top: '#D9A85C', nw: '#8A6030', ne: '#B07840' }, // 금 (Gold)
  sub:     { top: '#8C7BB5', nw: '#4A3A7A', ne: '#6A5A9A' }, // 보라 (Purple)
  idle:    { top: '#5C7A9A', nw: '#2A4A6A', ne: '#3A5A7A' }, // 돌 벽돌 (Stone brick)
  // Legacy entries kept for backwards compat
  newsletter: { top: '#7CBD6B', nw: '#4A7A3B', ne: '#5C9A4A' },
  research:   { top: '#C8A45E', nw: '#7A5E2A', ne: '#A07840' },
  data:       { top: '#9B9B9B', nw: '#6B6B6B', ne: '#808080' },
  design:     { top: '#DCCC7A', nw: '#9B8A40', ne: '#C0A850' },
  ops:        { top: '#6B7FBE', nw: '#3B4A8A', ne: '#505F9E' },
  shared:     { top: '#AAAAAA', nw: '#707070', ne: '#8C8C8C' },
  default:    { top: '#888888', nw: '#555555', ne: '#6E6E6E' },
}

/** Derive isometric block shading from a hex color */
function hexToBlockColors(hex: string): { top: string; nw: string; ne: string } {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const darken = (v: number, pct: number) => Math.max(0, Math.floor(v * (1 - pct)))
  const toHex = (rv: number, gv: number, bv: number) =>
    '#' + [rv, gv, bv].map(v => v.toString(16).padStart(2, '0')).join('')
  return {
    top: hex,
    nw: toHex(darken(r, 0.35), darken(g, 0.35), darken(b, 0.35)),
    ne: toHex(darken(r, 0.20), darken(g, 0.20), darken(b, 0.20)),
  }
}

/** Register a dynamic team's block color by hex. Safe to call multiple times. */
export function registerTeamBlockColor(teamId: string, hex: string): void {
  if (!TEAM_BLOCK_COLORS[teamId]) {
    TEAM_BLOCK_COLORS[teamId] = hexToBlockColors(hex)
  }
}

const FLOOR_BLOCK_DEFAULT = TEAM_BLOCK_COLORS['default']

// ─── 메인 렌더 함수 ─────────────────────────────────────────────────────────

export interface IsoRenderState {
  selectedAgentId: number | null
  hoveredAgentId: number | null
  tileTeamMap?: string[] // index = row*cols+col → teamId
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  tileMap: TileTypeVal[][],
  _furniture: FurnitureInstance[],
  characters: Character[],
  zoom: number,
  panX: number,
  panY: number,
  selection?: IsoRenderState,
  _editor?: unknown,
  _tileColors?: Array<FloorColor | null>,
  layoutCols?: number,
  layoutRows?: number,
  placedFurniture?: PlacedFurniture[],
): { offsetX: number; offsetY: number } {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const cols = layoutCols ?? (tileMap.length > 0 ? tileMap[0].length : 0)
  const rows = layoutRows ?? tileMap.length
  if (cols === 0 || rows === 0) return { offsetX: 0, offsetY: 0 }

  const bounds = mapBounds(cols, rows)
  const mapPxW = bounds.width * zoom
  const mapPxH = bounds.height * zoom

  // 뷰포트 중심 기준 오프셋 (맵 상단 꼭짓점이 뷰포트 위쪽 중앙 근처)
  const offsetX = Math.floor((canvasWidth - mapPxW) / 2) - bounds.minX * zoom + Math.round(panX)
  const offsetY = Math.floor((canvasHeight - mapPxH) / 3) - bounds.minY * zoom + Math.round(panY)

  const ops: IsoDrawOp[] = []

  // ── 1. 바닥 타일 ──────────────────────────────────────────────────────────
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = tileMap[r]?.[c]
      if (tile === undefined || tile === TileType.VOID) continue

      const teamId = selection?.tileTeamMap?.[r * cols + c]
      // Minecraft 블록 팔레트 우선, fallback은 기존 색상
      const blockColors = teamId
        ? (TEAM_BLOCK_COLORS[teamId] ?? FLOOR_BLOCK_DEFAULT)
        : FLOOR_BLOCK_DEFAULT

      const isWall = tile === TileType.WALL

      if (!isWall) {
        const { sx, sy } = tileToScreen(c, r)
        const sx2 = offsetX + sx * zoom
        const sy2 = offsetY + sy * zoom
        const col = c, row = r
        ops.push({
          depth: depthKey(col, row, 0),
          draw: (ctx) => drawFloorTile(ctx, sx2, sy2, zoom, blockColors.top, blockColors.nw, blockColors.nw, blockColors.ne),
        })
      }
    }
  }

  // ── 2. 벽 타일 (layer 1) ─────────────────────────────────────────────────
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = tileMap[r]?.[c]
      if (tile !== TileType.WALL) continue

      const { sx, sy } = tileToScreen(c, r)
      const sx2 = offsetX + sx * zoom
      const sy2 = offsetY + (sy + ISO_TILE_H / 2) * zoom
      // Minecraft 돌 벽 색상
      const wallColor = '#5C5C5C'
      const wallTop = '#8C8C8C'
      const wallNW = '#5C5C5C'
      const wallNE = '#707070'
      const col = c, row = r

      // NW face
      ops.push({
        depth: depthKey(col, row, 1),
        draw: (ctx) => {
          drawFloorTile(ctx, offsetX + sx * zoom, offsetY + sy * zoom, zoom, wallTop, wallNW, wallNW, wallNE)
          drawWallNW(ctx, sx2, sy2, zoom, wallColor)
          drawWallNE(ctx, sx2, sy2, zoom, wallColor)
        },
      })
    }
  }

  // ── 3. 가구 (layer 1-2) ───────────────────────────────────────────────────
  if (placedFurniture) {
    for (const pf of placedFurniture) {
      const { sx, sy } = tileToScreen(pf.col, pf.row)
      // 다이아몬드 하단 중심 기준 (col+row)*ISO_TILE_H/2 + ISO_TILE_H
      const bx = offsetX + (sx) * zoom
      const by = offsetY + (sy + ISO_TILE_H) * zoom
      const col = pf.col, row = pf.row
      const type = pf.type

      ops.push({
        depth: depthKey(col, row, type === 'partition' ? 3 : 2),
        draw: (ctx) => {
          if (type === 'desk') {
            drawDesk(ctx, bx, by, zoom)
          } else if (type === 'chair') {
            drawChair(ctx, bx, by - 2 * zoom, zoom)
          } else if (type === 'plant') {
            drawPlant(ctx, bx, by, zoom)
          } else if (type === 'cooler') {
            drawCooler(ctx, bx, by, zoom)
          } else if (type === 'whiteboard') {
            drawWhiteboard(ctx, bx, by, zoom)
          } else if (type === 'partition') {
            drawPartitionH(ctx, bx, by, zoom, '#4a4560')
          }
        },
      })
    }
  }

  // ── 4. 캐릭터 (layer 2) ───────────────────────────────────────────────────
  const selectedId = selection?.selectedAgentId ?? null
  const hoveredId = selection?.hoveredAgentId ?? null

  for (const ch of characters) {
    if (ch.matrixEffect) {
      // 매트릭스 스폰/디스폰 효과
      const mxSprites = getCharacterSprites(ch.palette, ch.hueShift)
      const mxSpriteData = getCharacterSprite(ch, mxSprites)
      if (!mxSpriteData) continue
      const { sx, sy } = worldToScreen(ch.x, ch.y)
      const screenX = offsetX + sx * zoom
      const screenY = offsetY + sy * zoom
      const col = Math.floor(ch.tileCol)
      const row = Math.floor(ch.tileRow)
      ops.push({
        depth: depthKey(col, row, 2),
        draw: (ctx) => {
          ctx.save()
          renderMatrixEffect(ctx, ch, mxSpriteData, screenX - TILE_SIZE * zoom / 2, screenY - TILE_SIZE * zoom, zoom)
          ctx.restore()
        },
      })
      continue
    }

    const sittingOffset = ch.state === CharacterState.TYPE ? 6 : 0
    const sprites = getCharacterSprites(ch.palette, ch.hueShift)
    const spriteData = getCharacterSprite(ch, sprites)
    if (!spriteData) continue

    const { sx, sy } = worldToScreen(ch.x, ch.y)
    const screenX = offsetX + sx * zoom
    const screenY = offsetY + sy * zoom

    const sprite = getCachedSprite(spriteData, zoom)
    const drawX = Math.round(screenX - sprite.width / 2)
    const drawY = Math.round(screenY - sprite.height + sittingOffset * zoom)

    const col = ch.tileCol
    const row = ch.tileRow
    const isSelected = ch.id === selectedId
    const isHovered = ch.id === hoveredId

    ops.push({
      depth: depthKey(col, row, 2),
      draw: (ctx) => {
        // 그림자
        drawShadow(ctx, screenX, screenY - 2 * zoom, zoom)

        // 팀 컬러 글로우 (선택/호버)
        if (isSelected || isHovered) {
          const teamColor = ch.team?.color ?? '#5a8cff'
          ctx.save()
          ctx.globalAlpha = isSelected ? 0.9 : 0.5
          ctx.shadowBlur = 8 * zoom
          ctx.shadowColor = teamColor
          ctx.drawImage(sprite, drawX, drawY)
          ctx.restore()
        }

        ctx.drawImage(sprite, drawX, drawY)

        // 이름 라벨 (항상)
        renderNameLabel(ctx, ch, screenX, drawY, zoom, isSelected || isHovered)
      },
    })
  }

  // ── 5. 정렬 후 드로우 ────────────────────────────────────────────────────
  ops.sort((a, b) => a.depth - b.depth)
  for (const op of ops) op.draw(ctx)

  // ── 6. 말풍선 (항상 최상위) ──────────────────────────────────────────────
  renderBubbles(ctx, characters, offsetX, offsetY, zoom)

  return { offsetX, offsetY }
}

// ─── 이름 라벨 ───────────────────────────────────────────────────────────────

function renderNameLabel(
  ctx: CanvasRenderingContext2D,
  ch: Character,
  screenX: number,
  spriteTop: number,
  zoom: number,
  expanded: boolean,
) {
  const name = ch.folderName ?? `#${ch.id}`
  const fontSize = Math.max(9, 10 * zoom)
  ctx.font = `${fontSize}px "FS Pixel Sans", monospace`
  ctx.textAlign = 'center'

  if (expanded && ch.team) {
    // 팀 이름 라벨
    const teamLabel = ch.team.name
    const tw = ctx.measureText(teamLabel).width + 8 * zoom
    const th = fontSize + 4 * zoom
    const tx = screenX - tw / 2
    const ty = spriteTop - 18 * zoom - th

    ctx.fillStyle = ch.team.color + 'cc'
    ctx.fillRect(tx, ty, tw, th)
    ctx.fillStyle = '#fff'
    ctx.fillText(teamLabel, screenX, ty + th - 3 * zoom)
  }

  const lw = ctx.measureText(name).width + 6 * zoom
  const lh = fontSize + 3 * zoom
  const lx = screenX - lw / 2
  const ly = spriteTop - 5 * zoom - lh

  ctx.fillStyle = '#000000aa'
  ctx.fillRect(lx, ly, lw, lh)
  ctx.fillStyle = '#e0e0ff'
  ctx.fillText(name, screenX, ly + lh - 2 * zoom)
}

// ─── 말풍선 ──────────────────────────────────────────────────────────────────

function renderBubbles(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
) {
  for (const ch of characters) {
    if (!ch.bubbleType || ch.matrixEffect) continue

    const { sx, sy } = worldToScreen(ch.x, ch.y)
    const screenX = offsetX + sx * zoom
    const screenY = offsetY + sy * zoom
    const bx = Math.round(screenX - 6 * zoom)
    const by = Math.round(screenY - 40 * zoom)

    ctx.save()
    if (ch.bubbleType === 'permission') {
      ctx.fillStyle = '#ffcc00'
      ctx.strokeStyle = '#cc8800'
    } else {
      ctx.fillStyle = '#5a8cff'
      ctx.strokeStyle = '#3a6cdf'
    }
    ctx.lineWidth = zoom
    ctx.beginPath()
    ctx.roundRect(bx, by, 12 * zoom, 12 * zoom, 2 * zoom)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = `${8 * zoom}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(ch.bubbleType === 'permission' ? '!' : '…', bx + 6 * zoom, by + 9 * zoom)
    ctx.restore()
  }
}

// ─── OfficeCanvas에서 hit-test용 오프셋 반환 ────────────────────────────────

export function calcIsoOffset(
  canvasWidth: number,
  canvasHeight: number,
  cols: number,
  rows: number,
  zoom: number,
  panX: number,
  panY: number,
): { offsetX: number; offsetY: number } {
  const bounds = mapBounds(cols, rows)
  const mapPxW = bounds.width * zoom
  const mapPxH = bounds.height * zoom
  return {
    offsetX: Math.floor((canvasWidth - mapPxW) / 2) - bounds.minX * zoom + Math.round(panX),
    offsetY: Math.floor((canvasHeight - mapPxH) / 3) - bounds.minY * zoom + Math.round(panY),
  }
}
