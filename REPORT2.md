# 이음(E-EUM) 코드 해설 교과서 — REPORT 2

> **부제**: `src/app` 전체 페이지 심층 분석
> **작성일**: 2026년 4월 19일
> **대상 독자**: 이 문서 하나로 이음의 모든 데이터 흐름을 이해하고 싶은 주니어 개발자

---

## 목차

1. [메인 대시보드 (`page.tsx`)](#1-메인-대시보드--srcapppagetsxhttpssrcapppagetsxhttpssrcapppagetsxhttpssrcapppagetsx)
2. [관리자 페이지 (`admin/page.tsx`)](#2-관리자-페이지--srcappadminpagetsx)
3. [게시판 목록 (`board/page.tsx`)](#3-게시판-목록--srcappboardpagetsx)
4. [주보 페이지 (`bulletin/page.tsx`)](#4-주보-페이지--srcappbulletinpagetsx)
5. [찬양팀 페이지 (`praise/page.tsx`)](#5-찬양팀-페이지--srcapppraisepage)
6. [글로벌 네비게이션 (`TopNav.tsx`)](#6-글로벌-네비게이션--srccomponentstopnavtsx)

---

## 1. 메인 대시보드 — `src/app/page.tsx`

### 핵심 역할

교인이 앱을 열었을 때 **가장 먼저 보는 화면**. Firestore에서 오늘의 말씀, 찬양 콘티, 유튜브 영상, 예배 시간을 실시간으로 구독하여 보여준다. 관리자가 데이터를 수정하면 새로고침 없이 즉시 반영된다.

---

### 1.1 파일 선언부 — Import와 인터페이스

```typescript
"use client";
```

> 이 한 줄이 Next.js App Router에서 **서버 컴포넌트와 클라이언트 컴포넌트를 나누는 경계선**이다.
> `useState`, `useEffect`, 브라우저 이벤트 등 React 훅을 사용하려면 반드시 이 디렉티브가 필요하다.
> 이 파일은 Firestore `onSnapshot`(실시간 리스너)을 사용하므로 클라이언트 컴포넌트여야 한다.

```typescript
import { useState, useEffect } from "react";
import { Clock, Music, ListMusic, Play } from "lucide-react";
import { motion } from "motion/react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
```

- `useState`: 컴포넌트 내부 상태 관리 (로딩 여부, 데이터 저장)
- `useEffect`: 컴포넌트 마운트 시 Firestore 구독 시작, 언마운트 시 구독 해제
- `Clock, Music, ListMusic, Play`: Lucide 아이콘. 트리쉐이킹 덕분에 사용하는 아이콘만 번들에 포함됨
- `motion`: Framer Motion의 React 래퍼. 카드 등장 애니메이션에 사용
- `doc, onSnapshot`: Firestore SDK. 특정 문서를 실시간으로 구독하는 함수
- `db`: Firebase 앱 인스턴스에서 생성한 Firestore 객체
- `Skeleton`: shadcn/ui의 로딩 플레이스홀더 컴포넌트

```typescript
interface ContiItem {
  title: string;        // 곡명 (예: "Way Maker")
  youtubeUrl?: string;  // 유튜브 링크 (선택사항, ?로 optional 표시)
}

interface ServiceItem {
  name: string;   // 예배명 (예: "주일 대예배")
  time: string;   // 시간 (예: "오전 11:00")
  day: string;    // 요일 (예: "매주 일요일")
}

interface DailyWord {
  verse: string;         // 말씀 구절 텍스트
  reference: string;     // 성경 장절 (예: "(시편 104:33)")
  youtubeId?: string;    // 유튜브 영상 ID (선택)
  conti?: ContiItem[];   // 찬양 콘티 배열 (선택)
}
```

> **설계 의도**: TypeScript 인터페이스로 Firestore 문서의 구조를 명시한다.
> Firestore는 스키마가 없는(NoSQL) 데이터베이스이므로, 클라이언트 코드에서
> 인터페이스를 정의해야 타입 안전성을 확보할 수 있다.
> `?` (optional)을 사용하여 관리자가 아직 채우지 않은 필드가 있어도 에러가 나지 않게 한다.

---

### 1.2 기본값(Fallback) 정의

```typescript
const DEFAULT_SERVICES: ServiceItem[] = [
  { name: "주일 대예배", time: "오전 11:00", day: "매주 일요일" },
  { name: "수요 예배", time: "오후 7:30", day: "매주 수요일" },
  { name: "금요 철야", time: "오후 9:00", day: "매주 금요일" },
  { name: "새벽 기도회", time: "오전 5:30", day: "월~토요일" },
];
```

> 이 배열은 **컴포넌트 바깥(모듈 스코프)**에 선언되어 있다.
> 컴포넌트 안에 넣으면 렌더링마다 새 배열 객체가 생성되어 불필요한 메모리 할당이 발생한다.
> 바깥에 두면 모듈 로드 시 1번만 생성되고, 이후 참조만 된다.
>
> 이 기본값은 Firestore에 `worship-schedule/current` 문서가 아직 없을 때 사용된다.
> 처음 배포했을 때 빈 화면이 나오지 않도록 하는 **방어적 설계**.

---

### 1.3 상태(State) 선언

```typescript
export default function Home() {
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [wordLoading, setWordLoading] = useState(true);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [servicesLoading, setServicesLoading] = useState(true);
```

| 상태 | 초기값 | 역할 |
|------|--------|------|
| `dailyWord` | `null` | Firestore에서 받아온 오늘의 말씀 + 유튜브 + 콘티 데이터 |
| `wordLoading` | `true` | 말씀 데이터를 아직 불러오는 중인지 여부 |
| `services` | `DEFAULT_SERVICES` | 예배 시간 배열. DB에 없으면 기본값 사용 |
| `servicesLoading` | `true` | 예배 시간 데이터를 불러오는 중인지 여부 |

> `wordLoading`과 `servicesLoading`을 분리한 이유:
> 두 데이터는 서로 다른 Firestore 문서(`daily-word/current`, `worship-schedule/current`)에서 오므로,
> 도착 시점이 다를 수 있다. 분리하면 먼저 도착한 데이터는 즉시 렌더링하고,
> 아직 안 온 데이터만 Skeleton으로 표시할 수 있다.

---

### 1.4 Firestore 실시간 구독 — 오늘의 말씀

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, "daily-word", "current"),
    (snap) => {
      setDailyWord(snap.exists() ? (snap.data() as DailyWord) : null);
      setWordLoading(false);
    },
    () => {
      setDailyWord(null);
      setWordLoading(false);
    },
  );
  return () => unsubscribe();
}, []);
```

**한 줄씩 해설**:

1. `useEffect(() => { ... }, [])` — 의존성 배열이 빈 배열(`[]`)이므로 **컴포넌트가 처음 마운트될 때 1번만** 실행된다.

2. `onSnapshot(doc(db, "daily-word", "current"), ...)` — Firestore의 `daily-word` 컬렉션에서 `current`라는 ID를 가진 **단일 문서**를 구독한다. 이 문서가 변경되면 콜백이 즉시 호출된다.

3. **성공 콜백** `(snap) => { ... }`:
   - `snap.exists()` — 문서가 존재하는지 확인. 관리자가 아직 데이터를 입력하지 않았다면 `false`.
   - `snap.data() as DailyWord` — 문서 데이터를 TypeScript 인터페이스로 캐스팅. `data()`의 반환 타입은 `DocumentData`(any와 비슷)이므로 명시적 캐스팅이 필요.
   - `setWordLoading(false)` — 데이터가 있든 없든 로딩은 완료.

4. **에러 콜백** `() => { ... }`:
   - 네트워크 에러, 권한 에러 등이 발생했을 때 호출된다.
   - 에러가 나도 앱이 크래시하지 않고, null + 로딩 해제로 gracefully 처리.

5. `return () => unsubscribe()` — **클린업 함수**. 컴포넌트가 언마운트되면(다른 페이지로 이동하면) 리스너를 해제한다. 이걸 빠뜨리면 페이지를 떠난 후에도 Firestore 리스너가 살아있어 **메모리 누수**가 발생한다.

> 🐧 **시니어 개발자 핑구의 코드 리뷰**:
>
> "누트! 아주 좋아! `return () => unsubscribe()`를 절대 빠뜨리면 안 돼.
> 내가 예전에 이거 안 써서 탭 3개 열어놨더니 Firestore 읽기 횟수가 3배로 나왔어.
> 과금 폭탄 맞을 뻔했지... 누트 누트."

---

### 1.5 Firestore 실시간 구독 — 예배 시간

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, "worship-schedule", "current"),
    (snap) => {
      if (snap.exists() && snap.data().services?.length) {
        setServices(snap.data().services as ServiceItem[]);
      }
      setServicesLoading(false);
    },
    () => setServicesLoading(false),
  );
  return () => unsubscribe();
}, []);
```

**이 코드가 말씀 구독과 다른 점**:

- `if (snap.exists() && snap.data().services?.length)` — 문서가 존재하고 **services 배열이 비어있지 않을 때만** state를 업데이트한다.
- 조건을 만족하지 않으면 `setServices`를 호출하지 않는다. 즉, `useState`의 초기값인 `DEFAULT_SERVICES`가 **그대로 유지**된다.
- 이것이 **fallback 패턴**의 핵심이다: DB에 데이터가 없으면 기본값, 있으면 DB 값.

> 🐧 **핑구의 조언**:
>
> "누트! `snap.data().services?.length`에서 `?.`를 쓴 이유를 알겠어?
> Firestore 문서에 `services` 필드 자체가 없을 수도 있거든.
> 그러면 `snap.data().services`가 `undefined`인데,
> `undefined.length`를 하면 TypeError가 터져.
> optional chaining 한 방으로 이걸 막은 거야. 누트~ 센스 있는데?"

---

### 1.6 파생 데이터 및 스타일 상수

```typescript
const conti = dailyWord?.conti ?? [];
const card = "w-full max-w-md mx-auto lg:max-w-none";
```

- `dailyWord?.conti ?? []` — optional chaining과 nullish coalescing 연산자의 조합.
  - `dailyWord`가 `null`이면 `?.`에 의해 `undefined` 반환
  - `undefined ?? []`에 의해 빈 배열 반환
  - 결과적으로 `conti`는 **항상 배열**이 보장됨. `map`을 안전하게 호출할 수 있음.

- `card` — 모든 카드에 적용되는 공통 클래스를 변수로 추출.
  - `max-w-md mx-auto`: 모바일에서 카드 너비를 448px로 제한하고 가운데 정렬
  - `lg:max-w-none`: 데스크톱에서는 그리드 컬럼 너비에 맞게 확장

---

### 1.7 JSX 렌더링 — 이번 주 찬양 유튜브

```tsx
{wordLoading ? (
  <Skeleton className="w-full aspect-video rounded-xl" />
) : dailyWord?.youtubeId ? (
  <iframe
    className="w-full aspect-video rounded-xl shadow-lg"
    src={`https://www.youtube.com/embed/${dailyWord.youtubeId}`}
    title="이번 주 찬양"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  />
) : (
  <div className="w-full flex flex-col items-center justify-center py-10 sm:py-14 text-center">
    <Music className="w-10 h-10 sm:w-12 sm:h-12 text-slate-200 mb-4" />
    <p className="text-lg sm:text-xl font-bold text-slate-400 break-keep">
      이번 주 찬양 플레이리스트가 곧 업데이트됩니다 🎵
    </p>
  </div>
)}
```

> **3단계 조건부 렌더링 패턴** — 이 프로젝트 전체에서 반복적으로 사용되는 핵심 패턴이다:
>
> | 조건 | 렌더링 결과 |
> |------|------------|
> | `wordLoading === true` | Skeleton (로딩 상태) |
> | `dailyWord?.youtubeId`가 존재 | YouTube iframe (정상 데이터) |
> | 그 외 | Empty State 안내 문구 (비어있음) |
>
> 이 패턴은 UX의 세 가지 상태(Loading / Loaded / Empty)를 빠짐없이 처리한다.

- `aspect-video`: Tailwind의 16:9 비율 유지 클래스. 모바일에서도 영상 비율이 깨지지 않음.
- `allow="accelerometer; ..."`: YouTube iframe에 필요한 권한 설정. 없으면 일부 브라우저에서 기능이 제한됨.
- `break-keep`: 한국어 텍스트의 단어 단위 줄바꿈. 음절 중간에서 끊기는 것을 방지.

---

### 1.8 JSX 렌더링 — 찬양 콘티 리스트

```tsx
{conti.map((song, index) => (
  <motion.div
    key={index}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors"
  >
    <span className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-base sm:text-lg">
      {index + 1}
    </span>
    <div className="flex-1 min-w-0">
      <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
        {song.title}
      </h3>
    </div>
    {song.youtubeUrl && (
      <a
        href={song.youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors group"
        title="유튜브에서 듣기"
      >
        <Play
          className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 group-hover:text-red-600 ml-0.5"
          fill="currentColor"
        />
      </a>
    )}
  </motion.div>
))}
```

**핵심 포인트들**:

- `delay: index * 0.05` — 리스트 아이템이 순차적으로 나타나는 **스태거(stagger) 애니메이션**. 첫 번째 곡은 0초, 두 번째는 0.05초, 세 번째는 0.1초 딜레이.

- `min-w-0` — Flexbox에서 텍스트 오버플로우를 올바르게 처리하기 위한 필수 클래스. 이것 없이 `truncate`만 쓰면 flex 아이템이 줄어들지 않아 텍스트가 넘침.

- `{song.youtubeUrl && (...)}` — 유튜브 링크가 있을 때만 재생 아이콘을 렌더링. optional 필드에 대한 조건부 렌더링.

- `target="_blank"` + `rel="noopener noreferrer"` — 새 탭에서 열기 + 보안 처리. `noopener`는 새 탭에서 `window.opener`를 통해 원래 페이지를 조작하는 것을 방지. `noreferrer`는 Referer 헤더 전송을 차단.

- `group` + `group-hover:text-red-600` — Tailwind의 그룹 호버 패턴. 부모(`<a>`)에 `group`을 달고, 자식(`<Play>`)에서 `group-hover:`로 부모의 호버 상태에 반응.

---

### 1.9 JSX 렌더링 — 예배 시간 안내 (Firestore + Fallback)

```tsx
{servicesLoading
  ? [1, 2, 3, 4].map((i) => (
      <div key={i} className="w-full flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-slate-50 space-y-2">
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
    ))
  : services.map((service) => (
      <div
        key={service.name}
        className="w-full flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors"
      >
        <h3 className="text-lg sm:text-xl font-black text-slate-900">
          {service.name}
        </h3>
        <p className="text-lg sm:text-xl font-black text-blue-600 mt-1">
          {service.time}
        </p>
        <p className="text-base sm:text-lg font-bold text-slate-400 mt-0.5">
          {service.day}
        </p>
      </div>
    ))}
```

> 스켈레톤 개수(`[1,2,3,4]`)를 `DEFAULT_SERVICES`의 항목 수(4개)와 맞춘 이유:
> 스켈레톤이 실제 콘텐츠로 교체될 때 **레이아웃 점프(layout shift)**가 최소화된다.
> 스켈레톤 2개만 보여줬다가 4개 항목이 렌더링되면 화면이 갑자기 늘어나서 UX가 나빠진다.

---

## 2. 관리자 페이지 — `src/app/admin/page.tsx`

### 핵심 역할

관리자(승현님)만 접근할 수 있는 **CMS(Content Management System)**. 오늘의 말씀, 유튜브 영상, 찬양 콘티, 예배 시간, 주보 URL을 한 화면에서 관리하고, 하나의 "전체 저장하기" 버튼으로 모든 데이터를 **병렬로 저장**한다.

---

### 2.1 유튜브 ID 추출 유틸리티

```typescript
function extractYoutubeId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // 이미 11자 ID만 입력된 경우 (예: "dQw4w9WgXcQ")
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  // URL에서 ID를 추출하는 정규식
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([^\s&?#]+)/,
  );
  return match?.[1] ?? trimmed;
}
```

**정규식 해설**:

```
(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))
```

| 패턴 | 매칭 대상 |
|------|-----------|
| `youtu\.be\/` | 단축 URL: `https://youtu.be/dQw4w9WgXcQ` |
| `youtube\.com\/watch\?.*v=` | 일반 URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| `youtube\.com\/embed\/` | 임베드 URL: `https://www.youtube.com/embed/dQw4w9WgXcQ` |
| `youtube\.com\/v\/` | 레거시 URL: `https://www.youtube.com/v/dQw4w9WgXcQ` |
| `youtube\.com\/shorts\/` | 쇼츠 URL: `https://www.youtube.com/shorts/dQw4w9WgXcQ` |

