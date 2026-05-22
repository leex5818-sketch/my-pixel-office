// Fixed 6-zone isometric layout — activity-based zones

import { TileType } from '../types.js'
import type { OfficeLayout, TileType as TileTypeVal, PlacedFurniture, TeamZone } from '../types.js'

// ─── Zone geometry constants ─────────────────────────────────────────────────

const ZONE_W = 8
const ZONE_H = 7
const CORRIDOR = 2
const MAX_PER_ROW = 3

// ─── Public types ─────────────────────────────────────────────────────────────

export interface TeamDef {
  id: string
  name: string
  color: string
}

interface ZoneDef {
  teamId: string
  col: number
  row: number
  w: number
  h: number
  color: string
  label: string
}

// ─── Fixed 6 activity zone definitions ───────────────────────────────────────

const ZONE_DEFS: ZoneDef[] = [
  { teamId: 'explore', col: 1,  row: 1,  w: ZONE_W, h: ZONE_H, color: '#7CBD6B', label: '탐색 구역' },
  { teamId: 'plan',    col: 11, row: 1,  w: ZONE_W, h: ZONE_H, color: '#C8A45E', label: '설계 구역' },
  { teamId: 'dev',     col: 21, row: 1,  w: ZONE_W, h: ZONE_H, color: '#9B9B9B', label: '개발 구역' },
  { teamId: 'comms',   col: 1,  row: 10, w: ZONE_W, h: ZONE_H, color: '#D9A85C', label: '소통 구역' },
  { teamId: 'sub',     col: 11, row: 10, w: ZONE_W, h: ZONE_H, color: '#8C7BB5', label: '서브에이전트 구역' },
  { teamId: 'idle',    col: 21, row: 10, w: ZONE_W, h: ZONE_H, color: '#5C7A9A', label: '휴식 공간' },
]

const NUM_ZONES = ZONE_DEFS.length
const NUM_COLS_ZONES = Math.min(NUM_ZONES, MAX_PER_ROW)
const NUM_ROWS_ZONES = Math.ceil(NUM_ZONES / MAX_PER_ROW)

export const ISO_COLS = 1 + NUM_COLS_ZONES * ZONE_W + (NUM_COLS_ZONES - 1) * CORRIDOR + 1
export const ISO_ROWS = 1 + NUM_ROWS_ZONES * ZONE_H + (NUM_ROWS_ZONES - 1) * CORRIDOR + 1

// ─── Tile generation ──────────────────────────────────────────────────────────

function createTilesFromZones(cols: number, rows: number, zoneDefs: ZoneDef[]): TileTypeVal[] {
  const tiles: TileTypeVal[] = new Array(cols * rows).fill(TileType.VOID)

  function set(c: number, r: number, t: TileTypeVal) {
    if (c >= 0 && c < cols && r >= 0 && r < rows) {
      tiles[r * cols + c] = t
    }
  }

  // Each zone: interior floor, border wall
  for (const zone of zoneDefs) {
    const { col, row, w, h } = zone
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        const isEdge = r === row || r === row + h - 1 || c === col || c === col + w - 1
        set(c, r, isEdge ? TileType.WALL : TileType.FLOOR_1)
      }
    }
  }

  // Vertical corridors between zone columns
  for (let zoneCol = 0; zoneCol < NUM_COLS_ZONES - 1; zoneCol++) {
    const corridorStartC = 1 + zoneCol * (ZONE_W + CORRIDOR) + ZONE_W
    for (let r = 1; r < rows - 1; r++) {
      for (let dc = 0; dc < CORRIDOR; dc++) {
        set(corridorStartC + dc, r, TileType.FLOOR_2)
      }
    }
  }

  // Horizontal corridors between zone rows
  for (let zoneRow = 0; zoneRow < NUM_ROWS_ZONES - 1; zoneRow++) {
    const corridorStartR = 1 + zoneRow * (ZONE_H + CORRIDOR) + ZONE_H
    for (let c = 1; c < cols - 1; c++) {
      for (let dr = 0; dr < CORRIDOR; dr++) {
        set(c, corridorStartR + dr, TileType.FLOOR_2)
      }
    }
  }

  return tiles
}

// ─── Furniture generation ─────────────────────────────────────────────────────

