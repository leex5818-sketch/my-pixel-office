# my-pixel-office

Claude Code 세션을 **2.5D 아이소메트릭 픽셀 사무실**로 시각화하는 앱.

- 팀별 구획 (뉴스레터팀·리서치팀·데이터팀·디자인팀·운영팀)
- 에이전트가 지금 뭐 하는지 마우스 호버로 확인
- `~/.claude/projects/*.jsonl` 실시간 감시
- 전체 UI 한국어

## 빠른 시작

```bash
mkdir -p ~/.my-pixel-office
cp config/teams.example.json ~/.my-pixel-office/teams.json
# teams.json 편집 — projectToTeam에 본인 프로젝트 폴더명 매핑

npm install
npm run dev
# http://localhost:3457
```

## 팀 설정

`~/.my-pixel-office/teams.json` — 프로젝트 폴더명 → 팀 매핑.
