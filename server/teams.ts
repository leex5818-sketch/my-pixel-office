// Activity-based zones — fixed 6 zones representing what agents are doing

export interface Team {
  id: string
  name: string
  color: string
  zone: string
}

export const ACTIVITY_ZONES: Team[] = [
  { id: 'explore', name: '탐색 구역', color: '#7CBD6B', zone: 'explore' },
  { id: 'plan',    name: '설계 구역', color: '#C8A45E', zone: 'plan'    },
  { id: 'dev',     name: '개발 구역', color: '#9B9B9B', zone: 'dev'     },
  { id: 'comms',   name: '소통 구역', color: '#D9A85C', zone: 'comms'   },
  { id: 'sub',     name: '서브에이전트 구역', color: '#8C7BB5', zone: 'sub' },
  { id: 'idle',    name: '휴식 공간', color: '#5C7A9A', zone: 'idle'    },
]

// Tool name → zone mapping
export function toolNameToZone(toolName: string | null | undefined, isSubagent = false, isWaiting = false): string {
  if (isSubagent) return 'sub'
  if (isWaiting) return 'comms'
  if (!toolName) return 'idle'

  const t = toolName.toLowerCase()
  // Explore tools
  if (['read', 'grep', 'glob', 'webfetch', 'websearch', 'ls', 'find', 'search'].some(k => t.includes(k))) return 'explore'
  // Plan tools
  if (['enterplanmode', 'exitplanmode', 'plan'].some(k => t.includes(k))) return 'plan'
  // Comms tools
  if (['askuserquestion', 'permission', 'askuser'].some(k => t.includes(k))) return 'comms'
  // Sub-agent tools
  if (['task', 'agent'].some(k => t.includes(k))) return 'sub'
  // Development tools (Edit, Write, Bash, Notebook, etc.)
  if (['edit', 'write', 'bash', 'notebook', 'multiedit', 'todowrite'].some(k => t.includes(k))) return 'dev'
  // Default: development
  return 'dev'
}

export function getAllTeams(): Team[] {
  return ACTIVITY_ZONES
}

export function resolveTeam(projectName: string, projectDir: string): Team {
  // All agents start in idle zone; zone changes happen client-side based on tool activity
  void projectName
  void projectDir
  return ACTIVITY_ZONES.find(z => z.id === 'idle')!
}

export function loadTeamsConfig(): void {}

// Legacy compat
export type { Team as TeamsConfig }
