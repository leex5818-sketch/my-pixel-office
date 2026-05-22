# my-pixel-office

Claude Code 세션을 **2.5D 아이소메트릭 픽셀 사무실**로 실시간 시각화하는 앱.

![Screenshot](webview-ui/public/Screenshot.jpg)

## 특징

- **활동 구역 자동 분류** — 에이전트가 사용하는 도구에 따라 6개 구역 사이를 자동으로 이동
  | 구역 | 이동 조건 |
  |------|-----------|
  | 🟢 탐색 구역 | Read / Grep / WebSearch / WebFetch |
  | 🟡 설계 구역 | Plan mode |
  | ⚙️ 개발 구역 | Edit / Write / Bash |
  | 🟠 소통 구역 | AskUser / 사용자 응답 대기 중 |
  | 🟣 서브에이전트 구역 | Task / Agent 도구 |
  | 🔵 휴식 공간 | 유휴 상태 |
- **마인크래프트 스타일** 아이소메트릭 3면 큐브 블록 렌더링
- **마우스 호버** → 에이전트 이름·현재 도구·파일 경로 표시
- `~/.claude/projects/*.jsonl` 실시간 감시 (Claude Code 세션 자동 감지)
- 전체 UI **한국어**

---

## 사전 준비

| 항목 | 버전 |
|------|------|
| [Node.js](https://nodejs.org) | v18 이상 |
| [Claude Code](https://docs.anthropic.com/ko/docs/claude-code) | 최신 버전 |

> Claude Code가 없으면 감시할 세션 파일이 없어 빈 사무실만 표시됩니다.

---

## 설치 & 실행

```bash
# 1. 클론
git clone https://github.com/leex5818-sketch/my-pixel-office.git
cd my-pixel-office

# 2. 의존성 설치
npm install

# 3. 개발 서버 시작
npm run dev
```

브라우저에서 **http://localhost:5173** 열기

---

## 프로덕션 모드 (단일 포트)

```bash
npm run build
npm start
# → http://localhost:3457
```

포트 변경이 필요하면:
```bash
PORT=8080 npm start
```

---

## 사용법

| 동작 | 결과 |
|------|------|
| 캐릭터 **클릭** | 선택 + 카메라 팔로우 |
| 캐릭터 **호버** | 도구 정보 툴팁 표시 |
| 빈 공간 **클릭** | 선택 해제 |
| **Ctrl + 스크롤** | 줌 인/아웃 (0.5x 단위, 0.5x ~ 10x) |
| **스크롤** | 화면 패닝 |
| **가운데 버튼 드래그** | 자유 패닝 |
| 선택 후 **우클릭** | 해당 위치로 캐릭터 이동 |

---

## 구조

```
server/          WebSocket 서버 (포트 3457) — JSONL 감시 + 파싱
webview-ui/src/
  office/engine/ 아이소메트릭 렌더러 · 게임 루프 · 캐릭터 FSM
  office/layout/ 6구역 레이아웃 생성
  office/sprites/ 마인크래프트 스타일 픽셀 스프라이트
  i18n/ko.ts     한국어 문자열
```
