import { useState, useCallback, useRef } from 'react'
import { OfficeState } from './office/engine/officeState.js'
import { OfficeCanvas } from './office/components/OfficeCanvas.js'
import { ToolOverlay } from './office/components/ToolOverlay.js'
import { vscode } from './vscodeApi.js'
import { useExtensionMessages } from './hooks/useExtensionMessages.js'
import { ZoomControls } from './components/ZoomControls.js'
import { BottomToolbar } from './components/BottomToolbar.js'
import { RoomLabels } from './components/RoomLabels.js'
import {
  createDefaultIsoLayout,
  createTileTeamMap,
  buildZoneDefsFromLayout,
} from './office/layout/isoLayout.js'
import { registerTeamBlockColor } from './office/engine/isoRenderer.js'
import { KO } from './i18n/ko.js'

// Register activity zone block colors once at startup
const ZONE_COLORS: Record<string, string> = {
  explore: '#7CBD6B',
  plan:    '#C8A45E',
  dev:     '#9B9B9B',
  comms:   '#D9A85C',
  sub:     '#8C7BB5',
  idle:    '#5C7A9A',
}
for (const [id, color] of Object.entries(ZONE_COLORS)) {
  registerTeamBlockColor(id, color)
}

// 게임 상태 (React 외부 — 인스턴스 단 하나)
const officeStateRef = { current: null as OfficeState | null }
function getOfficeState(): OfficeState {
  if (!officeStateRef.current) {
    officeStateRef.current = new OfficeState()
  }
  return officeStateRef.current
}

// 초기 iso 레이아웃 적용 (고정 6구역)
const initialLayout = createDefaultIsoLayout()
getOfficeState().rebuildFromLayout(initialLayout)

// Fixed tile→team map (never changes)
const initialZoneDefs = buildZoneDefsFromLayout(initialLayout)
const initialTileTeamMap = createTileTeamMap(initialLayout.tiles, initialLayout.cols, initialLayout.rows, initialZoneDefs)

export default function App() {
  const [zoom, setZoom] = useState(2)
  const panRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const officeState = getOfficeState()

  // Layout and tile→team map are fixed — initialized once
  const tileTeamMap = initialTileTeamMap

  const { agents, agentTools, agentSessionTopics, subagentCharacters, layoutReady } =
    useExtensionMessages(
      getOfficeState,
      (_layout) => {
        // 서버에서 레이아웃이 오면 고정 iso 레이아웃 유지
        officeState.rebuildFromLayout(initialLayout)
      },
      (teams) => {
        // teams 업데이트는 이제 단순 정보용 (블록 색상은 이미 등록됨)
        console.log('[Teams] 활동 구역:', teams.map(t => t.name).join(', '))
      },
    )

  const handleAgentClick = useCallback((agentId: number) => {
    void agentId
  }, [])

  const handleCloseAgent = useCallback((id: number) => {
    vscode.postMessage({ type: 'closeAgent', id })
  }, [])

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  if (!layoutReady) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a2e',
          color: '#5a8cff',
          fontSize: '14px',
          fontFamily: '"FS Pixel Sans", monospace',
        }}
      >
        {KO.loading}
      </div>
    )
  }

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#1a1a2e' }}
    >
      {/* 캔버스 */}
      <OfficeCanvas
        officeState={officeState}
        onClick={handleAgentClick}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        panRef={panRef}
        tileTeamMap={tileTeamMap}
      />

      {/* 툴팁 오버레이 */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <ToolOverlay
          officeState={officeState}
          agents={agents}
          agentTools={agentTools}
          agentSessionTopics={agentSessionTopics}
          subagentCharacters={subagentCharacters}
          containerRef={containerRef}
          zoom={zoom}
          panRef={panRef}
          onCloseAgent={handleCloseAgent}
        />
        <RoomLabels
          layout={officeState.getLayout()}
          zoom={zoom}
          panRef={panRef}
        />
      </div>

      {/* 줌 컨트롤 */}
      <ZoomControls zoom={zoom} onZoomChange={handleZoomChange} />

      {/* 하단 툴바 */}
      <BottomToolbar agents={agents} />
    </div>
  )
}
