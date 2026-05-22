import { useState, useEffect, useRef } from 'react'
import type { OfficeLayout } from '../office/types.js'
import { tileToScreen, mapBounds } from '../office/engine/iso.js'
import { KO } from '../i18n/ko.js'

interface RoomLabelsProps {
  layout: OfficeLayout
  zoom: number
  panRef: React.RefObject<{ x: number; y: number }>
}

export function RoomLabels({ layout, zoom, panRef }: RoomLabelsProps) {
  const [, setTick] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // containerRef는 부모가 주는 게 없으므로 window.innerWidth/Height 기반으로 계산
    let rafId = 0
    const tick = () => { setTick((n) => n + 1); rafId = requestAnimationFrame(tick) }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const zones = layout.zones
  if (!zones || zones.length === 0) return null

  const dpr = window.devicePixelRatio || 1
  const canvasW = Math.round(window.innerWidth * dpr)
  const canvasH = Math.round(window.innerHeight * dpr)

  const bounds = mapBounds(layout.cols, layout.rows)
  const mapPxW = bounds.width * zoom
  const mapPxH = bounds.height * zoom
  const deviceOffsetX = Math.floor((canvasW - mapPxW) / 2) - bounds.minX * zoom + Math.round(panRef.current.x)
  const deviceOffsetY = Math.floor((canvasH - mapPxH) / 3) - bounds.minY * zoom + Math.round(panRef.current.y)

  return (
    <div ref={containerRef}>
      {zones.map((zone) => {
        const labelCol = zone.labelCol ?? (zone.rects[0]?.col ?? 0) + Math.floor((zone.rects[0]?.w ?? 2) / 2)
        const labelRow = zone.labelRow ?? (zone.rects[0]?.row ?? 0)

        const { sx, sy } = tileToScreen(labelCol, labelRow)
        const screenX = (deviceOffsetX + sx * zoom) / dpr
        const screenY = (deviceOffsetY + sy * zoom) / dpr

        const label = KO.zones[zone.teamId] ?? zone.teamId
        const color = zone.color ?? '#5a8cff'

        return (
          <div
            key={zone.teamId}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 45,
            }}
          >
            <span
              style={{
                fontSize: `${Math.max(9, Math.round(9 * zoom))}px`,
                fontWeight: 'bold',
                color,
                fontFamily: 'inherit',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                display: 'block',
                textShadow: '0 0 6px rgba(0,0,0,1), 1px 1px 0 rgba(0,0,0,1)',
                opacity: 0.9,
              }}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
