# StoryMind MVP v0.4 by Fedma

AI 기반 웹소설 창작 지원 플랫폼 — Production Ready

## v0.4 구조적 안정성 + 기획서 반영 업데이트

### 안정성 강화
- ✅ **자동 저장 안전장치** — beforeunload 탭 닫기 전 로컬 백업, 재접속 시 복구 확인
- ✅ **Chapter 소유권 검증** — 모든 화 API에서 사용자 소유 확인 (보안 구멍 차단)
- ✅ **Vault 라우트 URL 정리** — 이중 경로 제거
- ✅ **세션 자동 정리** — 만료된 세션 매시간 자동 삭제

### 기획서 기반 기능 추가
1. ✅ **인라인 이슈 하이라이트** (#4) — 검수 결과가 에디터 본문에 색상 밑줄로 표시
2. ✅ **텐션 커브 차트** (#5) — 화별 텐션 점수 추이 Recharts 시각화
3. ✅ **화 제목 인라인 편집** (#6) — 사이드바에서 더블클릭 수정
4. ✅ **검수 피드백 루프** (#7) — "무시" 버튼 → 해당 패턴 다음 검수에서 제외
5. ✅ **캐릭터 관계도** (#8) — SVG 그래프 시각화
6. ✅ **StoryVault 모드 선택** (#8) — 수동/스마트/자동 3단계
7. ✅ **비밀번호 변경** (#9) — 설정 패널에서 변경, 다른 세션 자동 만료
8. ✅ **계정 삭제** (#10) — 비밀번호 확인 후 전체 데이터 삭제
9. ✅ **닉네임 변경** — 프로필 수정
10. ✅ **설정 패널** — 우측 패널에 Settings 탭 추가

### 기존 기능
- 회원가입/로그인, 다크 모드, 일일 목표, 집필 통계
- TipTap 리치 텍스트 에디터, StoryVault, AI 검수/전개/대필
- 필체 학습, 버전 이력, TXT/HTML 내보내기

## 프로젝트 구조 (57 files)
```
storymind-mvp/
├── server/
│   ├── index.js              # Express 앱 (라우터 연결)
│   ├── lib/
│   │   ├── db.js             # SQLite + 세션 정리
│   │   ├── claude.js         # Claude API 래퍼
│   │   ├── logger.js         # 구조화 로깅
│   │   └── validate.js       # 입력 검증 + XSS
│   ├── middleware/
│   │   └── index.js          # 인증, Rate Limit, 소유권 검증
│   └── routes/
│       ├── auth.js           # 로그인, 회원가입, 비밀번호, 계정 삭제
│       ├── works.js          # 작품 CRUD + 내보내기
│       ├── chapters.js       # 화 CRUD + 소유권 + 버전
│       ├── vault.js          # StoryVault + 모드
│       └── ai.js             # 검수, 전개, 대필, 필체, 피드백, 텐션
├── src/
│   ├── lib/
│   │   ├── api.js            # API 래퍼 (오프라인 큐, 인증 만료)
│   │   ├── ErrorBoundary.jsx # 크래시 방어
│   │   └── Toast.jsx         # 알림 시스템
│   ├── stores/store.js       # Zustand 상태 관리
│   ├── pages/
│   │   ├── AuthPage.jsx      # 로그인/회원가입
│   │   ├── Dashboard.jsx     # 작품 목록 + 통계
│   │   └── EditorPage.jsx    # 3-panel 에디터
│   └── components/editor/
│       ├── TipTapEditor.jsx  # 리치 텍스트 + 백업 복구 + 하이라이트
│       ├── EditorToolbar.jsx # 서식 + AI 버튼 + 진행률
│       ├── ChapterSidebar.jsx# 화 목록 + 인라인 제목 편집
│       └── RightPanel.jsx    # 6탭 (Vault,검수,전개,대필,필체,설정)
├── docs/                     # 기획서 12개 (docx)
├── Dockerfile + docker-compose.yml
└── README.md
```

## 설치 및 실행
```bash
npm install
cp .env.example .env  # CLAUDE_API_KEY 입력
npm run dev            # localhost:3000 + :4000
```

## Docker
```bash
docker compose up --build
```

---
Made with ❤️ by Fedma Inc.