`([^\s&?#]+)` — ID 캡처 그룹. 공백, `&`, `?`, `#`이 나올 때까지의 문자열을 캡처.

`match?.[1] ?? trimmed` — 정규식 매칭이 실패하면(`null`) 입력값을 그대로 반환. 혹시 새로운 URL 포맷이 나와도 에러가 나지 않음.

> 🐧 **핑구의 감탄**:
>
> "누트!! 이 함수 하나로 유튜브 URL 5가지 포맷을 모두 처리한다고?
> 관리자(승현님)가 어떤 형태로 복붙하든 알아서 ID를 뽑아주니까
> 어르신 목사님이 써도 실수할 여지가 없겠는데! 누트 누트~ 잘 짰어!"

---

### 2.2 상태(State) 선언 — 멀티 섹션

```typescript
const [verse, setVerse] = useState("");
const [reference, setReference] = useState("");
const [youtubeInput, setYoutubeInput] = useState("");
const [conti, setConti] = useState<ContiItem[]>([]);
const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
const [bulletinUrl, setBulletinUrl] = useState("");
const [dataLoading, setDataLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);
```

> **관리자 페이지는 5개 섹션의 데이터를 한 페이지에서 관리**한다.
> 각 섹션에 로딩 상태를 따로 만들지 않고 `dataLoading` 하나로 통합한 이유:
> 관리자 페이지는 Firestore에서 **3개 문서를 동시에(`Promise.all`)** 가져오므로,
> 모든 데이터가 도착할 때까지 한 번에 Skeleton을 보여주는 것이 더 일관적이다.

