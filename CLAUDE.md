# Todo List App

바이브 코딩 day03 실습 — HTML/CSS/JavaScript로 만든 Todo List 앱.

## 파일 구조

```
todo/
├── index.html   # 마크업 (Materialize 컴포넌트 구조)
├── style.css    # Materialize 오버라이드 + 커스텀 스타일
└── script.js    # 전체 앱 로직 (렌더링, CRUD, 드래그앤드롭)
```

## 실행 방법

외부 CSS/JS 파일을 상대경로로 참조하므로 반드시 로컬 서버로 실행합니다.

```bash
python3 -m http.server 8765
```

브라우저에서 `http://localhost:8765/index.html` 접속.

## 주요 기능

- **할 일 추가** — 텍스트 입력 후 추가 버튼 또는 Enter
- **완료 체크** — 체크박스 클릭 시 취소선 처리
- **삭제** — 휴지통 아이콘 클릭
- **우선순위 설정** — 추가 시 높음/중간/낮음 선택
- **우선순위 변경** — 항목의 색상 칩 클릭 시 높음→중간→낮음→높음 순환
- **드래그앤드롭** — `drag_indicator` 핸들로 순서 변경; 다른 그룹으로 이동 시 우선순위 자동 변경
- **localStorage 저장** — 새로고침 후에도 데이터 유지 (`key: "todos"`)

## 데이터 구조

```js
// localStorage "todos" 키에 JSON 배열로 저장
[{ id: number, text: string, done: boolean, priority: 'high' | 'medium' | 'low' }]
```

## 의존성 (CDN)

| 라이브러리 | 용도 |
|---|---|
| Materialize CSS 1.0.0 | Material Design 컴포넌트 |
| Material Icons | 아이콘 |
| Roboto (Google Fonts) | 폰트 |

빌드 도구, 패키지 매니저 없음 — 모든 의존성은 CDN으로 로드됩니다.

## 핵심 함수 (script.js)

| 함수 | 역할 |
|---|---|
| `renderTodos()` | 우선순위 그룹별로 전체 목록 다시 그림 |
| `createTodoItem(todo)` | 단일 `<li>` 요소 생성 + 이벤트 바인딩 |
| `dropOnItem(targetId, priority, before)` | 항목 위에 드롭 시 순서 재배치 |
| `dropOnGroup(priority)` | 빈 그룹 영역에 드롭 시 처리 |
| `changePriority(id, priority)` | 우선순위 변경 후 저장 및 리렌더 |
