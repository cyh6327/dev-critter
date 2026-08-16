# Dev Critter — Concept Note

## 1. 프로젝트 개요

**Dev Critter**는 GitHub 프로필 README를 정적인 자기소개가 아니라 **개발자의 가장 최근 상태가 반영되는 작은 공개 작업실**처럼 만든다.

사용자는 로컬 CLI 또는 선택형 Desktop Tray에서 상태를 변경한다.

```bash
dev-critter focus
dev-critter break
dev-critter offline
```

Desktop Tray에서는 `Focus`, `Break`, `Offline` 메뉴를 선택한다. 두 클라이언트는 동일한 `POST /api/status` endpoint와 `STATUS_TOKEN` 인증 규칙을 사용한다.

현재 상태는 사용자가 다른 상태로 직접 변경할 때까지 유지된다.

MVP의 기본 전달 구조는 **GitHub 저장소의 SVG를 매번 커밋하는 방식이 아니라, README가 외부의 고정 SVG URL을 참조하는 방식**을 사용한다.

```text
CLI 또는 Tray에서 상태 변경
→ 외부 상태 저장소의 current state 갱신
→ README는 항상 같은 SVG URL 참조
→ SVG endpoint가 가장 최근 state를 읽어 SVG 반환
```

따라서 상태를 바꿀 때마다 GitHub 프로필 저장소에 커밋할 필요는 없다.

---

## 2. MVP 범위

현재 구현에서는 장기 상태 3개만 다룬다.

- `focus`
- `break`
- `offline`

GitHub Issue, PR, Push 등에서 발생하는 **일시 이벤트 연동은 추후 기능**으로 남긴다.

즉 MVP의 상태 모델은 단순하다.

```text
focus  ────────┐
break  ────────┼─ 사용자가 CLI로 다른 상태를 선택하기 전까지 유지
offline ───────┘
```

상태와 함께 마지막 변경 시각도 기록한다.

```json
{
  "status": "focus",
  "updatedAt": "2026-08-07T04:08:00Z"
}
```

### 구현 반영 요약

- **유지:** `focus / break / offline` 상태 모델, 절대 UTC 관찰 시각, Private Vercel Blob 저장, 고정 SVG endpoint와 10분 원본 캐시 정책
- **수정:** 초기 CLI 단일 진입점 전제를 CLI 또는 Desktop Tray 선택 구조로 확장
- **추가:** Java 표준 `SystemTray` 기반 메뉴, 로컬 설정 저장, 마지막으로 성공한 Tray 상태 복원, API 실패 시 기존 표시 유지
- **패키징:** Windows와 macOS에서 같은 Java 소스로 self-contained app image를 생성하며 최종 사용자는 Java/JDK를 별도로 설치하지 않음
- **제외:** Linux Tray 패키징, 자동 시작·업데이트, 코드 서명·공증, CLI 등 다른 경로에서 변경된 상태의 Tray 자동 동기화

---

## 3. 상태 의미와 실시간성

이 프로젝트는 엄밀한 의미의 **real-time presence**를 목표로 하지 않는다.

GitHub README의 외부 이미지는 GitHub 이미지 프록시/캐시를 거치며, 이미 열려 있는 프로필 페이지가 상태 변경을 감지해 자동으로 다시 로드되지는 않는다.

따라서 의미를 다음처럼 정의한다.

> **“현재 반드시 이 상태다”가 아니라 “가장 최근 관찰된 개발 상태가 이렇다.”**

예:

```text
status            : FOCUS
last observation  : 07 Aug 2026 · 04:08 UTC
```

이렇게 하면 오래 열려 있던 페이지에 이전 상태가 남아 있어도, 표시된 시각 자체가 정보의 기준점이 된다.

### Timestamp policy

모든 상태 시각은 **UTC로 저장하고 UTC로 표시한다.** 특정 방문자 국가의 현지 시간으로 변환하지 않는다.

```text
All timestamps are recorded and displayed in UTC.
```

공개 SVG에는 상대시간(`2 min ago`) 대신 **절대 UTC 시각**을 사용한다. 상대시간은 이미 열린 SVG가 갱신되지 않을 때 시간이 멈춘 것처럼 보여 최신성을 오해하게 만들 수 있기 때문이다.

```text
status            : FOCUS
last observation  : 07 Aug 2026 · 04:08 UTC
```

표시 형식은 국가별 숫자 날짜 표기 차이를 피하기 위해 `DD Mon YYYY · HH:MM UTC`를 기본으로 한다. 내부 데이터도 ISO 8601 UTC(`...Z`)를 기준으로 유지한다.

