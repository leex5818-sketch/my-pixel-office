interface BottomToolbarProps {
  agents: number[]
}

export function BottomToolbar({ agents }: BottomToolbarProps) {
  const count = agents.length

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        zIndex: 'var(--pixel-controls-z)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        padding: '5px 12px',
        boxShadow: 'var(--pixel-shadow)',
        fontFamily: 'inherit',
        fontSize: '20px',
        color: 'var(--pixel-text-dim)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ color: count > 0 ? 'var(--pixel-status-active)' : 'var(--pixel-text-dim)' }}>
        ●
      </span>
      <span>
        {count > 0 ? `에이전트 ${count}명 활동 중` : '에이전트 없음'}
      </span>
    </div>
  )
}
