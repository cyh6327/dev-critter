# Dev Critter

[English](README.md) | **한국어**

Dev Critter는 GitHub 프로필 README를 개발자의 **가장 최근 관찰 상태**가 반영되는 작은 공개 작업 공간으로 바꿔준다.

로컬 CLI 또는 선택형 Desktop Tray에서 상태를 변경할 수 있다.

CLI:

```bash
dev-critter focus
dev-critter break
dev-critter offline
```

Desktop Tray:

- tray/menu bar에서 `Focus`, `Break`, `Offline` 선택
- `Settings...`에서 배포 URL과 상태 토큰 설정
- 마지막으로 성공한 Tray 상태를 재실행 시 복원

현재 상태는 외부에 저장되고 고정된 SVG endpoint를 통해 렌더링되므로, 상태를 변경할 때마다 GitHub 프로필 저장소에 커밋하거나 push할 필요가 **없다**.

```text
CLI 또는 Desktop Tray
    ↓
상태 변경 API
    ↓
비공개 상태 저장소
    ↓
동적 SVG
    ↓
GitHub README
```

Dev Critter는 실시간 presence를 주장하기보다, 가장 최근 관찰값과 그 UTC 시각을 함께 보여준다.

```text
status            : FOCUS
last observation  : 07 Aug 2026 · 04:08 UTC
```

상태 카드는 ASCII 생물, 건조한 임상 메모, 상태별 관찰 기록을 포함한 작은 실험체 관찰 로그 스타일로 구성된다.

두 클라이언트는 같은 원격 상태를 갱신한다. CLI는 터미널과 스크립트에 적합하고, Tray는 Windows와 macOS에서 지속적으로 사용할 수 있는 데스크톱 조작 경로를 제공한다. 둘 중 하나를 선택해 사용할 수 있으며, 함께 사용할 수도 있지만 다른 클라이언트에서 변경한 상태는 Tray에 자동으로 동기화되지 않는다.

## 예시

<a href="https://github.com/cyh6327">
  <img
    src="./preview/focus-task-replication-preview.svg"
    width="350"
    alt="Dev Critter 예시"
  >
</a>

README 레이아웃에 맞게 `width` 속성으로 표시 크기를 조절할 수 있다.

