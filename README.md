# 2026-1-CECD1-3-CHEDODAE-09

2026-1 종합설계1 3분반 체도대 팀 레포지토리입니다.

## 프로젝트 구조

```text
.
├── frontend/   # Next.js 프론트엔드 앱
└── README.md
```

## 프론트엔드 실행 방법

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

프로덕션 빌드 확인:

```bash
cd frontend
npm run build
npm run start
```

린트 확인:

```bash
cd frontend
npm run lint
```

## 주요 스크립트

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run start`: 빌드 결과 실행
- `npm run lint`: ESLint 검사

## 주요 라이브러리

- `next`: Next.js App Router
- `react`, `react-dom`: UI 렌더링
- `tailwindcss`, `@tailwindcss/postcss`: 스타일링
- `lucide-react`: 아이콘
- `recharts`: 리포트/건강 추이 차트

## 프론트엔드 폴더 구조

- `frontend/app/page.tsx`: 앱 진입 페이지
- `frontend/app/App.tsx`: 앱 상태, 채팅 기록, 최근 리포트 관리
- `frontend/app/components/screens`: AI 채팅, 리포트, 데이터 허브, 건강 추이 화면
- `frontend/app/globals.css`: 전역 스타일
- `frontend/styles`: Tailwind 및 테마 CSS