이 정책의 목적은 방문자별 편의 시간대를 제공하는 것이 아니라, **누구에게나 동일하고 변하지 않는 관찰 기준 시각을 제공하는 것**이다.

### 기대 동작

```text
A가 프로필 방문 → FOCUS + 해당 관찰의 UTC 시각 표시
이후 CLI 또는 Tray로 BREAK 변경
B가 곧바로 방문 → 캐시가 유효하면 이전 FOCUS 기록이 표시될 수 있음
캐시 만료 후 새 요청 → BREAK + 새 UTC 시각 표시
A의 이미 열린 페이지 → 새로고침 전까지 이전 FOCUS 기록이 남아 있을 수 있음
```

즉 핵심 UX는 다음이다.

> **방문자는 최근 관찰 상태와 그 관찰 시각을 함께 보며, 상태 변경은 짧은 캐시 지연 후 README에 반영될 수 있다.**

이 특성은 기술적 한계라기보다 `SPECIMEN LOG` 세계관과 자연스럽게 연결한다.

---

## 4. 비주얼 콘셉트

### Mini Lab Specimen

전체 SVG는 **작은 생물을 관찰하는 연구 기록 / 실험체 관찰 카드**를 모티브로 한다.

중심 캐릭터는 사용자의 치비 캐릭터가 아니라, 사용자를 느슨하게 대변하는 **작고 엉뚱한 ASCII 고양이**다.

```text
    /\_/\
   ( o.o )
    > ^ <
    /| |\
   (_| |_)~~~~
```

캐릭터를 RPG 캐릭터처럼 직접 설명하기보다, 정체를 알 수 없는 작은 생물처럼 관찰한다.

전체 톤은 다음 대비를 이용한다.

```text
위쪽   : 하찮고 귀여운 고양이 행동
아래쪽 : 지나치게 진지한 임상 관찰 기록
```

---

## 5. 기본 SVG 레이아웃

세로형의 정돈된 SVG 카드 스타일을 기본 방향으로 한다.

```text
┌──────────────────────────────────────────────────┐
│ SPECIMEN LOG                                    │
│ subject          : small coding organism        │
│ status           : FOCUS / BREAK / OFFLINE      │
│ habitat          : local workstation            │
│ last observation : DD Mon YYYY · HH:MM UTC       │
├──────────────────────────────────────────────────┤
│                                                  │
│               observation chamber               │
│                                                  │
│           ASCII 고양이 애니메이션               │
│                                                  │
│           의성어 / 짧은 나레이션                │
│                                                  │
├──────────────────────────────────────────────────┤
│ NOTE                                             │
│                                                  │
│ 행동을 지나치게 진지하게 해석하는 한두 문장     │
│                                                  │
├──────────────────────────────────────────────────┤
│ OBSERVATION                                      │
│                                                  │
│ 현재 장면에서 관찰된 특성을 기록                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 영역별 역할

#### 캐릭터 + 나레이션

**사건 자체를 보여준다.**

- `tap tap tap...`
- `WARM SUNSPOT FOUND!`
- `ACTIVITY NOT DETECTED`
- 포켓몬식 상황 메시지
- 고양이 POV의 짧은 발견/반응

#### NOTE

**캐릭터의 행동을 외부 관찰자가 건조하게 해석한다.**

예:

> "Productive activity ceased immediately following exposure to direct sunlight."

#### OBSERVATION

**객관적 데이터처럼 보이지만 사실은 이상하게 구체적인 관찰값**을 기록한다.

RPG 스탯처럼 고정된 `FOCUS 92 / ENERGY 61`을 반복하지 않는다.

```text
gaze fixation ........... sustained
keyboard activity ....... repetitive
response latency ........ elevated
bug hostility ........... severe
```

장면마다 항목 자체가 달라질 수 있다.

---

## 6. 표현 원칙

### 나레이션과 NOTE는 같은 말을 반복하지 않는다

좋지 않은 예:

```text
WARM SUNSPOT FOUND!

NOTE
"The specimen found a warm sunspot."
```

좋은 예:

```text
WARM SUNSPOT FOUND!

NOTE
"Productive activity ceased immediately following
 exposure to direct sunlight."