---

### 2.3 접근 제어 — 3중 검증

```typescript
useEffect(() => {
  if (authLoading) return;       // 1단계: Auth 확인 중이면 대기
  if (!user) {                    // 2단계: 비로그인이면 홈으로
    router.replace("/");
    return;
  }
  if (!isAdmin) {                 // 3단계: 로그인했지만 관리자가 아니면
    alert("관리자 권한이 없습니다.");
    router.replace("/");
  }
}, [authLoading, user, isAdmin, router]);
```

**3중 검증 흐름도**:

```
authLoading === true?
  ├── YES → 아무것도 안 함 (대기)
  └── NO → user === null?
         ├── YES → router.replace("/") (메인으로)
         └── NO → isAdmin === false?
                ├── YES → alert + router.replace("/")
                └── NO → 정상 접근 허용
```

> `router.replace` vs `router.push`:
> `replace`는 현재 히스토리 항목을 교체한다. 즉, 뒤로가기를 눌러도 `/admin`으로 다시 돌아오지 않는다.
> `push`를 쓰면 뒤로가기 → `/admin` → 다시 리디렉트 → 뒤로가기 → `/admin`... 무한 루프에 빠질 수 있다.

> 🐧 **핑구의 경고**:
>
> "누트! `router.push`를 썼으면 큰일 날 뻔했어.
> 비인가 유저가 뒤로가기를 누를 때마다 alert이 무한으로 뜨거든.
> `replace`를 쓴 건 아주 현명한 선택이야. 누트!"