function createFurnitureFromZones(zoneDefs: ZoneDef[]): PlacedFurniture[] {
  const furniture: PlacedFurniture[] = []
  let uid = 1

  for (const zone of zoneDefs) {
    const { col, row, teamId } = zone

    const deskPositions = [
      { c: col + 1, r: row + 2 },
      { c: col + 4, r: row + 2 },
    ]

    for (const dp of deskPositions) {
      furniture.push({ uid: `desk-${uid++}`, type: 'desk', col: dp.c, row: dp.r })
      furniture.push({ uid: `chair-${uid++}`, type: 'chair', col: dp.c, row: dp.r + 2 })
    }

    furniture.push({
      uid: `partition-${uid++}`,
      type: 'partition',
      col: col + 3,
      row: row + 2,
    })

    furniture.push({ uid: `plant-${uid++}`, type: 'plant', col: col + 1, row: row + 1 })

    if (teamId === 'idle') {
      furniture.push({ uid: `cooler-${uid++}`, type: 'cooler', col: col + 3, row: row + 3 })
      furniture.push({ uid: `plant-${uid++}`, type: 'plant', col: col + 6, row: row + 5 })
    } else {
      furniture.push({ uid: `whiteboard-${uid++}`, type: 'whiteboard', col: col + 5, row: row + 1 })
    }
  }

  return furniture
}

// ─── Zone metadata generation ─────────────────────────────────────────────────

function createZonesFromDefs(zoneDefs: ZoneDef[], furniture: PlacedFurniture[]): TeamZone[] {
  return zoneDefs.map(({ col, row, w, h, teamId, color }) => {
    const rects = [{ col, row, w, h }]

    const preferredSeatUids = furniture
      .filter(
        (pf) =>
          pf.type === 'chair' &&
          pf.col >= col &&
          pf.col < col + w &&
          pf.row >= row &&
          pf.row < row + h,
      )
      .map((pf) => pf.uid)

    return {
      teamId,
      color,
      rects,
      preferredSeatUids,
      labelCol: col + Math.floor(w / 2),
      labelRow: row,
    }
  })
}

// ─── Layout builder ───────────────────────────────────────────────────────────

export function createDefaultIsoLayout(): OfficeLayout {
  const tiles = createTilesFromZones(ISO_COLS, ISO_ROWS, ZONE_DEFS)
  const furniture = createFurnitureFromZones(ZONE_DEFS)
  const zones = createZonesFromDefs(ZONE_DEFS, furniture)
  return { version: 1, cols: ISO_COLS, rows: ISO_ROWS, tiles, furniture, zones }
}

// ─── Tile→team mapping ────────────────────────────────────────────────────────

export function createTileTeamMap(
  tiles: TileTypeVal[],
  cols?: number,
  rows?: number,
  zoneDefs?: ZoneDef[],
): string[] {
  const effectiveCols = cols ?? ISO_COLS
  const effectiveRows = rows ?? ISO_ROWS
  const effectiveZoneDefs = zoneDefs ?? ZONE_DEFS

  const map = new Array(effectiveCols * effectiveRows).fill('')
  for (const zone of effectiveZoneDefs) {
    for (let r = zone.row; r < zone.row + zone.h; r++) {
      for (let c = zone.col; c < zone.col + zone.w; c++) {
        const idx = r * effectiveCols + c
        if (tiles[idx] !== TileType.VOID) map[idx] = zone.teamId
      }
    }
  }
  return map
}

/** Build ZoneDef array from a layout's zones (for tileTeamMap rebuild) */
export function buildZoneDefsFromLayout(layout: OfficeLayout): ZoneDef[] {
  return (layout.zones ?? []).map(z => ({
    teamId: z.teamId,
    col: z.rects[0]?.col ?? 0,
    row: z.rects[0]?.row ?? 0,
    w: z.rects[0]?.w ?? ZONE_W,
    h: z.rects[0]?.h ?? ZONE_H,
    color: z.color,
    label: z.teamId,
  }))
}

// ─── Legacy compat: createDynamicIsoLayout is no longer needed ────────────────

/** @deprecated Use createDefaultIsoLayout() — layout is now fixed 6 activity zones */
export function createDynamicIsoLayout(_teams: TeamDef[]): OfficeLayout {
  return createDefaultIsoLayout()
}
