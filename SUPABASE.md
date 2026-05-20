# Supabase 마이그레이션 가이드

localStorage → Supabase 전환을 위한 프로젝트 구성 절차와 테이블 설계.

---

## 1. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속 → **Start your project** → GitHub 계정으로 가입
2. 대시보드에서 **New project** 클릭
3. 설정 입력:
   - **Name**: `todo-app` (자유)
   - **Database Password**: 안전한 비밀번호 생성 후 별도 저장
   - **Region**: `Northeast Asia (Seoul)` — ap-northeast-2
4. 프로젝트 초기화 완료까지 약 1~2분 대기

---

## 2. 테이블 구조

### 설계 고려사항

현재 앱의 데이터:
```js
{ id: number, text: string, done: boolean, priority: 'high'|'medium'|'low' }
```

추가로 필요한 것:
- **`sort_order`**: 배열 인덱스로 관리하던 드래그앤드롭 순서를 DB에서 보존
- **`created_at`**: 생성 시각 (Supabase 기본 제공)

### DDL

Supabase 대시보드 → **SQL Editor** → **New query**에 아래를 붙여넣고 실행:

```sql
-- 우선순위 enum 타입
create type priority_level as enum ('high', 'medium', 'low');

-- todos 테이블
create table todos (
  id          bigint        primary key,        -- Date.now() 그대로 사용
  text        text          not null,
  done        boolean       not null default false,
  priority    priority_level not null default 'medium',
  sort_order  integer       not null default 0, -- 드래그앤드롭 순서
  created_at  timestamptz   not null default now()
);

-- sort_order 조회 성능용 인덱스
create index todos_sort_order_idx on todos (priority, sort_order);
```

### 컬럼 설명

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigint PK | `Date.now()` 값 그대로 사용 (기존 코드와 호환) |
| `text` | text | 할 일 내용 |
| `done` | boolean | 완료 여부 |
| `priority` | enum | `high` / `medium` / `low` |
| `sort_order` | integer | 우선순위 그룹 내 표시 순서 (0-based) |
| `created_at` | timestamptz | 생성 시각 (자동) |

---

## 3. Row Level Security (RLS)

Supabase는 기본적으로 RLS가 활성화되어 있어 정책을 추가해야 데이터에 접근할 수 있습니다.

### Phase 1 — 인증 없이 공개 접근 (빠른 전환)

로그인 없이 누구나 읽기/쓰기 가능한 설정. 빠르게 동작을 확인할 때 사용합니다.

```sql
-- RLS 활성화
alter table todos enable row level security;

-- 공개 읽기/쓰기 허용
create policy "allow all" on todos
  for all
  using (true)
  with check (true);
```

> **주의**: 이 설정은 API 키를 아는 누구나 데이터를 조작할 수 있습니다. 개인 사용 또는 실습 용도에 적합합니다.

### Phase 2 — 사용자 인증 추가 (선택)

사용자별 데이터를 분리하려면 `user_id` 컬럼을 추가합니다.

```sql
-- 컬럼 추가
alter table todos add column user_id uuid references auth.users(id);

-- 인증된 사용자의 본인 데이터만 접근 허용
drop policy "allow all" on todos;

create policy "users own their todos" on todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 4. API 키 확인

대시보드 → **Project Settings** → **API**:

| 항목 | 사용 위치 |
|---|---|
| **Project URL** | `supabaseUrl` |
| **anon public** 키 | `supabaseKey` (클라이언트에서 사용) |

`service_role` 키는 서버 전용 — 클라이언트 코드에 절대 노출하지 않습니다.

---

## 5. 코드 변경 포인트 (script.js)

### 5-1. Supabase 클라이언트 추가 (index.html)

```html
<!-- Materialize script 위에 추가 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const supabaseUrl  = 'https://xxxxxxxxxxxx.supabase.co'; // Project URL
  const supabaseKey  = 'eyJ...';                            // anon public key
  const db = supabase.createClient(supabaseUrl, supabaseKey);
</script>
```

### 5-2. loadTodos / saveTodos 교체

현재 코드는 동기 방식이지만, Supabase는 비동기(async/await)입니다. 주요 함수를 async로 변환해야 합니다.

```js
// 기존
function loadTodos() {
  return JSON.parse(localStorage.getItem('todos') || '[]');
}

// 변경 후
async function loadTodos() {
  const { data, error } = await db
    .from('todos')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}
```

```js
// 기존
function saveTodos(todos) {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// 변경 후 (전체 배열 upsert — 드래그앤드롭 순서 재정렬 시)
async function saveTodos(todos) {
  const rows = todos.map((t, i) => ({ ...t, sort_order: i }));
  const { error } = await db.from('todos').upsert(rows);
  if (error) console.error(error);
}
```

### 5-3. 개별 CRUD 최적화 (선택)

전체 재저장 대신 변경된 항목만 업데이트하면 네트워크 요청을 줄일 수 있습니다.

```js
// 추가
async function addTodo(text, priority) {
  const { error } = await db.from('todos').insert({
    id: Date.now(), text, done: false, priority,
    sort_order: (await loadTodos()).length
  });
  if (error) console.error(error);
}

// 완료 토글
async function toggleTodo(id, currentDone) {
  await db.from('todos').update({ done: !currentDone }).eq('id', id);
}

// 삭제
async function deleteTodo(id) {
  await db.from('todos').delete().eq('id', id);
}

// 우선순위 변경
async function changePriority(id, priority) {
  await db.from('todos').update({ priority }).eq('id', id);
}
```

---

## 6. 실시간 동기화 (선택)

Supabase Realtime을 활성화하면 여러 브라우저 탭이나 기기 간에 자동으로 동기화됩니다.

```js
db.channel('todos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => {
    renderTodos(); // 변경 감지 시 자동 리렌더
  })
  .subscribe();
```

대시보드 → **Database** → **Replication**에서 `todos` 테이블의 `INSERT`, `UPDATE`, `DELETE`를 활성화해야 합니다.

---

## 7. 마이그레이션 순서 요약

```
1. Supabase 프로젝트 생성
2. SQL Editor에서 DDL 실행 (테이블 + RLS 정책)
3. Project URL / anon key 복사
4. index.html에 supabase-js CDN + 클라이언트 초기화 추가
5. script.js의 loadTodos / saveTodos를 async 버전으로 교체
6. 모든 호출부(addTodo, toggleTodo 등)를 await 형태로 변환
7. renderTodos()를 async function으로 변경 후 await loadTodos() 사용
```