---

### 2.4 데이터 로드 — 3개 문서 병렬 조회

```typescript
useEffect(() => {
  if (!isAdmin) return;
  (async () => {
    const [wordSnap, scheduleSnap, bulletinSnap] = await Promise.all([
      getDoc(doc(db, "daily-word", "current")),
      getDoc(doc(db, "worship-schedule", "current")),
      getDoc(doc(db, "bulletin", "current")),
    ]);
    if (wordSnap.exists()) {
      const data = wordSnap.data();
      setVerse(data.verse ?? "");
      setReference(data.reference ?? "");
      setYoutubeInput(data.youtubeId ?? "");
      setConti(data.conti ?? []);
    }
    if (scheduleSnap.exists()) {
      const data = scheduleSnap.data();
      if (data.services?.length) {
        setServices(data.services);
      }
    }
    if (bulletinSnap.exists()) {
      setBulletinUrl(bulletinSnap.data().url ?? "");
    }
    setDataLoading(false);
  })();
}, [isAdmin]);
```

**핵심 설계**:

1. **`if (!isAdmin) return`** — 관리자가 아니면 Firestore 읽기를 아예 시도하지 않는다. 불필요한 네트워크 요청과 Firestore 읽기 과금을 방지.

2. **`Promise.all`** — 3개의 `getDoc`을 **병렬로** 실행. 순차 실행(`await` 3번)보다 최대 3배 빠르다.

   ```
   순차: ───[word]───[schedule]───[bulletin]───  (총 ~900ms)
   병렬: ───[word]──────
         ───[schedule]──  (총 ~300ms)
         ───[bulletin]─
   ```

3. **`data.verse ?? ""`** — nullish coalescing으로 `undefined`/`null` 방어. `|| ""`과의 차이: `||`는 빈 문자열(`""`)도 falsy로 처리하지만, `??`는 `null`/`undefined`만 처리. 여기서는 둘 다 동일하게 작동하지만, `??`가 의도가 더 명확하다.

4. **`(async () => { ... })()`** — IIFE(즉시실행 비동기 함수). `useEffect`의 콜백은 async가 될 수 없으므로(Promise를 반환하면 안 됨), 내부에서 IIFE로 감싼다.

> 관리자 페이지는 `onSnapshot`(실시간) 대신 `getDoc`(1회 조회)을 사용한다.
> 관리자가 자기가 수정한 데이터를 실시간으로 볼 필요는 없기 때문.
> 저장 후에는 로컬 state가 이미 최신이므로 추가 조회가 필요 없다.

---

### 2.5 전체 저장 — 3개 문서 병렬 쓰기

```typescript
const handleSave = async () => {
  setSaving(true);
  setSaved(false);
  const youtubeId = extractYoutubeId(youtubeInput);
  const cleanConti = conti.filter((c) => c.title.trim() !== "");
  const cleanServices = services.filter((s) => s.name.trim() !== "");

  await Promise.all([
    setDoc(doc(db, "daily-word", "current"), {
      verse,
      reference,
      youtubeId,
      conti: cleanConti,
    }),
    setDoc(doc(db, "worship-schedule", "current"), {
      services: cleanServices,
    }),
    setDoc(doc(db, "bulletin", "current"), {
      url: bulletinUrl.trim(),
    }),
  ]);

  setYoutubeInput(youtubeId);
  setConti(cleanConti);
  setServices(cleanServices);
  setSaving(false);
  setSaved(true);
  setTimeout(() => setSaved(false), 2500);
};
```

**핵심 설계**:

- **데이터 정제**: 저장 전에 빈 항목을 필터링(`title.trim() !== ""`)하여 Firestore에 쓸데없는 빈 객체가 저장되지 않게 한다.
- **병렬 쓰기**: `Promise.all`로 3개 문서를 동시에 저장. 하나라도 실패하면 전체가 reject되어 `catch`에서 잡을 수 있다.
- **로컬 상태 동기화**: 저장 후 정제된 데이터로 로컬 state를 업데이트(`setConti(cleanConti)`). 이렇게 하면 빈 항목이 UI에서도 즉시 사라진다.
- **토스트 알림**: `setSaved(true)` → 2.5초 후 `setSaved(false)`로 일시적 성공 메시지 표시.

> 🐧 **핑구의 칭찬**:
>
> "누트! `Promise.all`로 병렬 저장한 거 아주 좋아.
> 그리고 저장 전에 `cleanConti = conti.filter(...)`로 빈 항목을 걸러내는 센스!
> DB에 `{ title: "", youtubeUrl: "" }` 같은 쓰레기 데이터가 안 들어가니까
> 메인 페이지에서도 빈 행이 렌더링될 일이 없어. 깔끔해! 누트~"

