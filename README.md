# 8주차 FoodMap 클라이언트 — Supabase 로그인과 관리자 화면

React·Vite 클라이언트를 `../pwd-week8-server`의 Supabase 서버와 연결합니다. 이메일·비밀번호, Google OAuth, 네이버 OIDC 로그인 세 가지를 모두 필수 실습으로 다룹니다. 기존 맛집·관리자·제보 페이지를 유지하면서 쿠키 세션 인증을 Supabase Auth 세션과 Bearer 토큰으로 변경했습니다.

## 1. 서버와 DB 준비

처음 시작한다면 [서버 실습 안내](https://github.com/ajou-hyunseok-oh/pwd-week8-server#readme)에서 두 저장소를 같은 상위 폴더에 클론합니다. 7주차 서버 중지, 기존 데이터 점검, SQL 적용, Express 실행까지 마친 뒤 이 문서의 2절로 돌아옵니다. 서버 터미널은 실행 상태로 두고 브라우저에서 [로컬 맛집 API](http://localhost:3000/api/restaurants)를 엽니다. `data`에 맛집 목록이 보이면 클라이언트를 연결할 수 있습니다.

## 2. 실행 환경과 설치

두 저장소가 있는 상위 폴더에서 **두 번째 터미널**을 엽니다. 이미 `pwd-week8-client` 폴더라면 첫 줄은 건너뜁니다. `node --version`이 `v24.22.1`인지 확인합니다. 아래 명령은 macOS·Linux·Git Bash에서 실행할 수 있습니다.

```bash
cd pwd-week8-client
node --version
npm ci
test -f .env.local || cp .env.example .env.local
```

Supabase 프로젝트의 **Connect**에서 URL·Publishable key를 찾을 수 있습니다. 전체 키 목록은 **Settings → API Keys**에 있습니다.

`.env.local`에 다음 값을 입력합니다.

```dotenv
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_with_your_key
```

`VITE_API_BASE_URL`에는 `/api`를 붙이지 않습니다. 기존 `VITE_API_URL`도 호환되지만 새 실습은 week7과 같은 `VITE_API_BASE_URL`을 사용합니다. Supabase URL과 Publishable key는 같은 프로젝트에서 가져옵니다. **서버의 Secret key를 VITE 변수에 넣지 않습니다.**

```bash
npm run dev -- --host 127.0.0.1 --strictPort
```

브라우저에서 [공개 맛집 목록](http://127.0.0.1:5173/#/list)을 열고 상세 한 건을 확인합니다. 서버 `CLIENT_URL`에 이 origin을 등록합니다. 5173이 이미 사용 중이면 기존 Vite 터미널을 종료한 뒤 같은 명령을 다시 실행합니다. `.env.local`을 변경했을 때도 Vite를 재시작합니다.

## 3. 필수 로그인 실습 — 이메일·Google·네이버

세 방식의 인증 결과를 Supabase Auth의 사용자 UUID·세션으로 모읍니다. Express의 토큰 검증·관리자 권한 로직은 공통으로 사용합니다. 학생마다 Google·네이버 개발 앱과 기존 본인의 Supabase 프로젝트를 준비합니다.

콘솔 메뉴는 2026-11-07 기준입니다. 각 공급자의 실제 계정으로 동의한 뒤 앱에 복귀하고 본인 제보를 확인한 결과를 제출합니다.

진행 순서: [공통 주소와 키 준비](#3-1-콜백-두-개를-먼저-구분) → [이메일 로그인](#3-2-이메일비밀번호) → [Google 앱 키 발급](#3-3-google-oauth) → [네이버 앱 키 발급](#3-4-네이버-custom-oidc) → [제출 증거](#3-6-세-방식-공통-제출-증거). 오류가 나면 문서 하단의 [문제 해결](#문제-해결)에서 현재 단계에 해당하는 항목을 확인합니다.

| 순서 | 로그인 방식 | 연결 경로 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | 이메일·비밀번호 | Supabase Email Auth | 가입·확인·로그인·세션 복원 |
| 2 | Google OAuth | Supabase 기본 Google 공급자 | Google 동의·Supabase 세션·프로필 연결 |
| 3 | 네이버 OIDC | Supabase `custom:naver` 공급자 | 서명 검증된 ID 토큰의 sub로 사용자 식별 |
| 4 | 공통 권한 | Express Bearer 토큰·profiles | 제보·관리자·비활성 계정 검사 |

### 3-1. 콜백 두 개를 먼저 구분

#### A. 본인 프로젝트의 주소 기록

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인하고 **7주차에 사용한 본인 프로젝트**를 엽니다. 8주차용 프로젝트를 새로 만들어 기존 데이터와 분리하지 않습니다.
2. 프로젝트 URL `https://your-project-ref.supabase.co`에서 `your-project-ref` 부분이 본인의 프로젝트 ref입니다. 프로젝트 표시 이름이나 Google Cloud의 Project ID와는 다른 값입니다.
3. 이 안내에서는 브라우저 주소를 **`http://127.0.0.1:5173`으로 통일**합니다. Vite가 다른 포트로 실행되면 먼저 5173 포트로 맞춥니다.
4. 아래 표의 `your-project-ref`를 본인 값으로 바꿔 메모합니다. 예시 문자열을 그대로 콘솔에 넣지 않습니다.

| 준비할 값 | 로컬 실습 입력 예시 |
| --- | --- |
| React 앱 origin | `http://127.0.0.1:5173` |
| Supabase Project URL | `https://your-project-ref.supabase.co` |
| Google·네이버가 결과를 보낼 공급자 콜백 | `https://your-project-ref.supabase.co/auth/v1/callback` |
| Supabase가 React로 돌려보낼 주소 | `http://127.0.0.1:5173/auth/callback` |

React만 로컬에서 실행하고 Supabase는 클라우드 프로젝트를 사용합니다. 다른 자료의 `http://127.0.0.1:54321/auth/v1/callback`은 **로컬 Supabase CLI** 예시이므로 이 실습에 복사하지 않습니다.

#### B. Supabase에 React 복귀 주소 등록

1. Supabase 프로젝트 왼쪽 **Authentication → URL Configuration**을 엽니다.
2. **Site URL**에 `http://127.0.0.1:5173`을 입력하고 **Save changes**로 저장합니다.
3. **Redirect URLs → Add URL**에서 `http://127.0.0.1:5173/auth/callback`을 추가합니다. `localhost`로도 실행한다면 `http://localhost:5173/auth/callback`도 별도로 추가합니다.
4. 저장된 목록에 두 주소가 표시되는지 확인합니다. 여기에는 HashRouter의 `/#/login`이나 `/#/dashboard`를 넣지 않습니다.
5. **Authentication → Sign In / Providers → Google**을 열어 공급자 설정의 **Callback URL (for OAuth)**을 복사합니다. 메뉴가 `Providers`로 표시되면 그 메뉴에서 Google을 찾습니다. 아직 키가 없으므로 활성화·저장은 Google 발급 단계에서 진행합니다.

| 등록 위치 | 주소 | 역할 |
| --- | --- | --- |
| Google·네이버 개발자 콘솔 | Supabase 화면에 표시되는 공급자 콜백 URL. 일반 형식 `https://프로젝트-ref.supabase.co/auth/v1/callback` | 외부 인증 코드를 Supabase가 받음 |
| Supabase URL Configuration | `http://127.0.0.1:5173/auth/callback` | Supabase가 PKCE 코드를 앱으로 전달 |
| 같은 설정의 다른 로컬 origin | `http://localhost:5173/auth/callback` | localhost로 실습할 때 사용 |
| 배포 환경의 URL Configuration | `https://실제-클라이언트-도메인/auth/callback` | 배포 앱 복귀 |

Supabase의 Site URL은 현재 사용하는 클라이언트 origin으로 설정합니다. 외부 공급자의 콜백에 옛 Express `/api/auth/google/callback`, `/api/auth/naver/callback`을 넣지 않습니다. `/auth/callback` 경로를 서비스하도록 Vercel SPA rewrite를 유지합니다.

네이버 Custom Provider의 생성 폼에도 읽기 전용 **Callback URL**이 표시됩니다. 별도 도메인을 사용하는 프로젝트는 예시를 조합하지 말고 **각 공급자 화면에 표시되는 실제 값**을 복사합니다. [Supabase 복귀 URL 설정](https://supabase.com/docs/guides/auth/redirect-urls), [Custom Provider 콜백 안내](https://supabase.com/docs/guides/auth/custom-oauth-providers)

#### C. 이번 실습에서 쓰는 키 구분

| 발급 위치·이름 | 이 프로젝트에서 입력할 곳 | 브라우저에 포함 가능한가? |
| --- | --- | --- |
| Supabase **Publishable key** | 클라이언트 `.env.local`의 `VITE_SUPABASE_PUBLISHABLE_KEY` | 가능 |
| Supabase **Secret key** | 서버 `.env`의 `SUPABASE_SECRET_KEY` | 불가 |
| Google **OAuth Client ID / Client Secret** | Supabase **Google 공급자 설정** | Client Secret 불가 |
| 네이버 **Client ID / Client Secret** | 서버 `.env`의 `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`, 초기 설정 명령으로 Supabase에 등록 | Client Secret 불가 |

Google에서 발급하는 일반 **API key**는 이번 로그인용 키가 아닙니다. Google 계정 비밀번호, 네이버 계정 비밀번호, Supabase DB 비밀번호도 이 표의 Client Secret을 대신할 수 없습니다. Google·네이버용 `VITE_*` 변수를 새로 만들지 않습니다. 발급 화면·다운로드 JSON·실제 `.env`는 비밀값을 포함하므로 저장소나 과제 제출물에 첨부하지 않습니다. [Supabase 키 구분](https://supabase.com/docs/guides/getting-started/api-keys)

### 3-2. 이메일·비밀번호

1. Supabase Authentication에서 **Email**, 가입 허용, 이메일 확인을 켭니다. 기본 SMTP를 쓰면 **Supabase 조직의 Team에 등록된 본인 주소**로 가입합니다. 다른 수신 주소를 쓰려면 먼저 프로젝트에 별도 SMTP를 연결합니다. 기본 SMTP 발송 한도는 현재 프로젝트당 시간당 2통입니다. [Supabase 기본 SMTP 조건](https://supabase.com/docs/guides/auth/auth-smtp)
2. [회원가입 화면](http://127.0.0.1:5173/#/register)에서 이메일·이름·비밀번호로 가입합니다. 확인 메일을 **가입을 시작한 브라우저와 같은 프로필**에서 엽니다. 앱으로 돌아온 후 로그아웃하고 같은 계정으로 비밀번호 로그인을 해 봅니다.
3. 로그인 후 개발자 도구의 Network에서 `GET /api/auth/me` **응답**의 `data.user.id`와 `userType: "user"`를 확인합니다. 새로고침한 뒤에도 대시보드에 같은 이름이 표시되어야 합니다.
4. **관리자로 승격하기 전** `/#/submit`에서 이름을 구별할 수 있는 맛집을 제보합니다. Network에서 `POST /api/submissions`가 `201`인지 확인하고, `/#/admin`에서 접근 권한 안내를 확인합니다. 실제 관리자 API의 `403`은 아래 방법으로 확인합니다.
5. 로그아웃한 뒤 `/#/submit`을 다시 열면 로그인 화면으로 이동합니다. Google·네이버에서도 일반 사용자 검증을 마치고 7절에서 첫 관리자를 설정합니다. 이메일과 Google에 같은 주소를 사용하면 두 인증 수단이 하나의 UUID와 역할을 공유할 수 있습니다. [Supabase 계정 연결](https://supabase.com/docs/guides/auth/auth-identity-linking)

**로컬 개발 서버에서 관리자 API 상태 코드 확인.** 로그인한 일반 계정으로 앱을 연 상태에서 브라우저 개발자 도구 Console에서 실행합니다. 앱이 이미 사용하는 API 서비스로 요청하며 결과는 상태 코드 한 개입니다. 일반 계정은 `403`, 관리자는 `200`입니다.

```js
const { authAPIService } = await import("/src/services/authApi.js");
await authAPIService.getAllUsers().then(() => 200, error => error.response?.status);
```

SDK의 `signUp`, `signInWithPassword`, `onAuthStateChange`, `signOut`이 각각 어느 파일에서 호출되는지 설명합니다. 이메일 확인이 필요한 가입을 곧바로 로그인 완료로 처리하지 않습니다. [공식 이메일 인증 안내](https://supabase.com/docs/guides/auth/passwords)

### 3-3. Google OAuth

#### A. Google Cloud 프로젝트 선택·생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 로그인합니다. 본인 확인·2단계 인증이 나오면 본인이 완료합니다.
2. 상단 **프로젝트 선택기 → 새 프로젝트(New project)**를 엽니다. 이미 본인 실습용 Google 프로젝트가 있으면 그것을 선택해도 됩니다. Google 프로젝트는 Supabase 프로젝트와 별개입니다.
3. **프로젝트 이름(Project name)**을 `pwd-week8-foodmap`처럼 입력합니다. 위치(Location)는 본인이 사용할 수 있는 조직·위치를 선택합니다. 개인 계정에서 조직이 없으면 조직 없음(No organization)을 사용합니다.
4. **만들기(Create)** 후 상단 프로젝트 선택기에 방금 만든 프로젝트 이름이 표시되는지 확인합니다. 학교 계정에서 생성 권한이 제한되면 사용 가능한 개인 Google 계정으로 진행하거나 수업 담당자에게 조직 정책을 확인합니다.
5. [Google Auth Platform](https://console.cloud.google.com/auth/overview)을 엽니다. 왼쪽 메뉴에서 찾을 때는 **☰ → Google Auth Platform**을 사용합니다. 예전 자료의 `API 및 서비스 → 사용자 인증 정보` 화면만 찾지 않도록 합니다.

완료 기준: 올바른 Google 프로젝트가 선택되고 Google Auth Platform의 Overview 또는 초기 설정 화면이 열립니다. [Google 프로젝트 생성 안내](https://developers.google.com/workspace/guides/create-project)

#### B. 최초 앱 등록: Branding·Audience

1. `Google Auth Platform not configured yet`가 보이면 **시작하기(Get started)**를 누릅니다. 이미 설정한 프로젝트는 **브랜딩(Branding)**, **대상(Audience)** 메뉴에서 아래 항목을 확인합니다.
2. **앱 정보(App Information)**에서 다음 값을 입력하고 **다음(Next)**으로 이동합니다.

| 필드 | 입력·선택 예시 |
| --- | --- |
| 앱 이름(App name) | `FoodMap 8주차 실습` |
| 사용자 지원 이메일(User support email) | 본인이 확인할 수 있는 Google 계정 이메일 |
| 대상(Audience) | **외부(External)** — 개인 Gmail·학교 계정 등으로 실습할 때 |
| 연락처 정보(Contact Information)의 이메일 | 본인이 수신할 수 있는 이메일 |

3. **완료(Finish)**에서 Google 사용자 데이터 정책을 직접 읽고 동의한 뒤 **계속(Continue) → 만들기(Create)**를 완료합니다. 학교 조직 전용으로 운영하는 경우에만 Internal을 선택합니다. Internal이면 조직 밖 계정으로 로그인할 수 없습니다.
4. **대상(Audience)**에서 게시 상태(Publishing status)를 확인합니다. 수업 중에는 **테스트(Testing)** 상태로 진행하며 공개 배포를 위한 게시·브랜드 검증은 별도 단계입니다.
5. **테스트 사용자(Test users) → 사용자 추가(Add users)**에 로그인 시험에 사용할 Google 이메일을 입력하고 **저장(Save)**합니다. 여러 계정을 시험하면 각각 추가합니다.
6. Branding의 로고·홈페이지·개인정보처리방침·약관 URL은 실제 제공할 정보가 있을 때 설정합니다. 필수로 표시되지 않는 배포용 항목에 임의의 사이트를 넣어 초기 등록을 진행하지 않습니다.

이 실습의 기본 로그인 범위(`openid`, `userinfo.email`, `userinfo.profile`)만 요청하는 앱에는 Google의 테스트 사용자 제한·7일 승인 만료 규칙에 예외가 있습니다. 테스트 계정 등록은 실습 계정을 명확히 하기 위한 절차이며, Google이 항상 미검증 앱 경고를 표시한다고 가정하지 않습니다. 조직 관리자의 앱 차단 정책은 별도로 적용될 수 있습니다. [Google 동의 화면 설정](https://developers.google.com/workspace/guides/configure-oauth-consent), [Audience와 기본 로그인 범위의 예외](https://support.google.com/cloud/answer/15549945?hl=en)

#### C. Data Access에서 로그인 범위 확인

1. 왼쪽 **데이터 액세스(Data Access)**를 엽니다.
2. **범위 추가 또는 삭제(Add or remove scopes)**를 누르고 다음 세 범위가 포함되는지 확인합니다. `openid`가 목록에 없다면 수동 입력(Manually add scopes)에서 추가합니다.
3. **업데이트(Update)** 후 Data Access 화면의 **저장(Save)**까지 완료합니다. 이미 등록된 범위를 중복 추가하지 않습니다.

| 필요한 scope | 목적 |
| --- | --- |
| `openid` | Google 사용자 인증·ID 토큰 |
| `https://www.googleapis.com/auth/userinfo.email` | 이메일 |
| `https://www.googleapis.com/auth/userinfo.profile` | 기본 프로필 |

Drive·Gmail·Calendar 등의 추가 권한은 이번 로그인 실습에서 요청하지 않습니다. 위 세 범위는 Supabase의 Google 공급자 안내에 따른 것입니다. [Supabase Google 필수 scopes](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)

#### D. Clients에서 Client ID·Client Secret 발급

1. 왼쪽 **클라이언트(Clients) → 클라이언트 만들기(Create client)**를 누릅니다.
2. 아래 표대로 입력합니다. Origin은 경로 없이 입력하고 Redirect URI는 `/auth/v1/callback`까지 입력합니다.

| 필드 | 입력·선택 값 |
| --- | --- |
| 애플리케이션 유형(Application type) | **웹 애플리케이션(Web application)** |
| 이름(Name) | `FoodMap Supabase Web` — 콘솔에서 구분하는 이름 |
| 승인된 JavaScript 원본(Authorized JavaScript origins) | `http://127.0.0.1:5173` |
| 원본의 추가 URI(Add URI), localhost도 사용할 때 | `http://localhost:5173` |
| 승인된 리디렉션 URI(Authorized redirect URIs) | **Supabase Google 공급자 화면에서 복사한 콜백**. 예: `https://your-project-ref.supabase.co/auth/v1/callback` |

3. **만들기(Create)**를 누릅니다. 생성 완료 화면에서 **클라이언트 ID(Client ID)**와 **클라이언트 보안 비밀번호(Client Secret)**를 각각 복사합니다. Client ID는 보통 `.apps.googleusercontent.com`으로 끝납니다.
4. **생성 완료 창을 닫기 전에 Client Secret을 안전하게 보관**합니다. JSON 다운로드(Download JSON)로 받은 파일도 비밀값이 포함된 자격증명 파일입니다. 프로젝트 폴더·Git·과제 업로드 폴더에 두지 않습니다.
5. Google은 현재 **생성 시점에만 Client Secret 전체 값의 조회·다운로드를 허용**합니다. 나중에 보이는 끝 네 글자를 Secret으로 입력하면 안 됩니다. 값을 잃어버렸다면 **Clients → 해당 클라이언트 → Add Secret**으로 새 Secret을 발급해 즉시 보관하고, Supabase의 Secret을 갱신합니다. 새 값으로 실제 로그인을 확인한 뒤 사용하지 않는 이전 Secret을 Disable합니다. 앱 전체나 기존 클라이언트를 삭제할 필요는 없습니다.

완료 기준: **동일한 웹 클라이언트에서 발급한** Client ID·Client Secret 한 쌍을 확보했습니다. React 앱이더라도 코드 교환을 Supabase 서버가 수행하므로 여기서는 Web application을 사용합니다. [Google 웹 클라이언트 생성 메뉴](https://developers.google.com/workspace/guides/create-credentials#web-application), [Secret 표시·교체 정책](https://support.google.com/cloud/answer/15549257?hl=en)

#### E. Supabase Google 공급자에 입력

1. Supabase의 **본인 프로젝트 → Authentication → Sign In / Providers → Google**로 돌아갑니다.
2. **Enable Sign in with Google**을 켭니다.
3. **Client IDs**에 방금 발급한 웹 Client ID를 입력합니다. 이 실습에서는 한 개를 사용합니다.
4. **Client Secret (for OAuth)**에 **같은 웹 클라이언트의 Secret 전체 값**을 입력합니다. Supabase Secret key를 이 칸에 넣지 않습니다.
5. 표시된 **Callback URL (for OAuth)**과 Google Clients에 저장한 Redirect URI가 글자 단위로 같은지 다시 확인하고 **Save**합니다.
6. nonce 검증 생략 등 추가 보안 옵션은 기본값을 유지합니다. Google 키를 클라이언트 `.env.local`이나 소스에 추가하지 않습니다.

완료 기준: Google 공급자가 활성 상태로 저장됩니다. 이 상태는 키·동의 화면이 실제로 정상 작동한다는 최종 증거는 아닙니다. [Supabase Google 연결](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)

#### F. 실제 계정으로 왕복 로그인 확인

1. 서버·클라이언트를 실행하고 `http://127.0.0.1:5173/#/login`을 엽니다. 기존 로그인 상태이면 앱에서 로그아웃합니다.
2. **로그인 상태 다시 확인**을 눌러 Google 버튼을 확인합니다. 화면은 `GET /api/auth/providers`로 상태를 읽으며 서버 캐시가 최대 60초 유지됩니다. 저장 직후에는 최대 60초 뒤 다시 확인합니다.
3. **Google로 로그인 → 사용할 계정 선택 → 표시된 동의 내용 확인**을 진행합니다. 브라우저 보안 경고나 조직 정책으로 막히면 우회하지 말고 [문제 해결](#문제-해결)의 원인을 확인합니다.
4. Supabase를 거쳐 앱의 `/#/dashboard`로 돌아오고 본인 이름이 표시되는지 확인합니다.
5. Supabase **Authentication → Users**에서 해당 사용자를 열어 UUID와 Google identity를 확인합니다. `public.profiles.id`가 같은 UUID이고 신규 일반 계정의 `user_type`이 `user`인지 확인합니다.
6. 새로고침·로그아웃·같은 Google 계정 재로그인 후 같은 UUID·기존 제보가 유지되는지 확인합니다. 다른 방식으로 가입한 이메일과 같다면 Supabase의 identity 연결 결과를 확인하며 별도 UUID 생성으로 단정하지 않습니다.

클라이언트 코드는 `signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback' } })`를 사용합니다. 공급자 code 교환은 Supabase가 처리합니다. [Google 연동 공식 안내](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)

### 3-4. 네이버 Custom OIDC

2026-11-07 확인한 네이버 공개 설정은 OIDC와 S256 PKCE를 제공합니다. 이 실습은 Supabase Custom OIDC를 사용하며 옛 `oauth2.0` OAuth API의 프로필 응답을 그대로 공급자 userinfo에 연결하는 방식으로 안내하지 않습니다. [네이버 OIDC 설정](https://nid.naver.com/.well-known/openid-configuration), [Supabase Custom OIDC](https://supabase.com/docs/guides/auth/custom-oauth-providers)

#### A. 네이버 개발자 계정 준비

1. [NAVER Developers](https://developers.naver.com/)에 본인 네이버 계정으로 로그인합니다. 이 계정으로 앱을 소유·관리하게 됩니다.
2. 상단 **Application → 애플리케이션 등록**을 선택합니다. [등록 화면 바로가기](https://developers.naver.com/apps/#/register)를 사용해도 됩니다.
3. 처음 이용할 때 이용약관 동의·계정 정보 등록·휴대폰 인증 등이 나오면 내용을 확인하고 본인이 완료합니다. 필수 연락처·계정 정보는 실제 정보를 입력합니다.
4. **애플리케이션 등록(API 이용신청)** 화면이 열리는지 확인합니다. 네이버 로그인 페이지로 돌아갔다면 먼저 로그인을 완료하고 등록 메뉴를 다시 엽니다. [네이버 최초 등록 안내](https://developers.naver.com/docs/common/openapiguide/appregister.md)

#### B. 웹 앱 등록과 Callback URL 입력

1. Supabase **Authentication → Sign In / Providers → Custom Providers → New Provider**를 엽니다. 생성 폼의 **Configuration Method → Auto-discovery (Recommended)**가 공식 문서의 Auto-discovery (OIDC)에 해당합니다. 읽기 전용 **Callback URL**을 복사하고 **Cancel**로 닫습니다. 실제 공급자 생성은 아래 서버 명령으로 진행합니다.
2. 네이버 등록 화면에 다음과 같이 입력합니다. Google 앱 키를 재사용하지 않고 네이버 앱을 별도로 등록합니다.

| 필드·구역 | 입력·선택 값 |
| --- | --- |
| 애플리케이션 이름 | 예: `푸드맵실습` — 로그인 동의 화면에 표시되는 이름 |
| 사용 API | **네이버 로그인** 선택 |
| 로그인 오픈 API 서비스 환경 → 환경 추가 | **PC 웹** 선택 |
| 서비스 URL | `http://127.0.0.1:5173` — 사용자가 여는 React 앱 |
| 네이버 로그인 Callback URL | **Supabase의 공급자 콜백**. 예: `https://your-project-ref.supabase.co/auth/v1/callback` |

3. `네이버 로그인`을 선택해야 로그인용 서비스 환경 입력란이 나타납니다. 비로그인 API의 `WEB 설정`에만 주소를 입력하고 끝내지 않습니다.
4. **제공 정보 선택(이용자 식별자는 기본 정보로 제공)**의 `필수`·`추가` 체크박스는 이번 실습에서 모두 선택하지 않습니다. 기본 식별자로 인증하고 표시 이름은 앱에서 직접 입력합니다. 제공 정보의 사용 여부는 등록 후 **API 설정**에서도 확인합니다.
5. **서비스 이용 동의**의 두 확인 항목을 직접 읽고 동의한 뒤 **등록하기**를 누릅니다. Callback URL에 React의 `/auth/callback`이나 Express의 3000번 포트를 넣지 않습니다. 버튼이 비활성화되어 있으면 화면 아래에 표시된 누락 필드와 동의 항목을 확인합니다.

완료 기준: **Application → 내 애플리케이션** 목록에 앱이 있고, 앱의 **API 설정 → 로그인 오픈 API 서비스 환경 → PC 웹**에 방금 입력한 주소가 저장되어 있습니다. [네이버 등록 필드·PC 웹 설정](https://developers.naver.com/docs/common/openapiguide/appregister.md), [제공 정보 선택과 OIDC 규격](https://developers.naver.com/docs/login/devguide/devguide.md)

#### C. 개요에서 Client ID·Client Secret 확인

1. **Application → 내 애플리케이션 → 방금 등록한 앱 이름 → 개요**를 엽니다.
2. **애플리케이션 정보**에서 **Client ID**를 복사합니다.
3. **Client Secret**의 표시·확인 기능을 이용해 전체 값을 복사합니다. 마스킹된 별표를 그대로 복사하지 않습니다. 본인 인증을 요구하면 본인이 완료합니다.
4. 두 값이 **같은 네이버 앱**의 값인지 확인합니다. Supabase 키나 Google Client Secret과 섞지 않습니다. 단순 조회를 위해 Secret을 재발급하지 않습니다. 재발급하면 기존에 연결한 Supabase 설정도 갱신해야 합니다.

완료 기준: 네이버 Client ID·Client Secret 한 쌍을 확보했습니다. 저장소에는 실제 값 대신 빈 `.env.example`만 공유합니다. [내 애플리케이션의 개요·키 확인](https://developers.naver.com/docs/common/openapiguide/appconf.md)

#### D. 개발 중 상태와 테스트 계정 등록

1. 앱의 **API 설정**에서 **애플리케이션 개발 상태**를 확인합니다. 최초 등록 앱은 **개발 중**입니다.
2. **멤버 관리 → 테스터 ID 등록**에서 실제 로그인할 네이버 아이디를 등록합니다. 이메일·Google 계정·Supabase UUID를 입력하는 칸이 아닙니다. 등록 결과 목록에 대상 아이디가 표시되는지 확인합니다.
3. 앱 소유 계정 외 다른 계정으로 시험할 때는 그 계정도 미리 테스터로 등록합니다. 테스터에게 앱 설정을 바꿀 수 있는 관리자 권한을 줄 필요는 없습니다.
4. 개발 중에는 등록된 테스트 계정 범위에서 검증합니다. 불특정 학생·일반 사용자에게 공개하려면 **네이버 로그인 검수요청 → 승인 → 서비스 적용** 절차가 추가됩니다. 개인별 로컬 실습에서 공개 서비스 승인을 먼저 받는 것으로 안내하지 않습니다.

네이버 공식 안내의 테스터 등록 한도는 20개입니다. 한 앱을 수업 전체에 배포하기보다 학생별 앱을 사용합니다. 개발자센터 앱 관리자·테스터와 FoodMap의 `profiles.user_type`은 서로 다른 권한입니다. 네이버 앱 관리자로 등록해도 FoodMap 관리자가 되지 않습니다. [개발 상태·멤버 관리 안내](https://developers.naver.com/docs/common/openapiguide/appconf.md)

#### E. 서버 초기 설정 명령으로 Supabase 연결

1. **`pwd-week8-server` 폴더**의 `.env`를 엽니다. 파일이 없다면 [서버 실습 안내](https://github.com/ajou-hyunseok-oh/pwd-week8-server#readme)에 따라 본인 Supabase URL·서버 Secret key부터 설정합니다.
2. 기존 Supabase 설정을 유지한 채 다음 두 항목의 값을 네이버에서 발급한 값으로 채웁니다. 아래 문자열은 설명용이므로 실제 발급값으로 교체합니다.

```dotenv
# pwd-week8-server/.env — 클라이언트 .env.local에 넣지 않습니다.
NAVER_CLIENT_ID=your_client_id_from_naver
NAVER_CLIENT_SECRET=your_client_secret_from_naver
```

3. Express와 Vite를 실행한 창은 열어 두고, 새 터미널을 `pwd-week8-server` 폴더에서 엽니다. 다음 명령을 실행합니다.

```bash
npm run auth:setup-naver
```

4. `custom:naver OIDC 공급자 설정 완료`가 출력되는지 확인합니다. 이 명령은 Supabase에 **등록·갱신하는 명령**이며 읽기 전용 점검과 다릅니다. 키 전체 값은 출력하지 않습니다.
5. Supabase 공급자 목록을 새로고침하고 **Custom Providers**의 Naver 항목이 생성·활성화되었는지 확인합니다. 공식 문서에서는 이 목록을 Custom OAuth Providers로 부르기도 합니다. 식별자는 정확히 `custom:naver`여야 합니다.

스크립트가 적용하는 설정은 다음과 같습니다. 화면에서 임의로 다른 종류의 공급자를 중복 생성하지 않습니다.

| 설정 | 값 |
| --- | --- |
| provider_type | `oidc` |
| identifier | `custom:naver` |
| issuer | `https://nid.naver.com` |
| scopes | `openid` |
| pkce_enabled | `true` |
| email_optional | `true` |

같은 Client ID로 재실행하면 기존 설정을 갱신합니다. 기존 `custom:naver`가 다른 Client ID·공급자 종류라면 사용자 연결을 보호하기 위해 중단합니다. 오류를 없애기 위해 기존 공급자를 삭제하거나 앱을 새로 만들지 말고 어떤 앱의 키를 사용했는지 확인합니다. Client Secret은 Supabase Auth에 저장되며, 초기 설정 뒤 Express의 일반 요청에는 네이버 Secret이 필요하지 않습니다. [Supabase Custom OIDC·이메일 선택 설정](https://supabase.com/docs/guides/auth/custom-oauth-providers)

#### F. 설정 점검과 실제 네이버 로그인

1. 서버 폴더에서 다음 **읽기 전용** 명령을 실행합니다.

```bash
npm run auth:check
```

2. 출력의 `checks`에서 `emailPasswordEnabled`, `googleEnabled`와 `naver`로 시작하는 모든 항목이 `true`인지 확인합니다. Google을 아직 설정하지 않았다면 `googleEnabled`가 `false`이고 명령이 종료 코드 1로 끝날 수 있으므로 해당 항목을 구분해 읽습니다.
3. 출력의 `providerCallback`과 네이버 **API 설정 → PC 웹 → Callback URL**이 같은지 대조합니다. 주소는 비밀키가 아니지만 출력 전체에 실제 키를 덧붙여 공유하지 않습니다.
4. Express·Vite를 실행한 상태에서 `http://127.0.0.1:5173/#/login`을 엽니다. **로그인 상태 다시 확인**을 누르고 네이버 버튼을 확인합니다. 서버 설정 캐시는 최대 60초이므로 저장 직후에는 최대 60초 뒤 다시 확인합니다.
5. 앱에서 로그아웃한 뒤 **네이버로 로그인**을 누릅니다. 앞서 등록한 테스트 계정으로 로그인하고 동의 내용을 확인합니다. 네이버에 이미 로그인되어 있으면 아이디 입력 화면이 생략될 수 있으므로 현재 네이버 계정을 확인합니다.
6. 네이버 → Supabase → 앱 `/#/dashboard`로 돌아오는지 확인합니다. Supabase **Authentication → Users**에서 네이버 identity(`custom:naver`)와 UUID를 확인합니다.
7. 표시 이름을 바꿔 저장하고 새로고침 후 유지되는지 확인합니다. 로그아웃·같은 네이버 계정 재로그인 후 UUID·기존 제보가 유지되는지 확인합니다.

`auth:check`의 모든 항목이 `true`여도 Client Secret의 유효성·네이버 테스트 계정·동의·실제 콜백 성공까지 검증한 것은 아닙니다. 반드시 5~7단계를 완료합니다.

네이버 OIDC ID 토큰은 `sub` 식별자와 검증용 클레임을 제공하고 이름·이메일을 포함하지 않습니다. Auth UUID로 업무 데이터를 연결하고, 프로필 이메일은 `미제공`, 기본 이름은 `사용자`로 처리합니다. 이름은 대시보드의 표시 이름 폼에서 본인 프로필 수정 API로 저장합니다. 7절에서 첫 관리자를 설정한 뒤 네이버 계정의 역할도 바꿔 봅니다. 사용자 관리 표와 확인창의 UUID를 네이버 계정의 Auth UUID와 대조합니다. 이메일 주소를 임의 생성하거나 이메일만으로 계정을 합치지 않습니다. [네이버 OIDC·프로필 규격](https://developers.naver.com/docs/login/devguide/devguide.md)

이름·사진을 네이버 프로필 API에서 자동 보완하는 기능은 후속 구현으로 구분합니다. 네이버 공급자 access token은 Supabase API 액세스 토큰과 다르며, Express의 일반 Bearer 인증에 대신 넣지 않습니다.

### 3-5. PKCE와 공통 세션

```text
React 로그인 버튼 → Supabase Auth → Google 또는 네이버
공급자 → Supabase /auth/v1/callback
Supabase → React /auth/callback?code=...
React SDK → PKCE 코드 교환 → Supabase 세션 저장
React → Supabase 액세스 토큰 → Express → 현재 profiles 역할 검사
```

브라우저→Supabase 구간의 `flowType: 'pkce'`와 Supabase→네이버 구간의 `pkce_enabled`를 구분합니다. 이번 복귀 코드 교환이 성공하면 `/#/dashboard`로 이동하고, 앱이 서버에서 사용자 프로필을 읽어 대시보드를 표시합니다. 실패 처리는 로그인된 상태에서도 확인할 수 있습니다. 직접 [잘못된 코드로 복귀](http://127.0.0.1:5173/auth/callback?code=invalid-classroom-example)를 열면 로그인 화면에 오류가 표시되어야 합니다.

### 3-6. 세 방식 공통 제출 증거

- 각 로그인 방식에서 로그인 전·후, 새로고침·로그아웃·재로그인을 확인합니다.
- Supabase Auth UUID, identity 공급자, profiles 연결 UUID를 대조합니다.
- 같은 공급자 계정의 재로그인은 같은 UUID와 기존 제보를 유지해야 합니다.
- 각 방식의 일반 사용자는 제보 가능, 관리자 API는 403이어야 합니다.
- 7절에서 관리자 승격·해제를 검증하고, 서버의 `npm run test:live`에서 임시 계정 비활성화 후 API 접근이 차단되는지 확인합니다.
- 다른 로그인 방식 간 계정 연결은 Auth identities와 검증 상태를 확인합니다. 이메일 문자열만 비교해 직접 합치지 않습니다.
- 네이버에서 이메일·이름이 없어도 로그인·제보·권한 확인이 계속 동작해야 합니다.

세 가지 로그인 방식을 각각 마친 뒤에 첫 관리자를 설정합니다. 공급자 설정이 모두 활성화되어도 세션 발급·본인의 UUID·제보까지 확인해야 해당 방식의 실습을 완료한 것입니다.

제출 자료는 아래 체크리스트로 정리합니다. 발급 완료 대화상자·JSON 파일·`.env` 전체를 캡처하지 않습니다. 설정 화면을 제출한다면 **Client Secret·Supabase Secret key·토큰·본인 이메일과 테스트 계정 아이디를 가린 뒤** 제출합니다. 브라우저 Network의 Authorization 헤더나 OAuth code가 붙은 주소창도 제출하지 않습니다.

| 증거 | 확인할 내용 |
| --- | --- |
| Google 설정 요약 | Web application, origin, 공급자 Redirect URI, 세 가지 기본 scopes |
| 네이버 설정 요약 | PC 웹 서비스 URL·Callback URL, 개발 중 상태, 테스트 계정 등록 여부 |
| Supabase 준비 상태 | Google 활성화, `custom:naver`·OIDC·PKCE·email_optional, `auth:check` 결과 |
| 실제 로그인 결과 | 이메일·Google·네이버 각각 앱 복귀·대시보드·세션 복원·재로그인 |
| 계정과 권한 | 공급자 identity와 profiles UUID 일치, 일반 계정의 관리자 API 403 |
| 실패 처리 | 공급자 화면에서 로그인 취소 후 앱의 안내·재시도 동작 |

## 4. 인증 흐름을 파일로 따라가기

| 파일 | 역할 |
| --- | --- |
| `src/config/supabase.js` | Publishable key로 브라우저 SDK 준비, PKCE·세션 저장·자동 갱신 |
| `src/services/authApi.js` | 가입·로그인·로그아웃·소셜 인증, 프로필·관리자 API |
| `src/services/api.jsx` | 액세스 토큰을 Authorization 헤더에 첨부 |
| `src/contexts/AuthContext.jsx` | 세션 복원, 서버 프로필 조회, 역할·로그인 상태 |
| `src/components/AuthCallbackHandler.jsx` | 인증 성공·취소·실패를 구분하고 HashRouter 주소로 이동 |
| `src/components/SocialLoginButtons.jsx` | Google·네이버 버튼 표시, 실제 공급자 설정에 따른 활성화 |
| `src/components/ProfileForm.jsx` | 본인 표시 이름 수정·저장 |
| `src/components/ProtectedRoute.jsx` | 로그인 필요 페이지 |
| `src/components/AdminRoute.jsx` | 관리자 화면 접근 제어 |

로그인 성공 후 `/api/auth/me`에서 서버가 검증한 프로필을 읽습니다. 관리자 여부는 `user.userType === 'admin'`입니다. 사용자 ID는 UUID `user.id`이며 `_id`를 사용하지 않습니다. 쿠키 `withCredentials`는 사용하지 않습니다.

Auth 상태 변경 콜백에서는 SDK를 직접 기다리지 않고 콜백 밖에서 프로필을 읽습니다. 로그아웃·다른 사용자 로그인 시 React Query 캐시를 제거해 이전 계정의 사용자·제보 데이터가 남지 않도록 합니다. 서버는 각 API 요청에서 현재 역할·활성 상태를 다시 검사합니다.

## 5. 화면과 권한

HashRouter를 사용하므로 주소에 `/#/`가 포함됩니다.

| 경로 | 권한 | 기능 |
| --- | --- | --- |
| `/#/`, `/#/list`, `/#/popular` | 공개 | 맛집 목록·필터·인기 목록 |
| `/#/restaurant/:id` | 공개 | 상세 조회 |
| `/#/register`, `/#/login` | 공개 | 가입·로그인 |
| `/#/dashboard` | 로그인 | 프로필·계정 종류·관리자 메뉴 |
| `/#/submit` | 로그인 | 제보 등록, 제보자는 서버에서 기록 |
| `/#/admin` | 관리자 | 맛집 CRUD·사용자 목록·역할 변경 |
| `/#/submissions` | 관리자 | 제보 목록·상태 필터·승인·거절·삭제 |

비로그인 사용자는 로그인 화면으로 이동하고 일반 사용자는 관리자 화면에서 접근 권한 없음 안내를 봅니다. 최종 데이터 접근 권한은 Express가 검사합니다.

첫 관리자 설정 명령은 7절에서 실행합니다. 이후에는 관리자 페이지의 사용자 관리 탭에서 해당 사용자의 UUID를 대조해 역할을 변경할 수 있습니다. 마지막 활성 관리자는 해제할 수 없습니다.

## 6. 관리자·제보 동작 변경

- 맛집 API는 기존 `{ data: ... }`와 camelCase 필드를 유지합니다.
- 인증 API 서비스는 Axios 응답 전체 대신 서버 본문을 반환합니다. 사용자 목록은 `usersData.data.users`로 읽습니다.
- 맛집 부분 수정 시 생략한 필드와 추천 메뉴는 보존합니다.
- 승인 버튼은 `POST /api/submissions/:id/approve` 한 번만 요청합니다. 서버 SQL 함수가 맛집 생성과 제보 상태를 함께 처리합니다.
- 승인·거절은 대기 제보에서만 선택합니다. 이미 승인한 요청의 재시도는 같은 맛집을 반환합니다.
- 요청 본문의 제보자·승인 상태로 사용자 식별이나 승인을 우회할 수 없습니다.
- 화면 좋아요는 기존 LocalStorage 방식, 이미지는 기존 외부 URL 방식입니다.

대시보드에서 본인의 표시 이름을 수정할 수 있습니다. `authAPIService`에는 계정 비활성화·Supabase 비밀번호 변경 함수도 제공합니다. 비밀번호 변경은 Supabase `updateUser`로 처리하며 Express에 비밀번호를 보내지 않습니다.

## 7. 실제 연동 확인

1. 3절에서 각 방식의 일반 사용자 제보와 관리자 API `403`을 확인합니다. 제보한 맛집 이름과 각 계정의 UUID를 기록합니다.
2. **첫 관리자**로 쓸 이메일 계정을 고릅니다. 명령용 터미널을 `pwd-week8-server` 폴더에서 열고 `npm run change-user-type -- your-email@example.com admin`을 실행합니다. 주소는 방금 일반 사용자로 확인한 본인 주소로 바꿉니다. 클라이언트에서 그 계정으로 로그인하고 대시보드를 새로고침하면 관리자 메뉴가 나타납니다.
3. `/#/admin`에서 연습용 맛집 하나를 생성·수정·삭제합니다. **사용자 관리**에서 이름·이메일이 같은 계정은 UUID로 구분합니다. 역할 변경 확인창의 UUID를 Supabase Authentication에서 기록한 값과 대조합니다.
4. `/#/submissions`에서 1단계 때 등록한 대기 제보를 **승인**합니다. 공개 맛집 목록을 새로고침하고 같은 이름의 맛집이 한 건 생겼는지 확인합니다. 이미 승인된 행의 버튼은 비활성화됩니다. 같은 제보의 동시 승인·재시도는 서버 폴더의 `npm run test:live`가 실제 API로 검사합니다.
5. 별도 브라우저 프로필에서 다른 UUID의 일반 사용자로 로그인합니다. 관리자가 그 사용자를 승격한 직후 해당 사용자 브라우저에서 3-2절의 관리자 API를 호출하면 `200`, 다시 일반 사용자로 바꾸면 `403`입니다. 화면의 역할 표시도 새로고침해 확인합니다.
6. Express를 종료한 뒤 서버 폴더에서 `npm run dev`로 다시 시작합니다. 공개 목록에서 승인한 맛집이 유지되는지 확인합니다. 로그아웃한 뒤 `/#/dashboard`와 `/#/admin`을 열면 로그인 화면으로 이동합니다.

권한 실습에 별도 계정이 필요하면 서버에서 `npm run test:live -- --keep-fixtures`를 한 번 실행해 이메일 확인을 완료한 테스트 계정 두 개와 대기 제보를 준비할 수 있습니다. 기존 `.env.live-test.local`이 있으면 그 파일의 계정을 사용합니다. 이 파일은 Git에서 제외되며, 실제 가입 메일이나 소셜 로그인 검증은 3절에서 따로 수행합니다.


## 8. 검사·배포

```bash
npm test
npm run lint
npm run build
```

1. [서버 실습 안내](https://github.com/ajou-hyunseok-oh/pwd-week8-server#readme)에 따라 8주차 코드를 Render에 배포하고, 해당 공개 주소의 `/health`와 `/api/restaurants`를 먼저 엽니다.
2. Vercel에서 본인 GitHub 계정의 8주차 클라이언트 저장소를 가져옵니다. 필요하면 수업 저장소를 Fork합니다. 프로젝트 루트의 `vercel.json`을 사용하며 Framework는 **Vite**, Build는 `npm run build`, Output은 `dist`입니다.
3. **Production** 환경에 세 값을 설정합니다. `VITE_API_BASE_URL`은 Render HTTPS origin(예: `https://본인-서비스.onrender.com`), `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`는 서버와 같은 프로젝트의 값입니다. 저장한 뒤 새로 배포합니다.
4. 고정된 Vercel Production origin을 Render의 `CLIENT_URL`에 추가하고 서버를 재시작합니다. Supabase **URL Configuration**의 Site URL에 배포 origin을, Redirect URLs에 그 origin의 `/auth/callback`을 등록합니다. Google의 JavaScript origin과 네이버 PC 웹 서비스 URL도 배포 주소를 반영합니다. 두 공급자의 Redirect/Callback URL은 Supabase가 표시한 `/auth/v1/callback`입니다.
5. 시크릿 창에서 Vercel의 `/#/list`를 열고 맛집 한 건을 확인합니다. `/auth/callback`을 코드 없이 직접 열면 로그인 오류 화면으로 이동해야 합니다. 이어서 배포 앱에서 세 가지 실제 로그인, 새로고침, 제보·승인 과정을 확인합니다. [Vercel의 Vite SPA 경로 설정](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas)

## 문제 해결

| 증상 | 확인 |
| --- | --- |
| Supabase 설정 오류 | URL·Publishable key, Vite 재시작 |
| 회원가입 직후 로그인되지 않음 | 이메일 확인 안내·메일 수신·허용 복귀 URL |
| `Email address not authorized` 또는 메일 발송 제한 | 기본 SMTP라면 Supabase 조직 Team에 등록된 주소를 사용합니다. 다른 주소는 별도 SMTP를 연결한 뒤 시도하고, `429`라면 제한 시간이 지난 뒤 재시도합니다. |
| API 401 | SDK 세션·Authorization 헤더 |
| API 403 | 사용자 역할·활성 상태, 화면 로그인과 구별 |
| 사용자 목록이 비어 있음 | 관리자 계정 여부, 본문의 `data.users` |
| CORS 오류 | 3000 서버 주소와 CLIENT_URL origin |
| OAuth 오류 | 공급자 설정·PKCE 복귀 URL·서버 공급자 상태 API |

### Google 키 발급·로그인 오류

| 증상 | 해결 순서 |
| --- | --- |
| Clients 또는 Create client를 찾지 못함 | 올바른 Cloud 프로젝트 선택 → Google Auth Platform → 초기 Get started 완료 → Clients 확인 |
| `redirect_uri_mismatch` | Google **Clients → 해당 웹 클라이언트 → Authorized redirect URIs**를 Supabase Google 화면의 콜백과 대조하고 저장. `http/https`, 프로젝트 ref, `/auth/v1/callback`, 마지막 `/`까지 확인 |
| `invalid_client` 또는 공급자 토큰 교환 실패 | Supabase Google의 Client ID·Secret이 같은 웹 클라이언트의 전체 값인지 확인. 별표·Secret 끝 네 글자·다른 프로젝트 키를 입력하지 않았는지 확인 |
| Secret 전체 값을 다시 볼 수 없음 | 생성 시 보관한 값 확인. 없으면 해당 클라이언트의 Secret 교체 기능으로 발급하고 Supabase 설정 갱신. 실제 Secret을 게시판에 올리지 않음 |
| `org_internal`, `access_denied`, 조직에서 차단 | Audience의 Internal/External·현재 Google 계정·추가 scope·조직 관리자 정책 확인. Testing이면 실습 계정을 Test users에 추가. 기본 로그인 범위의 테스트 사용자 예외는 3-3 B절 참고 |
| 동의 화면에 Supabase 프로젝트 도메인이 보임 | 기본 Supabase 도메인으로 인증을 중계하는 흐름인지 확인. 앱 이름·로고의 공개 표시·브랜드 검증은 별도 설정이며, localhost나 `supabase.co`를 본인 소유 도메인으로 허위 등록하지 않음 |

### 네이버 키 발급·로그인 오류

| 증상 | 해결 순서 |
| --- | --- |
| 서비스 환경 입력란이 안 보임 | 사용 API에서 **네이버 로그인**을 선택했는지 확인 → 로그인 오픈 API 서비스 환경에서 **PC 웹** 추가 |
| 개발 중 앱에서 다른 계정 로그인이 안 됨 | 앱의 **멤버 관리 → 테스터 ID 등록**에 현재 네이버 아이디가 있는지 확인. 앱 소유 계정과 브라우저의 네이버 로그인 계정을 구별 |
| 등록하지 않은 Callback URL 또는 요청 오류 | **API 설정 → PC 웹 → 네이버 로그인 Callback URL**을 `auth:check`의 `providerCallback`과 대조. React `/auth/callback`과 구분 |
| `auth:setup-naver`가 키를 설정하라고 함 | 서버 폴더·서버 `.env`의 두 NAVER 변수 확인. 예시 문자열 `your_client_...`를 실제 발급값으로 교체하고 재실행 |
| 기존 공급자 종류·Client ID가 다르다고 중단 | 이전에 연결한 네이버 앱의 Client ID 확인. 사용자 identity가 연결된 공급자를 삭제해 해결하지 않음 |
| `auth:check`에서 네이버 항목이 `false` | 서버가 같은 Supabase 프로젝트를 가리키는지 확인 → 올바른 앱 키로 setup 명령 실행 → `custom:naver`, issuer·openid·PKCE·email_optional 점검 |
| 설정은 모두 `true`인데 로그인 실패 | 네이버 Secret·테스트 계정·콜백·공급자 오류를 확인. 설정 점검은 Secret 유효성 검사가 아님. Supabase 왼쪽 **Logs → 로그 유형 Auth**에서 실패 시각의 로그 확인 후 비밀값을 가리고 문의 |
| 로그인했는데 이메일은 미제공·이름은 사용자 | 이 실습의 네이버 OIDC ID 토큰에는 이름·이메일이 없음. 대시보드에서 표시 이름을 저장하고 UUID·제보·권한 검증 진행 |

### 두 공급자 공통 확인

| 증상 | 해결 순서 |
| --- | --- |
| 로그인 버튼이 계속 비활성화됨 | `http://localhost:3000/api/auth/providers`의 활성 여부 확인 → 서버·클라이언트가 같은 Supabase 프로젝트인지 확인 → 저장 후 최대 60초 뒤 로그인 상태 다시 확인 |
| 인증 후 엉뚱한 주소·3000번 포트로 돌아감 | Supabase URL Configuration의 Site URL·Redirect URLs 확인. Site URL은 React의 5173번 포트, Express는 API의 3000번 포트 |
| 콜백에서 code 교환 실패·세션 없음 | 로그인 시작·복귀의 origin과 브라우저가 같은지 확인. `localhost`와 `127.0.0.1`을 중간에 바꾸거나, 인증 중 브라우저 저장소를 지우거나, code가 붙은 콜백 주소를 재사용하지 않음. 앱 로그인 화면에서 새로 시작 |
| 배포 앱에서 콜백 404 | Vercel SPA rewrite 확인 → 실제 배포 origin의 `/auth/callback`을 Supabase 허용 목록에 추가. Google origin과 네이버 서비스 URL도 배포 주소에 맞춤 |
| 로그인 취소 후 오류 안내가 나옴 | 예상한 실패 처리임. 취소한 로그인은 완료 증거로 계산하지 않고 로그인 화면에서 다시 시도 |

공식 참고: [이메일 인증](https://supabase.com/docs/guides/auth/passwords), [세션 이벤트](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
