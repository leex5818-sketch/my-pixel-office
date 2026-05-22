import { useRef, useEffect, useCallback } from 'react'
import type { OfficeState } from '../engine/officeState.js'
import { startGameLoop } from '../engine/gameLoop.js'
import { renderFrame } from '../engine/isoRenderer.js'
import { CharacterState } from '../types.js'
import {
  CAMERA_FOLLOW_LERP,
  CAMERA_FOLLOW_SNAP_THRESHOLD,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  ZOOM_SCROLL_THRESHOLD,
  PAN_MARGIN_FRACTION,
  CHARACTER_SITTING_OFFSET_PX,
} from '../../constants.js'
import { worldToScreen, screenToTileF, mapBounds } from '../engine/iso.js'
import { unlockAudio } from '../../notificationSound.js'

interface OfficeCanvasProps {
  officeState: OfficeState
  onClick: (agentId: number) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  panRef: React.MutableRefObject<{ x: number; y: number }>
  tileTeamMap?: string[]
}

export function OfficeCanvas({ officeState, onClick, zoom, onZoomChange, panRef, tileTeamMap }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })
  const zoomAccumulatorRef = useRef(0)

  const clampPan = useCallback((px: number, py: number): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: px, y: py }
    const layout = officeState.getLayout()
    const bounds = mapBounds(layout.cols, layout.rows)
    const mapW = bounds.width * zoom
    const mapH = bounds.height * zoom
    const marginX = canvas.width * PAN_MARGIN_FRACTION
    const marginY = canvas.height * PAN_MARGIN_FRACTION
    const maxPanX = (mapW / 2) + canvas.width / 2 - marginX
    const maxPanY = (mapH / 2) + canvas.height / 2 - marginY
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py)),
    }
  }, [officeState, zoom])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    resizeCanvas()
    const observer = new ResizeObserver(() => resizeCanvas())
    if (containerRef.current) observer.observe(containerRef.current)

    const stop = startGameLoop(canvas, {
      update: (dt) => { officeState.update(dt) },
      render: (ctx) => {
        const w = canvas.width
        const h = canvas.height
        const layout = officeState.getLayout()

        // 카메라 팔로우 (iso 좌표 기반)
        if (officeState.cameraFollowId !== null) {
          const followCh = officeState.characters.get(officeState.cameraFollowId)
          if (followCh) {
            const { sx, sy } = worldToScreen(followCh.x, followCh.y, 0)
            const bounds = mapBounds(layout.cols, layout.rows)
            const targetX = w / 2 - (sx - bounds.minX) * zoom
            const targetY = h / 3 - (sy - bounds.minY) * zoom
            const dx = targetX - panRef.current.x
            const dy = targetY - panRef.current.y
            if (Math.abs(dx) < CAMERA_FOLLOW_SNAP_THRESHOLD && Math.abs(dy) < CAMERA_FOLLOW_SNAP_THRESHOLD) {
              panRef.current = { x: targetX, y: targetY }
            } else {
              panRef.current = {
                x: panRef.current.x + dx * CAMERA_FOLLOW_LERP,
                y: panRef.current.y + dy * CAMERA_FOLLOW_LERP,
              }
            }
          }
        }

        const selectionState = {
          selectedAgentId: officeState.selectedAgentId,
          hoveredAgentId: officeState.hoveredAgentId,
          tileTeamMap,
        }

        const { offsetX, offsetY } = renderFrame(
          ctx,
          w,
          h,
          officeState.tileMap,
          officeState.furniture,
          officeState.getCharacters(),
          zoom,
          panRef.current.x,
          panRef.current.y,
          selectionState,
          undefined,
          layout.tileColors,
          layout.cols,
          layout.rows,
          layout.furniture,
        )
        offsetRef.current = { x: offsetX, y: offsetY }
      },
    })

    return () => { stop(); observer.disconnect() }
  }, [officeState, resizeCanvas, zoom, panRef, tileTeamMap])

  // CSS 마우스 좌표 → device pixel 좌표
  const screenToDevicePx = useCallback(
    (clientX: number, clientY: number): { deviceX: number; deviceY: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      return {
        deviceX: (clientX - rect.left) * dpr,
        deviceY: (clientY - rect.top) * dpr,
      }
    },
    [],
  )

  // device pixel → iso 타일 좌표
  const deviceToTile = useCallback(
    (deviceX: number, deviceY: number): { col: number; row: number } | null => {
      const offset = offsetRef.current
      const localX = (deviceX - offset.x) / zoom
      const localY = (deviceY - offset.y) / zoom
      const { col, row } = screenToTileF(localX, localY)
      const c = Math.floor(col)
      const r = Math.floor(row)
      const layout = officeState.getLayout()
      if (c < 0 || c >= layout.cols || r < 0 || r >= layout.rows) return null
      return { col: c, row: r }
    },
    [officeState, zoom],
  )

  // iso 캐릭터 hit-test
  const hitTestCharacter = useCallback(
    (deviceX: number, deviceY: number): number | null => {
      const chars = officeState.getCharacters()
        .filter((ch) => !ch.matrixEffect)
        // 앞쪽 캐릭터부터 체크 (depth 역순)
        .sort((a, b) => (b.tileCol + b.tileRow) - (a.tileCol + a.tileRow))

      for (const ch of chars) {
        const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0
        const { sx, sy } = worldToScreen(ch.x, ch.y, 0)
        const px = offsetRef.current.x + sx * zoom
        const py = offsetRef.current.y + (sy + sittingOffset) * zoom

        const halfW = 8 * zoom
        const height = 24 * zoom
        if (
          deviceX >= px - halfW && deviceX <= px + halfW &&
          deviceY >= py - height && deviceY <= py
        ) {
          return ch.id
        }
      }
      return null
    },
    [officeState, zoom],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const dpr = window.devicePixelRatio || 1
        const dx = (e.clientX - panStartRef.current.mouseX) * dpr
        const dy = (e.clientY - panStartRef.current.mouseY) * dpr
        panRef.current = clampPan(
          panStartRef.current.panX + dx,
          panStartRef.current.panY + dy,
        )
        return
      }

      const pos = screenToDevicePx(e.clientX, e.clientY)
      if (!pos) return
      const hitId = hitTestCharacter(pos.deviceX, pos.deviceY)
      officeState.hoveredAgentId = hitId
      const canvas = canvasRef.current
      if (canvas) canvas.style.cursor = hitId !== null ? 'pointer' : 'default'
    },
    [officeState, screenToDevicePx, hitTestCharacter, clampPan, panRef],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      unlockAudio()
      if (e.button === 1) {
        e.preventDefault()
        officeState.cameraFollowId = null
        isPanningRef.current = true
        panStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        }
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = 'grabbing'
      }
    },
    [officeState, panRef],
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        isPanningRef.current = false
        const canvas = canvasRef.current
        if (canvas) canvas.style.cursor = 'default'
      }
    },
    [],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToDevicePx(e.clientX, e.clientY)
      if (!pos) return

      const hitId = hitTestCharacter(pos.deviceX, pos.deviceY)
      if (hitId !== null) {
        officeState.dismissBubble(hitId)
        if (officeState.selectedAgentId === hitId) {
          officeState.selectedAgentId = null
          officeState.cameraFollowId = null
        } else {
          officeState.selectedAgentId = hitId
          officeState.cameraFollowId = hitId
        }
        onClick(hitId)
        return
      }

      // 빈 공간 클릭 → 선택 해제
      if (officeState.selectedAgentId !== null) {
        officeState.selectedAgentId = null
        officeState.cameraFollowId = null
      }
    },
    [officeState, onClick, screenToDevicePx, hitTestCharacter],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (officeState.selectedAgentId === null) return
      const pos = screenToDevicePx(e.clientX, e.clientY)
      if (!pos) return
      const tile = deviceToTile(pos.deviceX, pos.deviceY)
      if (tile) {
        officeState.walkToTile(officeState.selectedAgentId, tile.col, tile.row)
      }
    },
    [officeState, screenToDevicePx, deviceToTile],
  )

  const handleMouseLeave = useCallback(() => {
    isPanningRef.current = false
    officeState.hoveredAgentId = null
  }, [officeState])

  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null)
  wheelHandlerRef.current = (e: WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      zoomAccumulatorRef.current += e.deltaY
      if (Math.abs(zoomAccumulatorRef.current) >= ZOOM_SCROLL_THRESHOLD) {
        const delta = zoomAccumulatorRef.current < 0 ? ZOOM_STEP : -ZOOM_STEP
        zoomAccumulatorRef.current = 0
        const newZoom = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta)) * 10) / 10
        if (newZoom !== zoom) onZoomChange(newZoom)
      }
    } else {
      const dpr = window.devicePixelRatio || 1
      officeState.cameraFollowId = null
      panRef.current = clampPan(
        panRef.current.x - e.deltaX * dpr,
        panRef.current.y - e.deltaY * dpr,
      )
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => { wheelHandlerRef.current?.(e) }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [])

  const handleAuxClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) e.preventDefault()
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#1a1a2e' }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        style={{ display: 'block' }}
      />
    </div>
  )
}