```

정리하면:

> **나레이션은 사건을 말하고, NOTE는 사건을 해석한다.**

### OBSERVATION은 상태별 고정 스탯이 아니다

예를 들어 햇볕을 쬐는 장면이라면:

```text
coding activity ......... absent
body temperature ........ optimal
movement ................. minimal
sun affinity ............. extreme
return urgency ........... none
```

집중하는 장면이라면:

```text
gaze fixation ........... sustained
keyboard activity ....... repetitive
response latency ........ elevated
snack interest .......... suppressed
bug hostility ........... severe
```

이 방식은 기존 RPG 스탯 카드와 시각적·개념적으로 거리를 두면서, Mini Lab Specimen이라는 세계관에도 더 자연스럽다.

---

## 7. 상태별 방향

### FOCUS

고양이가 모니터나 키보드에 이상할 정도로 집중한다.

가능한 행동:

- 빠르게 타이핑
- 모니터 응시
- 특정 버그에 집착
- 주변 자극 무시

가능한 나레이션:

```text
*tap tap tap...*

TARGET LOCKED
```

NOTE 후보:

- "Extended eye contact with the monitor has been observed."
- "External communication attempts are no longer effective."
- "The specimen appears calm, but is internally fighting one stubborn bug."

OBSERVATION 후보:

```text
gaze fixation ........... sustained
keyboard activity ....... repetitive
response latency ........ elevated
snack interest .......... suppressed
bug hostility ........... severe
```

---

### BREAK

고양이가 생산성과 직접 관계없는 편안한 자극으로 이동한다.

가능한 행동:

- 햇볕 쬐기
- 낮잠
- 커피 냄새 추적
- 간식 먹기
- 알림 무시하기

가능한 나레이션:

```text
WARM SUNSPOT FOUND!
```

NOTE 후보:

- "No coding activity detected. Crumbs may be present."
- "Recovered slightly after exposure to coffee."
- "Attention has migrated to non-essential but comforting objects."
- "Productive activity ceased immediately following exposure to direct sunlight."

OBSERVATION 후보:

```text
coding activity ......... absent
body temperature ........ optimal
movement ................. minimal
sun affinity ............. extreme
return urgency ........... none
```

---

### OFFLINE

고양이가 휴면 상태에 들어가거나 관찰 구역에서 사실상 사라진다.

가능한 행동:

- 웅크리고 잠들기
- `zzZ`
- 빈 관찰실
- 반응 없음

가능한 나레이션:

```text
ACTIVITY NOT DETECTED

zzZ...
```

NOTE 후보:

- "Specimen not currently available for public viewing."
- "Consciousness suspected elsewhere."
- "System has entered an unhelpfully silent state."

OBSERVATION 후보:

```text
keyboard activity ....... none
response latency ........ indefinite
eye contact .............. unavailable
energy conservation ..... active
location confidence ..... questionable
```

---

## 8. ASCII 목업 예시

### FOCUS

```text
┌──────────────────────────────────────────────────┐
│ SPECIMEN LOG #01                                │
│ subject          : small coding organism        │
│ status           : FOCUS                        │
│ habitat          : local workstation            │
│ last observation : 07 Aug 2026 · 04:08 UTC       │
├──────────────────────────────────────────────────┤
│                                                  │
│               observation chamber               │
│                                                  │
│                      [ monitor ]                 │
│                      [  >_     ]                 │
│                                                  │
│          tap tap tap...                          │
│                                                  │
│              /\_/\                               │
│             ( o.o )                              │
│              > ^ <                               │
│              /| |\                               │
│             (_| |_)~~~~                          │
│                                                  │
│                 TARGET LOCKED                    │
│                                                  │
├──────────────────────────────────────────────────┤
│ NOTE                                             │
│                                                  │
│ "Extended eye contact with the monitor has been │
│  observed. External communication attempts are  │
│  no longer considered effective."               │
│                                                  │
├──────────────────────────────────────────────────┤
│ OBSERVATION                                      │
│                                                  │
│ gaze fixation ........... sustained              │
│ keyboard activity ....... repetitive             │
│ response latency ........ elevated               │
│ snack interest .......... suppressed             │
│ bug hostility ........... severe                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

### BREAK — 햇볕 자리 발견