실제 사용 예시: [GitHub 프로필](https://github.com/cyh6327)

## 빠르게 시작하기

### 1. Vercel 프로젝트 준비

저장소를 clone한 뒤 프로젝트 루트에서 실행한다.

```bash
npm install
npx vercel link
```

Vercel에서 **Private Vercel Blob** 저장소를 생성하고 Dev Critter 프로젝트에 연결한다.

### 2. 상태 토큰 등록 후 Production 배포

랜덤 `STATUS_TOKEN`을 생성한다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

생성한 **같은 값**을 Production과 Development에 등록한 뒤 로컬 환경을 가져오고 배포한다.

```bash
npx vercel env add STATUS_TOKEN production --sensitive
npx vercel env add STATUS_TOKEN development
npx vercel env pull .env.local
npx vercel deploy --prod
```

배포 후 Production 도메인을 확인한다.

```text
https://YOUR-PROJECT.vercel.app
```

### 3. 상태 변경 클라이언트 선택

#### CLI

`.env.local`에 Production 도메인을 추가한다.

```env
DEV_CRITTER_URL=https://YOUR-PROJECT.vercel.app
```

빌드하고 실행한다.

```bash
npm run build:cli
node --env-file=.env.local dist/src/cli.js focus
```

어느 디렉터리에서든 `dev-critter`를 사용하려면 아래 **CLI** 상세 설정을 따른다.

#### Desktop Tray

Windows:

```powershell
.\tray\package-windows.ps1
```

macOS:

```bash
bash tray/package-macos.sh
```

Tray를 실행한 뒤 `Settings...`에 다음 값을 입력한다.

```text
Server URL   : https://YOUR-PROJECT.vercel.app
Status token : YOUR_TOKEN
```

### 4. GitHub README에 카드 추가

```html
<img
  src="https://YOUR-PROJECT.vercel.app/specimen.svg"
  width="350"
  alt="developer status"
>
```

이후 CLI 또는 Tray에서 `focus`, `break`, `offline` 상태를 변경한다.

---

## 요구사항

공통 self-hosting 요구사항:

- Node.js 24.x 및 npm
- Vercel 계정
- Vercel 프로젝트
- 프로젝트에 연결된 Private Vercel Blob 저장소

Dev Critter는 Blob 접근에 Vercel OIDC 인증을 사용한다.  
별도의 `STATUS_TOKEN`은 CLI 또는 Tray의 상태 변경 요청을 인증하는 데 사용된다.

클라이언트별 요구사항:

- **CLI:** 명령을 실행할 컴퓨터의 Node.js 24.x 및 npm
- **Desktop Tray 빌드:** 대상 운영체제의 JDK 17 이상
- **Desktop Tray 최종 사용자:** Java/JDK 설치 불필요. 패키지에 필요한 runtime이 포함됨

Self-contained Tray 패키지는 Windows와 macOS를 지원한다.

## 상세 설정

### Vercel / Blob 설정

#### 1. 의존성 설치

```bash
npm install
```

Vercel CLI는 프로젝트의 개발 의존성으로 설치되므로, 아래 명령은 전역 설치 없이 `npx vercel`을 사용한다.

#### 2. 로컬 프로젝트를 Vercel에 연결

```bash
npx vercel link
```

Dev Critter를 호스팅할 Vercel 프로젝트를 선택한다.

#### 3. Private Vercel Blob 저장소 생성 및 연결

Vercel에서 **Private Vercel Blob** 저장소를 생성하고 Dev Critter 프로젝트에 연결한다.

Dev Critter는 Blob 접근에 Vercel의 OIDC 기반 인증을 사용한다. 기본 설정에서는 장기 `BLOB_READ_WRITE_TOKEN`이 필요하지 않다.

로컬에서 실행할 때 Vercel은 연결된 프로젝트 환경을 통해 임시 `VERCEL_OIDC_TOKEN`을 제공한다. 이 토큰을 직접 생성하거나 저장소에 커밋하지 않는다.

#### 4. 상태 토큰 생성

`POST /api/status`는 별도의 `STATUS_TOKEN`으로 보호되며, 인증된 CLI 또는 Tray만 표시 상태를 변경할 수 있다.

랜덤 토큰 생성:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

생성된 값은 비밀로 유지한다.

#### 5. Vercel에 `STATUS_TOKEN` 추가

생성한 토큰을 Production 환경에 추가한다.

```bash
npx vercel env add STATUS_TOKEN production --sensitive
```

로컬 개발용으로는 **같은 값**을 Development 환경에도 추가한다.

```bash
npx vercel env add STATUS_TOKEN development
```

Preview 배포를 사용할 때만 Preview 환경 설정이 필요하다.

설정된 환경변수는 다음 명령으로 확인할 수 있다.

```bash
npx vercel env ls
```

#### 6. 로컬 개발 환경 가져오기

로컬 개발과 검증에 사용할 Development 환경변수를 내려받는다.

```bash
npx vercel env pull .env.local
```

이 명령은 Vercel에 설정한 Development 환경값을 `.env.local`에 저장한다.

`.env.local`은 Git에서 제외해야 한다.

```gitignore
.env.local
```

#### 7. Production 배포

프로젝트를 Production 환경에 배포한다.

```bash
npx vercel deploy --prod
```

프로젝트에 할당된 안정적인 Production 도메인을 사용한다. 예:

```text
https://YOUR-PROJECT.vercel.app
```

이 도메인은 선택한 상태 변경 클라이언트와 GitHub README 카드 양쪽에서 사용된다.

### CLI

CLI와 Desktop Tray는 같은 Dev Critter 원격 상태를 갱신한다.

```text
POST https://YOUR-PROJECT.vercel.app/api/status
```

작업 방식에 맞는 클라이언트를 선택한다. 둘을 함께 사용할 수도 있지만, Tray는 CLI나 다른 클라이언트에서 변경한 상태를 자동으로 동기화하지 않는다.

CLI는 두 가지 방식으로 사용할 수 있다.

**저장소 안에서 실행**

앞서 만든 `.env.local`에 Production 도메인을 추가한다.

```env
DEV_CRITTER_URL=https://YOUR-PROJECT.vercel.app
```

그다음 Node.js의 `--env-file` 옵션으로 `.env.local`을 명시적으로 불러와 실행한다.

```bash
npm run build:cli
node --env-file=.env.local dist/src/cli.js focus
```

필요에 따라 `focus`를 `break` 또는 `offline`으로 바꾼다.

**전역 명령으로 실행**

어느 디렉터리에서든 `dev-critter`를 사용하려면 빌드 후 링크한다.

```bash
npm run build:cli
npm link
```

전역 `dev-critter` 명령은 `.env.local`을 자동으로 읽지 않는다. 대신 프로세스 환경의 `STATUS_TOKEN`과 `DEV_CRITTER_URL`을 사용한다.

Windows PowerShell:

```powershell
[Environment]::SetEnvironmentVariable("STATUS_TOKEN", "YOUR_TOKEN", "User")
[Environment]::SetEnvironmentVariable("DEV_CRITTER_URL", "https://YOUR-PROJECT.vercel.app", "User")
```

설정 후 새 터미널을 연다.

macOS 또는 Linux shell profile:

```bash
export STATUS_TOKEN="YOUR_TOKEN"
export DEV_CRITTER_URL="https://YOUR-PROJECT.vercel.app"
```

설정 후 다음 명령을 사용할 수 있다.

```bash
dev-critter focus
dev-critter break
dev-critter offline
```

### Desktop Tray

Tray는 Java 표준 `SystemTray` API로 구현되며 외부 Tray dependency를 사용하지 않는다. 패키지는 대상 운영체제에서 빌드해야 한다.

Windows PowerShell:

```powershell
.\tray\package-windows.ps1
```

Windows app image는 `tray/build/package/Dev Critter`에 생성된다. 해당 디렉터리의 `Dev Critter.exe`를 실행한다.

macOS:

```bash
bash tray/package-macos.sh
```

macOS app image는 `tray/build/package/Dev Critter.app`에 생성된다. `Package macOS tray` GitHub Actions workflow도 `macos-latest`에서 app image를 컴파일하고 검증한다.

두 app image에는 HTTPS 암호화 지원을 포함한 Java runtime이 들어 있으므로 최종 사용자는 Java나 JDK를 설치할 필요가 없다.

Tray를 실행한 뒤 `Settings...`에서 다음 값을 입력한다.

- **Server URL:** `https://YOUR-PROJECT.vercel.app`
- **Status token:** Vercel에 설정한 것과 같은 `STATUS_TOKEN`

설정값은 로컬에 저장된다. 상태 선택은 API 요청이 성공한 경우에만 Tray 표시에 반영되며, 인증·네트워크·API 실패 시 기존 표시 상태를 유지한다. 마지막으로 성공한 Tray 상태는 앱 재실행 시 복원된다.

현재 패키지는 코드 서명·공증되지 않았다. Linux 패키징, 자동 시작, 자동 업데이트, 외부 상태 자동 동기화는 현재 범위 밖이다.

`.env.local`, 실제 `STATUS_TOKEN`, 비밀값이 포함된 shell profile은 저장소에 커밋하지 않는다.

### GitHub README 카드

Production SVG endpoint를 GitHub 프로필 README에 임베드한다.

```html
<img
  src="https://YOUR-PROJECT.vercel.app/specimen.svg"
  width="350"
  alt="developer status"
>
```

상태가 변경되어도 SVG URL은 그대로 유지된다. 선택한 클라이언트는 외부에 저장된 상태만 갱신하므로 GitHub 프로필 저장소에는 상태를 바꿀 때마다 새 커밋이 필요하지 않다.

GitHub는 외부 이미지를 캐시할 수 있으므로, 새 상태가 README에 바로 반영되지 않을 수 있다.

### 환경변수

Dev Critter는 다음 인증 경로를 사용한다.

```text
CLI 또는 Desktop Tray
    │
    │ STATUS_TOKEN
    ▼
POST /api/status
    │
    │ Vercel OIDC
    ▼
Private Vercel Blob
```

| 변수 | 용도 | 관리 주체 |
|---|---|---|
| `STATUS_TOKEN` | CLI 또는 Desktop Tray의 상태 변경 요청을 인증 | 사용자 |
| `DEV_CRITTER_URL` | 선택한 클라이언트가 사용할 API origin. self-hosting 시 자신의 Production 배포 주소로 설정 | 사용자 |
| `VERCEL_OIDC_TOKEN` | Blob 접근 시 Vercel 프로젝트를 인증 | Vercel |

`VERCEL_OIDC_TOKEN`은 임시 값이며 Vercel이 관리한다. CLI는 사용자 관리 값 두 개를 환경에서 읽고, Tray는 `Settings...`를 통해 로컬에 저장한다.
`.env.local`이나 실제 토큰 값을 저장소에 커밋하지 않는다.