---

### 2.6 동적 배열 CRUD — 콘티 관리

```typescript
const addContiItem = () =>
  setConti([...conti, { title: "", youtubeUrl: "" }]);

const updateContiItem = (i: number, field: keyof ContiItem, v: string) =>
  setConti(conti.map((c, idx) => (idx === i ? { ...c, [field]: v } : c)));

const removeContiItem = (i: number) =>
  setConti(conti.filter((_, idx) => idx !== i));
```

**배열 불변성(Immutability) 패턴**:

React에서 상태를 업데이트하려면 **새로운 배열**을 만들어야 한다. 기존 배열을 직접 수정(`conti.push(...)`, `conti[i].title = ...`)하면 React가 변경을 감지하지 못해 리렌더링이 일어나지 않는다.

| 동작 | 방법 | 설명 |
|------|------|------|
| **추가** | `[...conti, newItem]` | 스프레드로 기존 항목 복사 + 새 항목 추가 |
| **수정** | `conti.map((c, idx) => idx === i ? {...c, [field]: v} : c)` | map으로 새 배열 생성, 해당 인덱스만 새 객체로 교체 |
| **삭제** | `conti.filter((_, idx) => idx !== i)` | filter로 해당 인덱스를 제외한 새 배열 생성 |

`[field]: v` — computed property name. `field`가 `"title"`이면 `{ title: v }`가 되고, `"youtubeUrl"`이면 `{ youtubeUrl: v }`가 된다. 하나의 함수로 모든 필드를 업데이트할 수 있는 범용 패턴.

---

## 3. 게시판 목록 — `src/app/board/page.tsx`

### 핵심 역할

Firestore `posts` 컬렉션에서 게시글 목록을 **실시간으로 구독**하여 표시. 카테고리 탭(전체/이글/윙윙/청년부) 필터링과 글쓰기 버튼을 제공한다.

---

### 3.1 Firestore 쿼리 — 정렬된 컬렉션 구독

```typescript
useEffect(() => {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
  );
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(data);
      setLoading(false);
    },
    () => setLoading(false),
  );
  return () => unsubscribe();
}, []);
```

**메인 페이지와의 차이점**:

| 메인 페이지 | 게시판 |
|-------------|--------|
| `doc(db, "daily-word", "current")` | `query(collection(db, "posts"), orderBy(...))` |
| **단일 문서** 구독 | **전체 컬렉션** 구독 |
| 특정 ID로 직접 접근 | 쿼리 조건으로 필터링/정렬 |

- `collection(db, "posts")` — `doc()`이 아닌 `collection()`을 사용. 컬렉션의 모든 문서를 대상으로 한다.
- `orderBy("createdAt", "desc")` — 최신 글이 위에 오도록 내림차순 정렬.
- `snapshot.docs.map(...)` — 컬렉션 스냅샷은 `docs` 배열을 포함. 각 doc에서 `id`와 `data()`를 합쳐 하나의 객체로 만든다.
- `{ id: doc.id, ...doc.data() }` — Firestore 문서의 ID는 `data()`에 포함되지 않으므로 별도로 추가해야 한다.

---

### 3.2 클라이언트 사이드 필터링

```typescript
const filtered =
  activeCategory === "all"
    ? posts
    : posts.filter((p) => p.category === activeCategory);
```

> **왜 서버(Firestore)에서 필터링하지 않고 클라이언트에서 할까?**
>
> Firestore에서 `where("category", "==", "eagle")`로 필터링할 수도 있지만:
> 1. 카테고리를 바꿀 때마다 새로운 `onSnapshot` 리스너를 생성/해제해야 한다.
> 2. 카테고리별로 별도의 인덱스가 필요할 수 있다.
> 3. 게시글 수가 수천 건이 아닌 이상, 전체를 클라이언트에 가지고 있는 것이 더 빠르고 부드럽다.
>
> 교회 게시판의 특성상 게시글이 수백 건을 넘기기 어려우므로, 클라이언트 필터링이 최적의 선택이다.

---

### 3.3 카테고리 탭 컴포넌트 — 관심사 분리

```typescript
function CategoryTabs({
  categories: cats,
  activeId,
  onSelect,
}: {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = scrollRef.current?.querySelector("[data-active=true]");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  return (
    <div ref={scrollRef} className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide ...">
      {cats.map((cat) => {
        const isActive = cat.id === activeId;
        return (
          <button
            key={cat.id}
            data-active={isActive}
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 ... ${isActive ? "bg-blue-600 text-white shadow-md" : "bg-white ..."}`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
```

- `data-active={isActive}` — HTML 커스텀 데이터 속성. React state와 DOM 쿼리를 연결하는 브릿지 역할.
- `scrollIntoView({ inline: "center" })` — 활성 탭이 가로 스크롤 영역의 중앙에 오도록 자동 스크롤. 모바일에서 오른쪽 끝에 있는 "청년부" 탭을 누르면 화면 중앙으로 부드럽게 이동.
- `overflow-x-auto scrollbar-hide` — 가로 스크롤은 가능하지만 스크롤바는 숨김. 모바일 UX를 깔끔하게 유지.
- `shrink-0` — Flex 아이템이 줄어들지 않게 고정. 이것 없으면 탭 버튼 텍스트가 줄바꿈되어 찌그러짐.

---

### 3.4 날짜 포맷팅

```typescript
{post.createdAt
  ? format(post.createdAt.toDate(), "yyyy.MM.dd")
  : ""}