```text
┌──────────────────────────────────────────────────┐
│ SPECIMEN LOG #02                                │
│ subject          : small coding organism        │
│ status           : BREAK                        │
│ habitat          : local workstation            │
│ last observation : 07 Aug 2026 · 04:42 UTC       │
├──────────────────────────────────────────────────┤
│                                                  │
│               observation chamber               │
│                                                  │
│              WARM SUNSPOT FOUND!                 │
│                                                  │
│          ☀                                       │
│           \                                      │
│            \    /\_/\                            │
│                ( -.- )     purrrr...             │
│                 > ^ <                            │
│                 /| |\                            │
│                (_| |_)~~~~                       │
│                                                  │
│              PRODUCTIVITY LOST                   │
│                                                  │
├──────────────────────────────────────────────────┤
│ NOTE                                             │
│                                                  │
│ "Productive activity ceased immediately         │
│  following exposure to direct sunlight."        │
│                                                  │
├──────────────────────────────────────────────────┤
│ OBSERVATION                                      │
│                                                  │
│ coding activity ......... absent                 │
│ body temperature ........ optimal                │
│ movement ................. minimal               │
│ sun affinity ............. extreme               │
│ return urgency ........... none                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### OFFLINE

```text
┌──────────────────────────────────────────────────┐
│ SPECIMEN LOG #03                                │
│ subject          : small coding organism        │
│ status           : OFFLINE                      │
│ habitat          : local workstation            │
│ last observation : 07 Aug 2026 · 14:18 UTC       │
├──────────────────────────────────────────────────┤
│                                                  │
│               observation chamber               │
│                                                  │
│              ACTIVITY NOT DETECTED               │
│                                                  │
│                     zzZ                          │
│             /\_/\                                │
│            ( u.u )                               │
│             > ^ <                                │
│             /| |\                                │
│            (_| |_)~~~~                           │
│                                                  │
│            SPECIMEN UNRESPONSIVE                 │
│                                                  │
├──────────────────────────────────────────────────┤
│ NOTE                                             │
│                                                  │
│ "Consciousness is suspected to be occurring     │
│  elsewhere."                                    │
│                                                  │
├──────────────────────────────────────────────────┤
│ OBSERVATION                                      │
│                                                  │
│ keyboard activity ....... none                   │
│ response latency ........ indefinite             │
│ eye contact .............. unavailable            │
│ energy conservation ..... active                 │
│ location confidence ..... questionable           │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 9. SVG 애니메이션 방향

애니메이션은 자연스럽고 부드러운 움직임보다 **옛날 게임기나 다마고치처럼 툭툭 바뀌는 방식**이 어울린다.

예:

```text
frame 1  기본 자세
frame 2  눈 변화
frame 3  앞발/몸 위치 변화
frame 4  의성어 등장
frame 5  잠깐 정지
→ 반복
```

캐릭터는 ASCII라는 정체성을 유지하고, 상태에 따라 몇 글자 또는 줄의 위치가 바뀌는 정도의 단순한 움직임을 사용한다.

이 프레임 애니메이션은 상태 갱신과 별개다.

```text
상태 변경     : CLI 또는 Tray → 외부 state 갱신
SVG 애니메이션: 반환된 SVG 내부 CSS/SMIL이 자체 반복
```

---

## 10. SVG 전달 구조

README는 한 번만 공개 SVG URL을 등록한다.

```md
![developer status](https://dev-critter.vercel.app/specimen.svg)
```

이 URL 자체는 상태가 바뀌어도 유지된다.

```text
CLI ───────┐
           ├─ 상태 변경 API → current state 저장
Tray ──────┘

GitHub README
 └─ GET /specimen.svg
        ↓
   current state 읽기
        ↓
   해당 상태의 SVG 문자열 렌더링
        ↓
   image/svg+xml 응답
```

### 상태 변경에는 GitHub 커밋이 필요하지 않다

SVG 파일을 프로필 저장소 안에서 직접 덮어쓰는 방식은 사용하지 않는다.

```text
❌ status 변경 → SVG 파일 수정 → git commit → push

✅ status 변경 → 외부 state만 갱신
               README의 SVG URL은 그대로
```

### 캐시 정책

SVG endpoint는 완전한 실시간성보다 **적당한 최신성과 비용 효율의 균형**을 우선한다.

MVP에서는 동일한 SVG 응답을 최대 약 10분 동안 재사용할 수 있도록 캐시 정책을 설정한다.

```http
Cache-Control: public, max-age=600
```

즉 상태를 변경한 직후에는 GitHub/Camo에 이전 SVG가 잠시 남아 있을 수 있으며, 새 상태가 즉시 반영되는 것을 보장하지 않는다.

```text
상태 변경
→ 외부 state는 즉시 갱신
→ GitHub README에는 캐시된 이전 SVG가 잠시 표시될 수 있음
→ 캐시가 만료되고 원본이 다시 조회되면 최신 상태 반영
```

