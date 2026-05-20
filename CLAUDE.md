# Todo List App

바이브 코딩 day03 실습 — HTML/CSS/JavaScript로 만든 Todo List 앱.

## 파일 구조

```
todo/
├── index.html   # 마크업 (Materialize 컴포넌트 구조)
├── style.css    # Materialize 오버라이드 + 커스텀 스타일
└── script.js    # 전체 앱 로직 (렌더링, CRUD, 드래그앤드롭, 인증)
```

## 실행 방법

반드시 `/home/yjh/work/todo` 디렉토리에서 로컬 서버를 실행합니다.

```bash
python3 -m http.server 8765 --directory /home/yjh/work/todo
```

브라우저에서 `http://localhost:8765/index.html` 접속.

> **주의**: 다른 폴더에서 실행하면 그 폴더의 파일이 서빙됩니다.

## 주요 기능

- **할 일 추가** — 텍스트 입력 후 추가 버튼 또는 Enter
- **완료 체크** — 체크박스 클릭 시 취소선 처리
- **삭제** — 휴지통 아이콘 클릭
- **우선순위 설정** — 추가 시 높음/중간/낮음 선택
- **우선순위 변경** — 항목의 색상 칩 클릭 시 드롭다운으로 선택
- **드래그앤드롭** — `drag_indicator` 핸들로 순서 변경; 다른 그룹으로 이동 시 우선순위 자동 변경
- **Supabase 저장** — 로그인한 사용자별 데이터 클라우드 저장
- **이메일/비밀번호 로그인** — 회원가입 + 로그인
- **소셜 로그인** — Google, GitHub OAuth (Supabase Auth 연동)

## 인증 흐름

```
로그인 화면 → 이메일/비밀번호 또는 소셜 버튼 클릭
  → (소셜) OAuth 제공자 페이지 → 인증 완료 → 앱으로 복귀
  → onAuthStateChange 감지 → onSignedIn() → 앱 진입
```

## 데이터 구조

```js
// Supabase "todos" 테이블
{ id: number, text: string, done: boolean, priority: 'high' | 'medium' | 'low', sort_order: number, user_id: uuid }
```

## 의존성 (CDN)

| 라이브러리 | 용도 |
|---|---|
| Materialize CSS 1.0.0 | Material Design 컴포넌트 |
| Material Icons | 아이콘 |
| Roboto (Google Fonts) | 폰트 |
| supabase-js v2 | DB + Auth (이메일/Google/GitHub) |

빌드 도구, 패키지 매니저 없음 — 모든 의존성은 CDN으로 로드됩니다.

## 핵심 함수 (script.js)

| 함수 | 역할 |
|---|---|
| `onSignedIn(session)` | 로그인 후 UI 전환 + 투두 로드 |
| `onSignedOut()` | 로그아웃 후 auth 오버레이 표시 |
| `handleAuthSubmit()` | 이메일/비밀번호 로그인·회원가입 처리 |
| `renderTodos()` | 우선순위 그룹별로 전체 목록 다시 그림 |
| `createTodoItem(todo)` | 단일 `<li>` 요소 생성 + 이벤트 바인딩 |
| `dropOnItem(targetId, priority, before)` | 항목 위에 드롭 시 순서 재배치 |
| `dropOnGroup(priority)` | 빈 그룹 영역에 드롭 시 처리 |
| `changePriority(id, priority)` | 우선순위 변경 후 저장 및 리렌더 |
