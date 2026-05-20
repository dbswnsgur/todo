# 소셜 로그인 추가 계획

Google / GitHub OAuth 로그인을 기존 Supabase Auth에 연동합니다.

> **상태: 완료** — 모든 단계 적용 완료

---

## 현재 상황

- Supabase Auth (이메일/비밀번호) 동작 중
- `db.auth.onAuthStateChange`로 세션 감지 → 앱 진입 처리 완료
- 추가 서버 코드 없음 — Supabase가 OAuth 흐름 전담

---

## 작업 순서

### ✅ 1단계 — Google OAuth 앱 생성 (Google Cloud Console)

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 프로젝트 생성 또는 기존 프로젝트 선택
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: `Web application`
5. **Authorized JavaScript origins** 에 아래 URL 추가:
   ```
   http://localhost:8765
   https://dbswnsgur.github.io
   ```
6. **Authorized redirect URIs** 에 아래 URL 추가 (Supabase 콜백, URL별 별도 설정 불필요):
   ```
   https://lfzqsyyqxxmmmnicvxlp.supabase.co/auth/v1/callback
   ```
7. 생성 후 **Client ID**, **Client Secret** 복사

---

### ✅ 2단계 — GitHub OAuth 앱 생성 (GitHub)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. 입력값:
   - Application name: `Todo App` (자유)
   - Homepage URL: `https://dbswnsgur.github.io/todo/`
   - **Authorization callback URL** (Supabase 콜백, URL별 별도 설정 불필요):
     ```
     https://lfzqsyyqxxmmmnicvxlp.supabase.co/auth/v1/callback
     ```
3. 생성 후 **Client ID**, **Client Secret** 복사

> **참고**: Client ID / Secret은 OAuth 앱 하나에 하나입니다. 로컬·운영 환경 구분 없이 동일한 값을 사용합니다.

---

### ✅ 3단계 — Supabase 대시보드 설정

**Authentication → Providers**

| Provider | 활성화 | 입력값 |
|---|---|---|
| Google | ON | 1단계의 Client ID / Secret |
| GitHub | ON | 2단계의 Client ID / Secret |

**Authentication → URL Configuration**

- **Site URL**: `https://dbswnsgur.github.io/todo/` (운영 기준)
- **Redirect URLs** 에 두 주소 모두 추가 (Enter로 각각 등록):
  ```
  https://dbswnsgur.github.io/todo/
  http://localhost:8765/index.html
  ```

---

### ✅ 4단계 — index.html 수정

`auth-actions` 영역 아래에 소셜 로그인 버튼 추가:

```html
<div class="social-divider">또는</div>
<div class="social-actions">
  <button id="google-btn" class="btn social-btn google-btn">
    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
    Google로 로그인
  </button>
  <button id="github-btn" class="btn social-btn github-btn">
    <i class="material-icons">code</i>
    GitHub로 로그인
  </button>
</div>
```

---

### ✅ 5단계 — script.js 수정

이벤트 리스너 2개 추가 (기존 코드 변경 없음):

```js
document.getElementById('google-btn').addEventListener('click', () => {
  db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.href }
  });
});

document.getElementById('github-btn').addEventListener('click', () => {
  db.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: location.href }
  });
});
```

---

### ✅ 6단계 — style.css 수정

소셜 버튼 스타일 추가:

```css
.social-divider { /* 구분선 "또는" 텍스트 */ }
.social-btn     { /* 공통 소셜 버튼 */ }
.google-btn     { /* 흰 배경 + Google 컬러 */ }
.github-btn     { /* 검정 배경 */ }
```

---

## 동작 흐름

```
사용자 클릭
  → signInWithOAuth() 호출
  → Google/GitHub 로그인 페이지로 리다이렉트
  → 인증 완료 후 redirectTo URL로 복귀
  → Supabase가 URL 해시에서 세션 추출
  → onAuthStateChange 자동 감지
  → onSignedIn() 호출 → 앱 진입
```

기존 `onAuthStateChange` 로직을 그대로 재사용하므로 **추가 처리 코드 없음**.

---

## 주의사항

- `service_role` 키는 클라이언트 코드에 절대 노출 금지 (현재 `anon` 키 사용 중 — 정상)
- 동일 이메일로 이메일/소셜 로그인 혼용 시 Supabase가 자동 병합하지 않음
  → 필요 시 대시보드 **Authentication → Settings → "Link accounts"** 활성화 고려
- Client ID / Secret은 URL별로 다르지 않음 — OAuth 앱 하나당 하나의 자격증명, 여러 URL은 Redirect URLs에 추가 등록으로 처리
- 배포 URL 변경 시 Google Authorized JavaScript origins, Supabase Redirect URLs 두 곳만 업데이트하면 됨