이 프로젝트는 엄밀한 real-time presence를 목표로 하지 않으므로, 최대 수 분 정도의 표시 지연은 허용한다. 대신 불필요한 SVG Function 실행과 상태 저장소 조회를 줄이는 방향을 택한다.

단, `max-age=600`은 원본 서버가 제시하는 캐시 유효 시간이며, GitHub/Camo가 정확히 10분마다 갱신된다는 보장을 의미하지는 않는다.

그래서 SVG 자체에 `last observation`을 **절대 UTC 시각**으로 표시한다. 이전 상태가 잠시 남아 있더라도 방문자는 해당 상태가 언제 관찰된 기록인지 확인할 수 있다.


### 배포 및 상태 저장 구조

MVP는 **Vercel Function + Private Vercel Blob** 구조로 운영한다.

배포 주소:

```text
https://dev-critter.vercel.app
```

전체 구조는 다음과 같다.

```text
Local CLI ─────┐
               ├─ POST /api/status
Desktop Tray ──┘          │
                          ▼
         Vercel
┌─────────────────────────┐
│ 상태 변경 Function      │
│          ↓              │
│ Private Vercel Blob     │
│     state.json          │
│          ↓              │
│ SVG 제공 Function       │
│   GET /specimen.svg     │
│          ↓              │
│     SVG render          │
└─────────────────────────┘
    ▲
    │
GitHub README
```

상태 변경 시 선택한 로컬 클라이언트가 Vercel의 `POST /api/status` endpoint에 요청을 보내고, Function은 최신 관찰 상태를 Private Vercel Blob의 `state.json`에 저장한다.

CLI는 `DEV_CRITTER_URL`과 `STATUS_TOKEN`을 프로세스 환경에서 읽는다. Tray는 Settings 창에서 같은 두 값을 입력받아 Java Preferences에 로컬 저장한다. Tray는 API 요청이 성공한 경우에만 표시 상태와 로컬 복원 상태를 갱신한다.

저장 데이터는 현재 상태와 마지막 변경 시각만 가진다.

```json
{
  "status": "focus",
  "updatedAt": "2026-08-07T04:08:00Z"
}
```

GitHub README는 상태 변경과 관계없이 다음 고정 SVG endpoint를 참조한다.

```text
https://dev-critter.vercel.app/specimen.svg
```

`GET /specimen.svg` 요청을 받은 Vercel Function은 Private Vercel Blob의 최신 `state.json`을 읽고, 해당 상태와 관찰 시각에 맞는 SVG를 동적으로 렌더링하여 반환한다.

Private Blob 자체는 README에 직접 노출하지 않는다. 상태 저장은 서버 내부 책임으로 두고, 외부에는 상태 변경 endpoint와 공개 SVG endpoint만 제공한다.

```text
POST /api/status
    → current state 갱신

GET /specimen.svg
    → current state 조회
    → 상태별 SVG 렌더링
    → image/svg+xml 반환
```


---

## 11. 저작권/디자인 독립성

초기 영감은 다른 캐릭터 카드에서 출발했지만, 결과물은 구체적인 표현 구조를 별도로 설계한다.

유지하는 것은 추상적인 아이디어뿐이다.

- 작은 캐릭터
- 짧은 설명문
- 상태 정보를 함께 보여주는 카드

대신 다음 요소는 독자적으로 구성한다.

- Mini Lab Specimen 세계관
- ASCII 고양이
- observation chamber
- 행동 나레이션
- `NOTE`
- 고정 RPG 스탯 대신 장면별 `OBSERVATION`
- `last observation` 기반의 관찰 기록 의미
- 임상 보고서형 문체
- 다마고치식 움직임

핵심 정체성은 다음과 같다.

> **“개발자의 가장 최근 상태를 작은 ASCII 고양이 실험체의 관찰 기록으로 보여준다.”**

---

## 12. 추후 확장 아이디어 — 현재 범위 밖

GitHub 활동을 감지해 일시적인 사건을 추가하는 아이디어가 있다.

예:

```text
focus
+
issue opened
↓
집중 중인 고양이에게
A WILD BUG APPEARED!
```

다만 이 기능은 MVP에서 구현하지 않는다.

향후 도입한다면:

- 장기 `state`: `focus / break / offline`
- 일시 `event`: Issue, PR, Push, Release 등

으로 서로 분리하는 방향을 고려한다.

현재는 **CLI 또는 Desktop Tray를 통한 장기 state 토글, 마지막 관찰 시각, 그에 따른 SVG 표현과 전달 구조**까지 구현되어 있다.
