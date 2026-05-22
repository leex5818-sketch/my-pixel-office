// 한국어 UI 문자열 집중 관리

export const KO = {
  loading: '불러오는 중...',
  connecting: '서버에 연결 중...',
  agentDefault: (id: number) => `에이전트 #${id}`,
  subtask: '서브태스크',
  idle: '대기 중',
  waiting: '응답 대기 중',
  needsApproval: '승인 대기',
  closeAgent: '에이전트 닫기',
  noAgents: '실행 중인 세션이 없습니다',
  subagentOf: (name: string) => `${name}의 서브에이전트`,
  team: {
    default: '공용 데스크',
  },

  tools: {
    Read:             '읽기',
    Write:            '쓰기',
    Edit:             '편집',
    Bash:             '명령 실행',
    Grep:             '코드 검색',
    Glob:             '파일 검색',
    WebFetch:         '웹 가져오기',
    WebSearch:        '웹 검색',
    Task:             '서브태스크',
    Agent:            '서브에이전트',
    AskUserQuestion:  '질문',
    EnterPlanMode:    '계획 수립',
    NotebookEdit:     '노트북 편집',
  } as Record<string, string>,

  toolIcons: {
    Read:             '📄',
    Write:            '✏️',
    Edit:             '🔧',
    Bash:             '💻',
    Grep:             '🔍',
    Glob:             '🗂️',
    WebFetch:         '🌐',
    WebSearch:        '🔎',
    Task:             '🤖',
    Agent:            '🤖',
    AskUserQuestion:  '💬',
    EnterPlanMode:    '📋',
    NotebookEdit:     '📓',
  } as Record<string, string>,

  zones: {
    'explore': '탐색 구역',
    'plan':    '설계 구역',
    'dev':     '개발 구역',
    'comms':   '소통 구역',
    'sub':     '서브에이전트 구역',
    'idle':    '휴식 공간',
  } as Record<string, string>,

  ui: {
    openClaude:   'Claude 열기',
    settings:     '설정',
    debug:        '디버그',
    zoomIn:       '확대',
    zoomOut:      '축소',
    resetZoom:    '줌 초기화',
    serverError:  '서버 연결 실패',
    serverRetry:  '재연결 중...',
  },
} as const