```

- `post.createdAt.toDate()` — Firestore `Timestamp` 객체를 JavaScript `Date` 객체로 변환.
- `format(..., "yyyy.MM.dd")` — date-fns로 `2026.04.19` 형태로 포맷팅.
- 삼항 연산자로 `createdAt`이 `null`일 때(문서 생성 직후 `serverTimestamp()`가 아직 반영 안 됐을 때) 빈 문자열 표시.

---

## 4. 주보 페이지 — `src/app/bulletin/page.tsx`

### 핵심 역할

관리자가 Firebase Storage에 올린 주보 파일(PDF 또는 이미지)을 교인에게 보여주는 **스마트 뷰어**. 파일 확장자를 자동 감지하여 적절한 렌더링 방식을 선택한다.

---

### 4.1 파일 타입 감지 함수

```typescript
function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp)/i.test(url.split("?")[0]);
}
```

- `url.split("?")[0]` — Firebase Storage URL에는 인증 토큰이 쿼리 파라미터로 붙는다 (`...png?alt=media&token=abc`). `?` 이전 부분만 추출하여 확장자를 정확히 판별.
- `/i` — 대소문자 무시. `.PNG`, `.Jpg` 등도 매칭.

---

### 4.2 스마트 렌더링 분기

```tsx
{loading ? (
  <div className="p-6 sm:p-10 space-y-4">
    <Skeleton className="w-full h-[600px] rounded-xl" />
  </div>
) : bulletinUrl ? (
  isImageUrl(bulletinUrl) ? (
    <div className="p-4 sm:p-6">
      <img
        src={bulletinUrl}
        alt="이번 주 주보"
        className="w-full h-auto rounded-xl shadow-lg"
      />
    </div>
  ) : (
    <iframe
      src={bulletinUrl}
      title="이번 주 주보"
      className="w-full h-[800px] rounded-b-[2rem]"
    />
  )
) : (
  <div className="p-10 sm:p-16 flex flex-col items-center justify-center text-center min-h-[50vh]">
    ...
    <p ...>이번 주 주보가 아직 등록되지 않았습니다.</p>
  </div>
)}
```

**4단계 조건부 렌더링**:

```
loading?
  └── YES → Skeleton
  └── NO → bulletinUrl 있음?
         └── YES → 이미지 URL?
                └── YES → <img> 렌더링
                └── NO  → <iframe> 렌더링 (PDF)
         └── NO → Empty State
```

- `<img>`: `w-full h-auto`로 원본 비율 유지, `shadow-lg`로 카드 느낌
- `<iframe>`: `h-[800px]`로 PDF 뷰어에 충분한 높이 확보. 브라우저 내장 PDF 뷰어가 iframe 안에서 동작.
- `rounded-b-[2rem]`: 카드 하단 모서리와 iframe 하단 모서리를 맞춤.

> 🐧 **핑구의 코드 리뷰**:
>
> "누트! `url.split('?')[0]`으로 쿼리스트링을 제거한 건 정말 센스 있어.
> Firebase Storage URL이 `...png?alt=media&token=...` 형태거든.
> 이걸 안 하면 `.png?alt=media`가 `.png`로 매칭이 안 돼서
> 이미지인데 PDF 뷰어(iframe)로 열리는 버그가 생겨.
> 꼼꼼하게 잘 잡았어! 누트~"

---

## 5. 찬양팀 페이지 — `src/app/praise/page.tsx`

### 핵심 역할

찬양팀원들이 **When2meet 스타일**로 연습 가능 시간을 투표하는 페이지. 로그인 필수이며, Firestore에서 투표 데이터를 실시간으로 구독하여 히트맵으로 시각화한다.

---

### 5.1 Protected Route — 접근 제어 + 조건부 구독

```typescript
const { user, loading: authLoading } = useAuth();
const router = useRouter();

// 접근 제어: 비로그인 시 메인으로 리다이렉트
useEffect(() => {
  if (authLoading) return;
  if (!user) {
    alert("찬양팀 전용 페이지입니다. 로그인을 먼저 해주세요!");
    router.replace("/");
  }
}, [authLoading, user, router]);

const [votes, setVotes] = useState<VotesMap>({});
const [votesLoading, setVotesLoading] = useState(true);

