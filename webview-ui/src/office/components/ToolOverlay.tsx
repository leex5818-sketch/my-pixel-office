import { useState, useEffect } from 'react'
import type { ToolActivity } from '../types.js'
import type { OfficeState } from '../engine/officeState.js'
import type { SubagentCharacter } from '../../hooks/useExtensionMessages.js'
import { CharacterState } from '../types.js'
import { TOOL_OVERLAY_VERTICAL_OFFSET, CHARACTER_SITTING_OFFSET_PX } from '../../constants.js'
import { worldToScreen, mapBounds } from '../engine/iso.js'
import { KO } from '../../i18n/ko.js'

interface ToolOverlayProps {
  officeState: OfficeState
  agents: number[]
  agentTools: Record<number, ToolActivity[]>
  agentSessionTopics: Record<number, string>
  subagentCharacters: SubagentCharacter[]
  containerRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  panRef: React.RefObject<{ x: number; y: number }>
  onCloseAgent: (id: number) => void
}

function getActiveTool(
  agentId: number,
  agentTools: Record<number, ToolActivity[]>,
  isActive: boolean,
): ToolActivity | null {
  const tools = agentTools[agentId]
  if (tools && tools.length > 0) {
    const activeTool = [...tools].reverse().find((t) => !t.done)
    if (activeTool) return activeTool
    if (isActive) return tools[tools.length - 1] || null
  }
  return null
}

function getToolDetail(tool: ToolActivity): string {
  const input = tool.toolInput || {}
  if (typeof input.file_path === 'string' && input.file_path) return input.file_path
  if (typeof input.command === 'string' && input.command) return input.command
  if (typeof input.description === 'string' && input.description) return input.description
  if (typeof input.query === 'string' && input.query) return input.query
  if (typeof input.url === 'string' && input.url) return input.url
  return ''
}

