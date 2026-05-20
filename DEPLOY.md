# 배포 가이드

이 앱은 HTML/CSS/JS 정적 파일이고 백엔드는 Supabase가 담당하므로,
별도 서버 없이 정적 호스팅 서비스에 올리면 바로 동작합니다.

---

## 배포 전 필수: Supabase 인증 URL 설정

로그인/회원가입 후 리디렉션이 정상 동작하려면 배포 URL을 Supabase에 등록해야 합니다.

1. [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 선택
2. 좌측 메뉴 **Authentication** → **URL Configuration**
3. 아래 두 항목에 배포 URL 입력:

| 항목 | 값 예시 |
|---|---|
| **Site URL** | `https://my-todo.netlify.app` |
| **Redirect URLs** | `https://my-todo.netlify.app` |

> 배포 URL이 확정된 후에 설정해도 됩니다.

---

## 옵션 1 — Netlify Drop (가장 빠름, 계정 불필요)

폴더를 끌어다 놓기만 하면 즉시 배포됩니다.

1. [netlify.com/drop](https://app.netlify.com/drop) 접속
2. `todo/` 폴더 전체를 브라우저 창에 드래그 앤 드롭
3. 배포 완료 — `https://랜덤이름.netlify.app` URL 발급
4. URL 확정 후 위 Supabase 인증 URL 설정 진행

**커스텀 URL 고정하기** (Netlify 계정 필요):
- 배포 후 **Site configuration** → **Change site name** → 원하는 이름 입력
- `https://내가정한이름.netlify.app` 형태로 고정됨

---

## 옵션 2 — Vercel (GitHub 연동 자동 배포)

코드를 push하면 자동으로 재배포됩니다.

1. [vercel.com](https://vercel.com) → GitHub 계정으로 로그인
2. **Add New Project** → `kosa-vibecoding-2026-2nd` 저장소 Import
3. 프로젝트 설정에서 아래 항목 변경:

   | 항목 | 값 |
   |---|---|
   | **Root Directory** | `src/exercise/dbswnsgur/day03/todo` |
   | **Build Command** | (비워둠) |
   | **Output Directory** | (비워둠) |

4. **Deploy** 클릭 → `https://프로젝트명.vercel.app` URL 발급
5. 이후 `main` 브랜치에 push하면 자동 재배포

---

## 옵션 3 — GitHub Pages (추가 설정 필요)

공유 모노레포 특성상 저장소 루트가 배포 기준이 되므로, 앱 경로가 URL에 포함됩니다.

**접근 URL 형태:**
```
https://weable-kosa.github.io/kosa-vibecoding-2026-2nd/src/exercise/dbswnsgur/day03/todo/
```

**활성화 방법** (저장소 관리자 권한 필요):
1. GitHub 저장소 → **Settings** → **Pages**
2. Source: `Deploy from a branch`
3. Branch: `main` / Folder: `/ (root)`
4. Save → 몇 분 후 위 URL로 접근 가능

> 저장소 관리자가 아니라면 옵션 1, 2가 더 현실적입니다.

---

## 배포 후 확인 사항

- [ ] 로그인 / 회원가입 동작 확인
- [ ] 할 일 추가·수정·삭제 확인
- [ ] 새로고침 후 로그인 상태 유지 확인
- [ ] Supabase 대시보드 → **Authentication → Users**에서 가입 사용자 확인

---

## 참고: anon key 노출에 대하여

`index.html`에 Supabase `anon` 키가 포함되어 있습니다.
이는 의도된 설계로, `anon` 키는 공개되어도 안전합니다.
RLS(Row Level Security) 정책이 인증된 사용자 본인의 데이터만 접근하도록 보호하고 있습니다.
`service_role` 키는 절대 클라이언트 코드에 포함하지 않습니다.