useEffect(() => {
  if (!user) return;  // ← 핵심: user가 없으면 구독하지 않음
  const unsubscribe = onSnapshot(
    doc(db, "practice-votes", "current-week"),
    (snapshot) => {
      if (snapshot.exists()) {
        setVotes((snapshot.data().votes as VotesMap) ?? {});
      } else {
        setVotes({});
      }
      setVotesLoading(false);
    },
    () => {
      setVotes({});
      setVotesLoading(false);
    },
  );
  return () => unsubscribe();
}, [user]);
```

**`if (!user) return`이 중요한 이유**:

1. 비로그인 유저가 URL을 직접 치고 들어오면 `user`는 `null`이다.
2. `null` 상태에서 Firestore 구독을 시작하면 보안 규칙에 의해 거부되거나, 불필요한 네트워크 요청이 발생한다.
3. `user`가 `null` → `onSnapshot`을 시작하지 않음 → 1번째 `useEffect`의 리디렉트가 작동 → 페이지 이탈.

**의존성 배열 `[user]`의 역할**:
- `user`가 `null` → `undefined`를 반환 (구독 안 함)
- `user`가 로그인 → `user` 객체로 변경 → Effect 재실행 → 구독 시작
- `user`가 로그아웃 → `null`로 변경 → 이전 구독 해제(return) + 새 Effect에서 `return` (구독 안 함)

---

### 5.2 투표 토글 로직 — arrayUnion / arrayRemove

```typescript
const toggleVote = async (slotId: string) => {
  if (!user) {
    alert("로그인이 필요합니다.");
    return;
  }

  const ref = doc(db, "practice-votes", "current-week");
  const current = votes[slotId] ?? [];
  const alreadyVoted = current.includes(voterName);

  if (alreadyVoted) {
    await updateDoc(ref, {
      [`votes.${slotId}`]: arrayRemove(voterName),
    });
  } else {
    await setDoc(
      ref,
      { votes: { [slotId]: arrayUnion(voterName) } },
      { merge: true },
    );
  }
};
```

**한 줄씩 해설**:

1. `votes[slotId] ?? []` — 현재 로컬 state에서 해당 시간대의 투표자 배열을 가져온다. 아직 아무도 투표하지 않았으면 빈 배열.

2. `current.includes(voterName)` — 내 이름이 이미 배열에 있는지 확인. 있으면 "이미 투표함" → 삭제, 없으면 "아직 안 함" → 추가.

3. **삭제 시 `updateDoc` + `arrayRemove`**:
   - `[`votes.${slotId}`]` — Firestore의 **점(dot) 표기법**. 중첩 맵의 특정 키를 직접 수정.
   - `arrayRemove(voterName)` — 배열에서 해당 값을 제거하는 Firestore 원자적 연산.

4. **추가 시 `setDoc` + `merge: true`**:
   - `updateDoc` 대신 `setDoc({ merge: true })`를 사용하는 이유: **문서가 아직 존재하지 않을 수도 있기 때문**.
   - 첫 번째 투표자가 투표할 때 `current-week` 문서가 없을 수 있다. `updateDoc`은 문서가 없으면 에러를 던지지만, `setDoc({ merge: true })`는 문서가 없으면 생성, 있으면 병합.
   - `arrayUnion(voterName)` — 배열에 값을 추가하되, 이미 있으면 중복 추가하지 않는 원자적 연산.

> 🐧 **핑구의 핵심 조언**:
>
> "누트! 여기서 가장 중요한 건 **`arrayUnion`과 `arrayRemove`가 원자적(atomic) 연산**이라는 거야.
> 만약 두 사람이 동시에 같은 시간대에 투표하면? `arrayUnion`은 Firestore 서버에서
> 안전하게 처리해. 클라이언트에서 배열을 읽고 → 추가하고 → 다시 쓰는 방식이었으면
> 동시성 문제(race condition)가 생겼을 거야.
>
> 그리고 삭제할 때 `updateDoc`, 추가할 때 `setDoc({ merge: true })`를 나눈 것도 좋아.
> 문서가 없을 때도 첫 투표가 정상 작동하니까. 누트 누트~"

---

### 5.3 히트맵 스타일 — 투표 인원수에 따른 색상

```typescript
const getHeatmapClass = (v: number) => {
  if (v === 0) return "bg-slate-50";   // 0명: 거의 투명
  if (v <= 2) return "bg-blue-100";    // 1~2명: 연한 파랑
  if (v <= 4) return "bg-blue-300";    // 3~4명: 중간 파랑
  if (v <= 6) return "bg-blue-500";    // 5~6명: 진한 파랑
  return "bg-blue-700";                 // 7명+: 아주 진한 파랑
};
```

> 이 함수는 숫자 → CSS 클래스 변환이다. GitHub의 contribution 그래프와 같은 원리.
> 투표자가 많을수록 셀이 진해지므로, **한눈에 인기 시간대를 파악**할 수 있다.
> 어르신들도 "진한 칸이 사람 많은 거구나"라고 직관적으로 이해할 수 있다.

---

### 5.4 투표 그리드 렌더링

```tsx
{days.map((day) => {
  const slotId = `${day}-${time}`;
  const voters = votes[slotId] ?? [];
  const count = voters.length;
  const isMine = !!voterName && voters.includes(voterName);

  return (
    <button
      key={slotId}
      onClick={() => toggleVote(slotId)}
      title={voters.length > 0 ? voters.join(", ") : "아직 투표 없음"}
      className={`w-full h-20 sm:h-28 rounded-2xl sm:rounded-3xl border-4 transition-all relative overflow-hidden active:scale-95 ${getHeatmapClass(count)} ${
        isMine
          ? "border-blue-900 shadow-md scale-[1.02] z-10"
          : "border-transparent hover:border-blue-200"
      }`}
    >
```

- `title={voters.join(", ")}` — 셀 위에 마우스를 올리면 투표한 사람들의 이름이 툴팁으로 표시. 터치 디바이스에서는 롱프레스로 볼 수 있다.
- `active:scale-95` — 누르는 순간 셀이 살짝 줄어드는 터치 피드백. 모바일에서 "눌렸다"는 느낌을 준다.
- `scale-[1.02]` — 내가 투표한 셀은 2% 확대되어 약간 튀어나온 느낌. 다른 셀과 시각적으로 구분.
- `z-10` — scale로 확대된 셀이 이웃 셀 위에 오도록 z-index 설정.

---

## 6. 글로벌 네비게이션 — `src/components/TopNav.tsx`

### 핵심 역할

모든 페이지의 상단에 고정되는 **네비게이션 바**. Firebase Auth 상태에 따라 메뉴, 프로필, 로그인/로그아웃 버튼을 동적으로 렌더링한다. 데스크톱/모바일 레이아웃을 각각 구현.

---

### 6.1 네비게이션 아이템 — 권한별 분리

```typescript
const publicNavItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/board", label: "게시판", icon: MessageSquareText },
  { href: "/bulletin", label: "주보", icon: Newspaper },
];

const authNavItems = [
  { href: "/praise", label: "찬양팀", icon: Music },
];
```

```typescript
const navItems = [
  ...publicNavItems,
  ...(user ? authNavItems : []),
];
```

> `publicNavItems`는 **모든 사용자**에게, `authNavItems`는 **로그인한 사용자**에게만 표시.
> 스프레드 연산자와 삼항 연산자를 결합하여, `user`가 존재하면 찬양팀 메뉴가 배열에 추가되고,
> 없으면 빈 배열(`[]`)이 스프레드되어 아무것도 추가되지 않는다.
>
> 이 설계의 장점: 나중에 새 메뉴를 추가할 때 적절한 배열에 한 줄만 추가하면 된다.

---

### 6.2 활성 메뉴 판별 로직

```typescript
{navItems.map((item) => {
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(item.href);
  return (
    <Link
      key={item.href}
      href={item.href}
      className={`... ${isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"}`}
    >
```

**왜 단순 `===` 비교가 아닌 `startsWith`를 사용할까?**

| 현재 경로 | `item.href` | `===` | `startsWith` |
|-----------|-------------|-------|--------------|
| `/board` | `/board` | true | true |
| `/board/write` | `/board` | **false** | **true** |
| `/board/abc123` | `/board` | **false** | **true** |

게시판 글쓰기(`/board/write`)나 글 상세(`/board/abc123`) 페이지에 있을 때도 "게시판" 메뉴가 활성화되어야 자연스럽다. `startsWith`를 쓰면 하위 경로에서도 부모 메뉴가 활성 상태로 유지된다.

**예외: 홈(`/`)**:
`/`에 `startsWith`를 적용하면 모든 경로가 매칭된다(`"/board".startsWith("/")` → true). 그래서 홈만 `===`으로 정확히 비교한다.

---

### 6.3 Google 로그인/로그아웃

```typescript
const handleLogin = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

const handleLogout = async () => {
  await signOut(auth);
};
```

- `signInWithPopup` — 팝업 창에서 Google 로그인을 처리. `signInWithRedirect`와 달리 현재 페이지를 벗어나지 않아 UX가 더 부드럽다.
- `signOut` — 로그아웃 시 `useAuth` 훅의 `onAuthStateChanged` 리스너가 자동으로 감지하여 `user`를 `null`로 설정. 별도의 state 업데이트 코드가 필요 없다.

---

### 6.4 프로필 영역 — 데스크톱

```tsx
{user ? (
  <div className="hidden sm:flex items-center gap-2">
    {/* 프로필 — 클릭 시 마이페이지 */}
    <Link href="/mypage" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt={displayName}
          className="w-9 h-9 rounded-full border-2 border-slate-200"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">
          {displayName.charAt(0)}
        </div>
      )}
      <span className="text-sm font-bold text-slate-700 hidden lg:block max-w-[7rem] truncate">
        {displayName}
      </span>
    </Link>

    {/* 관리자 버튼 — isAdmin일 때만 */}
    {isAdmin && (
      <Link href="/admin" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-amber-100 ..." title="관리자">
        <ShieldCheck className="w-4 h-4" />
      </Link>
    )}

    {/* 로그아웃 */}
    <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-100 ..." title="로그아웃">
      <LogOut className="w-4 h-4" />
    </button>
  </div>
) : (
  <button onClick={handleLogin} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 ...">
    <LogIn className="w-4 h-4" />
    구글 로그인
  </button>
)}
```

**조건부 렌더링 계층**:

```
loading 중? → 아무것도 안 보임
  └── user 있음?
       ├── YES → 프로필 사진 + 이름 + (관리자면 관리자 버튼) + 로그아웃
       └── NO  → "구글 로그인" 버튼
```

- `referrerPolicy="no-referrer"` — Google 프로필 이미지 URL은 Referer 헤더가 있으면 403을 반환할 수 있다. 이 속성으로 Referer 전송을 차단하여 이미지가 항상 로드되게 한다.
- `hidden sm:flex` / `hidden lg:block` — 반응형 표시/숨김. 작은 화면에서는 프로필 영역이 너무 좁으므로 이름 텍스트를 숨기고, 햄버거 메뉴에서 보여준다.
- `{isAdmin && (...)}` — 관리자 버튼은 `isAdmin`이 true일 때만 DOM에 추가됨. 일반 유저에게는 아예 렌더링되지 않아 보안이 강화됨.

---

### 6.5 모바일 메뉴 — 조건부 렌더링

```tsx
{mobileOpen && (
  <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-4">
    ...
    {!loading && (
      <div className="mt-2 pt-3 border-t border-slate-100">
        {user ? (
          <div className="space-y-1">
            <Link href="/mypage" onClick={() => setMobileOpen(false)} ...>
              {/* 프로필 */}
            </Link>
            {isAdmin && (
              <Link href="/admin" onClick={() => setMobileOpen(false)} ...>관리자</Link>
            )}
            <button onClick={() => { handleLogout(); setMobileOpen(false); }} ...>로그아웃</button>
          </div>
        ) : (
          <button onClick={() => { handleLogin(); setMobileOpen(false); }} ...>구글 로그인</button>
        )}
      </div>
    )}
  </div>
)}
```

- `onClick={() => setMobileOpen(false)}` — 메뉴 항목을 클릭하면 드롭다운을 닫는다. 이걸 안 하면 페이지가 전환돼도 메뉴가 열린 채로 남아있다.
- `{ handleLogout(); setMobileOpen(false); }` — 로그아웃 시 동시에 메뉴도 닫는다. 두 동작을 하나의 핸들러에서 순서대로 처리.

> 🐧 **핑구의 마지막 코드 리뷰**:
>
> "누트! TopNav가 이 앱의 심장이야. 여기서 Auth 상태 감지, 권한별 메뉴 분기,
> 반응형 레이아웃, 라우팅까지 다 처리하고 있거든.
>
> 내가 특히 좋아하는 부분은 `navItems`를 동적으로 조합하는 패턴이야.
> `[...publicNavItems, ...(user ? authNavItems : [])]` 한 줄로
> 로그인 여부에 따라 메뉴가 자연스럽게 추가/제거되니까
> if문 지옥 없이도 깔끔하게 처리됐어.
>
> 그리고 모바일 메뉴에서 `onClick={() => setMobileOpen(false)}`를
> 모든 메뉴 항목에 빠짐없이 넣은 것도 디테일이 살아있어.
> 이거 빠뜨리면 페이지 전환 후에도 메뉴가 덮여있어서
> 유저가 '앱이 먹통이 됐나?' 하고 당황하거든.
>
> 전체적으로 아주 잘 짰어, 승현아! 누트~ 🐧"

---

## 마치며 — 데이터 흐름 전체 요약

```
[사용자 액션]
     │
     ▼
[TopNav.tsx] ─── Auth 상태 감지 ───▶ [useAuth.ts] ◄── Firebase Auth
     │                                    │
     │ 라우팅                              │ user, isAdmin
     ▼                                    ▼
[각 페이지] ─── onSnapshot ───▶ [Firestore] ◄── [admin/page.tsx]
     │              │                              │
     │          실시간 동기화                    setDoc (저장)
     │              │                              │
     ▼              ▼                              ▼
[React State] → [JSX 렌더링] → [화면 출력]    [3개 문서 병렬 쓰기]
     │
     │ 파일 업로드
     ▼
[Firebase Storage] ← profiles/, posts/, files/
```

이 문서 하나로 이음의 모든 데이터가 어디서 오고, 어디로 가고, 화면에 어떻게 표시되는지 완벽하게 이해할 수 있기를 바란다.

> **Co-Authored-By**: Claude (Anthropic)
> **Last Updated**: 2026-04-19