export function ToolOverlay({
  officeState,
  agents,
  agentTools,
  agentSessionTopics,
  subagentCharacters,
  containerRef,
  zoom,
  panRef,
  onCloseAgent,
}: ToolOverlayProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    let rafId = 0
    const tick = () => {
      setTick((n) => n + 1)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const el = containerRef.current
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const canvasW = Math.round(rect.width * dpr)
  const canvasH = Math.round(rect.height * dpr)

  const layout = officeState.getLayout()
  const bounds = mapBounds(layout.cols, layout.rows)
  const mapPxW = bounds.width * zoom
  const mapPxH = bounds.height * zoom
  const deviceOffsetX = Math.floor((canvasW - mapPxW) / 2) - bounds.minX * zoom + Math.round(panRef.current.x)
  const deviceOffsetY = Math.floor((canvasH - mapPxH) / 3) - bounds.minY * zoom + Math.round(panRef.current.y)

  const selectedId = officeState.selectedAgentId
  const hoveredId = officeState.hoveredAgentId
  const allIds = [...agents, ...subagentCharacters.map((s) => s.id)]

  return (
    <>
      {allIds.map((id) => {
        const ch = officeState.characters.get(id)
        if (!ch) return null

        const isSelected = selectedId === id
        const isHovered = hoveredId === id
        const isSub = ch.isSubagent
        const showDetails = isSelected || isHovered

        // 아이소메트릭 좌표로 화면 위치 계산
        const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0
        const { sx, sy } = worldToScreen(ch.x, ch.y, 0)
        const screenX = (deviceOffsetX + sx * zoom) / dpr
        const screenY = (deviceOffsetY + (sy + sittingOffset - TOOL_OVERLAY_VERTICAL_OFFSET) * zoom) / dpr

        const displayName = ch.folderName || (isSub ? KO.subtask : KO.agentDefault(id))
        const team = (ch as { team?: { id: string; name: string; color: string; zone: string } }).team
        const teamColor = team?.color ?? '#5a8cff'
        const teamName = team ? (KO.zones[team.id] ?? team.name) : null

        // 부모 에이전트
        const parentCh = isSub && ch.parentAgentId != null
          ? officeState.characters.get(ch.parentAgentId)
          : null
        const parentName = parentCh?.folderName
          || (ch.parentAgentId != null ? KO.agentDefault(ch.parentAgentId) : null)

        // 툴 활동
        let activeTool: ToolActivity | null = null
        let activityText = ''
        let dotColor: string | null = null

        if (showDetails) {
          const subHasPermission = isSub && ch.bubbleType === 'permission'
          if (isSub) {
            if (subHasPermission) {
              activityText = KO.needsApproval
            } else {
              const sub = subagentCharacters.find((s) => s.id === id)
              activityText = sub ? sub.label : KO.subtask
            }
          } else {
            activeTool = getActiveTool(id, agentTools, ch.isActive)
            if (activeTool) {
              activityText = activeTool.permissionWait ? KO.needsApproval : activeTool.status
            } else {
              activityText = KO.idle
            }
          }

          const tools = agentTools[id]
          const hasPermission = subHasPermission || tools?.some((t) => t.permissionWait && !t.done)
          const hasActiveTools = tools?.some((t) => !t.done)
          if (hasPermission) {
            dotColor = 'var(--pixel-status-permission)'
          } else if (ch.isActive && hasActiveTools) {
            dotColor = 'var(--pixel-status-active)'
          }
        }

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY - 24,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: isSelected ? 'auto' : 'none',
              zIndex: isSelected ? 'var(--pixel-overlay-selected-z)' : 'var(--pixel-overlay-z)',
            }}
          >
            {showDetails ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--pixel-bg)',
                  border: isSelected ? '2px solid var(--pixel-border-light)' : '2px solid var(--pixel-border)',
                  boxShadow: 'var(--pixel-shadow)',
                  maxWidth: 300,
                  overflow: 'hidden',
                }}
              >
                {/* 팀 컬러바 */}
                <div style={{ height: 3, background: teamColor, flexShrink: 0 }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, padding: '5px 8px' }}>
                  {/* 상태 닷 */}
                  {dotColor && (
                    <span
                      className={ch.isActive && dotColor !== 'var(--pixel-status-permission)' ? 'pixel-agents-pulse' : undefined}
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: dotColor, flexShrink: 0, marginTop: 5,
                      }}
                    />
                  )}

                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    {/* 팀명 + 에이전트명 */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
                      {teamName && (
                        <span style={{ fontSize: '13px', color: teamColor, fontWeight: 700, flexShrink: 0 }}>
                          {teamName}
                        </span>
                      )}
                      <span style={{ fontSize: '14px', color: 'var(--pixel-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                        {isSub && parentName && (
                          <span style={{ opacity: 0.7 }}> ↳ {parentName}</span>
                        )}
                      </span>
                    </div>

                    {/* 툴 아이콘 + 한국어 툴명 */}
                    {activeTool?.toolName ? (
                      <>
                        <div style={{ fontSize: '18px', color: 'var(--vscode-foreground)', marginTop: 3, whiteSpace: 'nowrap' }}>
                          {KO.toolIcons[activeTool.toolName] || '⚡'}{' '}
                          {KO.tools[activeTool.toolName] || activeTool.toolName}
                          {activeTool.permissionWait && (
                            <span style={{ color: 'var(--pixel-status-permission)', marginLeft: 4 }}>— {KO.needsApproval}</span>
                          )}
                        </div>
                        {(() => {
                          const detail = getToolDetail(activeTool)
                          return detail ? (
                            <div style={{ fontSize: '13px', color: 'var(--pixel-text-dim)', marginTop: 2, wordBreak: 'break-all', opacity: 0.85 }}>
                              {detail}
                            </div>
                          ) : null
                        })()}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: isSub ? '16px' : '18px', fontStyle: isSub ? 'italic' : undefined, color: 'var(--vscode-foreground)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {activityText}
                        </div>
                        {/* 세션 요약 (유휴 상태) */}
                        {!isSub && activityText === KO.idle && agentSessionTopics[id] && (
                          <div style={{ fontSize: '13px', color: 'var(--pixel-text-dim)', marginTop: 3, maxWidth: 260, wordBreak: 'break-word', opacity: 0.75, fontStyle: 'italic', borderTop: '1px solid var(--pixel-border)', paddingTop: 3 }}>
                            💬 {agentSessionTopics[id]}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* 닫기 버튼 */}
                  {isSelected && !isSub && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCloseAgent(id) }}
                      title={KO.closeAgent}
                      style={{ background: 'none', border: 'none', color: 'var(--pixel-close-text)', cursor: 'pointer', padding: '0 2px', fontSize: '24px', lineHeight: 1, marginLeft: 2, flexShrink: 0 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--pixel-close-hover)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--pixel-close-text)' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* 축소 이름 라벨 */
              <div style={{ background: 'var(--pixel-bg)', border: '1px solid var(--pixel-border)', padding: '1px 6px', boxShadow: 'var(--pixel-shadow)', whiteSpace: 'nowrap', borderLeft: `2px solid ${teamColor}` }}>
                <span style={{ fontSize: '14px', color: 'var(--pixel-text-dim)' }}>
                  {displayName}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
