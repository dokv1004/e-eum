# 이음(E-EUM) 프로젝트 기술 분석 및 회고 보고서

> **작성일**: 2026년 4월 19일
> **프로젝트**: 이음(E-EUM) — 전 세대가 함께 쓰는 초간단 교회 대시보드
> **개발자**: 전승현 (dokv1004@gmail.com)
> **페어 프로그래밍 파트너**: Claude (AI)

---

## 목차

1. [프로젝트 개요 및 아키텍처](#1-프로젝트-개요-및-아키텍처)
2. [전체 개발 타임라인](#2-전체-개발-타임라인)
3. [핵심 코드 심층 분석](#3-핵심-코드-심층-분석)
4. [핑구의 기술 비유법](#4-핑구pingu의-기술-비유법)
5. [트러블슈팅 및 깃 전략](#5-트러블슈팅-및-깃-전략)

---

## 1. 프로젝트 개요 및 아키텍처

### 1.1 프로젝트 목적

'이음(E-EUM)'은 **어린이부터 디지털에 서툰 노년층까지 전 세대 교인이 함께 쓸 수 있는 교회 대시보드** 앱이다. '이음'이라는 이름처럼 세대와 세대를, 교인과 교회를 이어주는 것이 핵심 철학이다.

기존 교회 앱들이 가진 문제점 — 복잡한 UI, 과도한 기능, 세대별 디지털 리터러시 격차 — 을 해결하기 위해, **초간단 UI**와 **중앙 집중형 대시보드** 구조를 채택했다. 큼직한 카드 UI, 직관적인 아이콘, 최소한의 터치로 모든 정보에 접근할 수 있도록 설계했다.

### 1.2 기술 스택

| 영역 | 기술 | 버전 | 선택 이유 |
|------|------|------|-----------|
| **프레임워크** | Next.js (App Router) | 16.2.3 | SSR/SSG 지원, 파일 기반 라우팅, React 19 호환 |
| **언어** | TypeScript | 5.x | 타입 안전성, 개발 생산성 |
| **UI** | React | 19.2.4 | 최신 Concurrent Features, `use()` 훅 활용 |
| **스타일링** | Tailwind CSS | 4.x | 유틸리티 퍼스트, 빠른 프로토타이핑, 반응형 |
| **컴포넌트** | shadcn/ui | 4.2.0 | 커스텀 가능한 Headless UI 컴포넌트 |
| **애니메이션** | Framer Motion | latest | 선언적 애니메이션, `motion/react` import |
| **아이콘** | Lucide React | 1.8.0 | 경량, 트리쉐이킹 지원, 일관된 디자인 |
| **에디터** | Tiptap | 3.22.4 | Headless, 확장 가능, ProseMirror 기반 |
| **인증** | Firebase Auth | 12.12.0 | Google 소셜 로그인, 빠른 세팅 |
| **데이터베이스** | Cloud Firestore | 12.12.0 | 실시간 동기화, 서버리스 |
| **스토리지** | Firebase Storage | 12.12.0 | 이미지/파일 업로드, CDN 내장 |
| **분석** | Google Analytics 4 | - | 접속자 통계, `@next/third-parties` 연동 |
| **배포** | Vercel | - | Git 푸시 → 자동 빌드/배포, Preview URL |
| **날짜** | date-fns | 4.1.0 | 경량, 트리쉐이킹, 한국어 로케일 |
| **폰트** | Noto Sans KR | - | next/font로 셀프호스팅, 한글 최적화 |

### 1.3 디렉토리 구조

```
src/
├── app/                          # Next.js App Router 페이지
│   ├── layout.tsx                # 루트 레이아웃 (폰트, GA4, TopNav)
│   ├── page.tsx                  # 메인 대시보드 (/)
│   ├── globals.css               # 글로벌 스타일 + Tailwind 설정
│   ├── loading.tsx               # 메인 스켈레톤 UI
│   ├── admin/                    # 관리자 페이지 (/admin)
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── board/                    # 게시판 (/board)
│   │   ├── page.tsx              # 목록
│   │   ├── loading.tsx
│   │   ├── write/page.tsx        # 글쓰기
│   │   └── [id]/page.tsx         # 상세 (동적 라우트)
│   ├── bulletin/                 # 주보 (/bulletin)
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── calendar/                 # 캘린더 (/calendar)
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── mypage/                   # 마이페이지 (/mypage)
│   │   ├── page.tsx
│   │   └── loading.tsx
│   └── praise/                   # 찬양팀 (/praise)
│       ├── page.tsx
│       └── loading.tsx
├── components/
│   ├── TopNav.tsx                # 글로벌 네비게이션 바
│   └── ui/                       # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       └── skeleton.tsx
├── hooks/
│   └── useAuth.ts                # Firebase Auth 커스텀 훅
└── lib/
    ├── firebase.ts               # Firebase 초기화 (App, DB, Auth, Storage)
    └── utils.ts                  # cn() 유틸리티
```

### 1.4 Firestore 데이터베이스 구조

```
Firestore
├── daily-word/                   # 오늘의 말씀 + 찬양
│   └── current                   # 현재 활성 문서
│       ├── verse: string         # "내가 평생토록 여호와께..."
│       ├── reference: string     # "(시편 104:33)"
│       ├── youtubeId: string     # "dQw4w9WgXcQ"
│       └── conti: array          # 찬양 콘티 배열
│           └── [{ title: "Way Maker", youtubeUrl: "https://..." }]
│
├── worship-schedule/             # 예배 시간
│   └── current
│       └── services: array       # 예배 배열
│           └── [{ name: "주일 대예배", time: "오전 11:00", day: "매주 일요일" }]
│
├── bulletin/                     # 주보
│   └── current
│       └── url: string           # Firebase Storage URL (.pdf, .jpg, .png)
│
├── practice-votes/               # 연습 시간 투표
│   └── current-week
│       └── votes: map            # When2meet 스타일
│           ├── "목-오후 6시": ["전승현", "홍길동"]
│           ├── "금-오후 7시": ["전승현"]
│           └── ...
│
├── posts/                        # 게시판 게시글
│   └── {docId}
│       ├── title: string
│       ├── content: string       # Tiptap HTML
│       ├── category: string      # "eagle" | "wingwing" | "youth"
│       ├── authorName: string
│       ├── authorId: string      # Firebase Auth UID
│       └── createdAt: Timestamp
│
└── users/                        # 유저 프로필
    └── {uid}
        ├── displayName: string
        └── photoURL: string
```

### 1.5 Firebase Storage 구조

```
Firebase Storage
├── profiles/                     # 유저 프로필 이미지
│   └── {uid}                     # 유저별 1개 파일 (덮어쓰기)
├── posts/                        # 게시글 이미지
│   └── {timestamp}_{filename}    # 타임스탬프로 유니크
└── files/                        # 게시글 첨부파일
    └── {timestamp}_{filename}
```

### 1.6 접근 권한 매트릭스

| 페이지 | 비로그인 | 일반 유저 | 관리자 |
|--------|----------|-----------|--------|
| 대시보드 (`/`) | O | O | O |
| 캘린더 (`/calendar`) | O | O | O |
| 게시판 목록 (`/board`) | O (읽기만) | O (글쓰기 가능) | O |
| 게시판 글쓰기 (`/board/write`) | X → 리디렉트 | O | O |
| 주보 (`/bulletin`) | O | O | O |
| 찬양팀 (`/praise`) | X → alert + 리디렉트 | O | O |
| 마이페이지 (`/mypage`) | X → 리디렉트 | O | O |
| 관리자 (`/admin`) | X → 리디렉트 | X → alert + 리디렉트 | O |

---

## 2. 전체 개발 타임라인

### 2.1 Phase 0: 기획 및 초기 세팅 (4월 15일)

**Next.js 16 프로젝트 생성 및 기본 구조 확립**

- `create-next-app`으로 Next.js 16 + TypeScript + Tailwind CSS 4 + App Router 프로젝트 생성
- Figma AI가 생성한 초기 UI 코드(`figma-code/`)를 분석하여 App Router 환경으로 마이그레이션
- Noto Sans KR 폰트를 `next/font/google`으로 셀프호스팅 적용
- 교회 테마 컬러 시스템 구축 (파란 계열, `globals.css`에 CSS 변수로 관리)
- 마이그레이션 완료 후 `figma-code/` 폴더 삭제

**핵심 결정**: Figma 코드의 `package.json`이나 config를 루트에 덮어쓰지 않고, `src/` 내부의 컴포넌트 코드만 선별적으로 이식. Vite → Next.js 전환 시 `"use client"` 디렉티브, `next/image`, App Router 컨벤션을 준수.

### 2.2 Phase 1: UI 확장 및 반응형 대응 (4월 16일)

**모바일 퍼스트 레이아웃 구축**

- **모바일 우선순위 시스템**: Tailwind `order` 속성과 `contents` 클래스를 활용하여 모바일에서는 오늘의 말씀 → 예배 시간 → 찬양 → 투표 순서로, 데스크톱에서는 2컬럼 그리드로 렌더링
- **TopNav 컴포넌트 분리**: `next/link` + `usePathname`으로 활성 메뉴 표시, 모바일 햄버거 메뉴 구현
- **신규 페이지 생성**: 게시판(`/board`), 캘린더(`/calendar`), 주보(`/bulletin`)
- **예배 시간 안내 카드** 추가 (주일 대예배, 수요예배, 금요철야, 새벽기도회)
- **찬양팀 뷰 토글**: `isPraiseTeam` mock state로 권한별 UI 테스트

**`loading.tsx` 도입**: App Router의 Suspense 기반 로딩 UI를 활용하여, 각 페이지 폴더에 `loading.tsx` 파일을 생성. shadcn의 `Skeleton` 컴포넌트로 실제 레이아웃과 유사한 스켈레톤 UI를 구성.

### 2.3 Phase 2: Firebase 기초 공사 (4월 16일)

**Firebase SDK 연동 및 보안 설계**

- `firebase` 패키지 설치 및 `src/lib/firebase.ts` 초기화 코드 작성
- `.env.local`에 7개 환경 변수 템플릿 생성 (`.env*`는 `.gitignore`에 포함되어 Git에 노출되지 않음)
- `getApps()` 체크로 중복 초기화 방지 (Hot Reload 시 Firebase 인스턴스 재생성 방지)
- Firestore `db`, Auth `auth` export

### 2.4 Phase 3: 실시간 데이터 연동 (4월 16~17일)

**오늘의 말씀 → Firestore 실시간 전환**

- 하드코딩된 말씀 텍스트를 제거하고, `onSnapshot`으로 `daily-word/current` 문서를 실시간 구독
- 로딩 중 Skeleton UI, 데이터 없을 시 "오늘의 말씀을 준비 중입니다." fallback 메시지

**연습 시간 투표 → Firestore 실시간 전환**

- `practice-votes/current-week` 문서에 `votes` Map 필드로 투표 데이터 저장
- `arrayUnion`/`arrayRemove`로 토글 투표 구현
- 비로그인 시 `alert("로그인이 필요합니다.")` 표시
- 히트맵 색상: 인원수에 따라 slate-50 → blue-100 → blue-300 → blue-500 → blue-700 그라데이션

### 2.5 Phase 4: Google 로그인 및 관리자 시스템 (4월 17일)

**Firebase Authentication + 관리자 라우트 보호**

- `useAuth` 커스텀 훅 생성 (`onAuthStateChanged` 기반)
- TopNav에 구글 로그인/로그아웃 버튼, 프로필 사진 표시
- `NEXT_PUBLIC_ADMIN_EMAIL` 환경변수로 관리자 이메일 관리
- `isAdmin` 판별 로직을 `useAuth` 훅에 내장
- 관리자 페이지(`/admin`): 비로그인 → 리디렉트, 비관리자 → alert + 리디렉트
- TopNav에서 관리자 버튼은 `isAdmin`일 때만 렌더링

### 2.6 Phase 5: 화면 분리 리팩토링 (4월 18일)

**찬양팀 전용 페이지 분리**

- 메인 페이지의 투표 컴포넌트를 `/praise` 페이지로 이전
- 비로그인 시 alert + `/`로 리디렉트하는 Protected Route 구현
- TopNav에서 '찬양팀' 메뉴를 로그인 시에만 표시 (`publicNavItems` / `authNavItems` 분리)

### 2.7 Phase 6: 콘텐츠 관리 시스템 구축 (4월 18일)

**관리자 페이지 고도화**

- 유튜브 영상 관리: URL/ID 자동 파싱 (`extractYoutubeId` 함수), 미리보기 iframe
- 찬양 콘티 관리: 동적 배열 CRUD (곡명 + 유튜브 링크)
- 예배 시간 관리: 동적 배열 CRUD (예배명 + 시간 + 요일)
- 주보 관리: Firebase Storage URL 입력, PDF/이미지 미리보기
- 전체 데이터를 `Promise.all`로 병렬 저장

**메인 페이지 동적 데이터 전환**

- 하드코딩된 songs 배열 제거 → Firestore `conti` 배열에서 실시간 렌더링
- 하드코딩된 worshipSchedule → Firestore `worship-schedule/current`에서 실시간 구독 + 기본값 fallback
- 주보 페이지: PDF → `<iframe>`, 이미지 → `<img>` 스마트 렌더링

### 2.8 Phase 7: 브랜딩 및 분석 (4월 18~19일)

**로고, 파비콘, GA4 연동**

- `public/logo.png`를 TopNav에 `next/image`로 적용
- `metadata.icons`에 파비콘 설정
- `@next/third-parties/google` 패키지로 GA4 연동 (측정 ID: `G-4MWLQQQHRN`)
- Overscroll Bounce 방지: `html`, `body` 모두에 `overscroll-none` + CSS `overscroll-behavior: none; touch-action: pan-y;`

### 2.9 Phase 8: 마이페이지 및 게시판 MVP (4월 19일)

**마이페이지 구현**

- 프로필 사진: Firebase Storage `profiles/{uid}`에 업로드 → Auth `updateProfile` + Firestore `users` 컬렉션 동시 업데이트
- 이름 수정: Auth `displayName` + Firestore 동시 업데이트
- 토스트 알림: 하단에 검정 바탕 + 초록 체크 아이콘 토스트 2.5초 표시

**게시판 MVP 구축**

- Tiptap Headless Editor 도입 (StarterKit + Image + Link)
- 이미지/파일 업로드 → Firebase Storage → 에디터에 자동 삽입
- 카테고리 칩 UI (이글/윙윙/청년부, 각각 브랜드 컬러)
- 글 목록: Firestore `posts` 컬렉션 실시간 구독, 카테고리 필터링
- 글 상세: HTML 본문 렌더링, 작성자 본인만 삭제 가능

---

## 3. 핵심 코드 심층 분석

### 3.1 마이페이지: 프로필 이미지 업로드 로직

`src/app/mypage/page.tsx`의 `handlePhotoUpload` 함수를 한 줄씩 분석한다.

```typescript
const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  // 1. 파일 input에서 선택된 첫 번째 파일을 가져온다.
  //    optional chaining으로 files가 없는 경우를 안전하게 처리한다.
  const file = e.target.files?.[0];

  // 2. 파일이 없거나 유저가 로그인하지 않았으면 함수를 즉시 종료한다.
  //    이 가드 절(guard clause)이 없으면 아래 Storage 코드에서 런타임 에러가 발생한다.
  if (!file || !user) return;

  // 3. 업로드 진행 상태를 true로 설정한다.
  //    이 값은 카메라 버튼의 아이콘을 스피너(Loader2)로 교체하는 데 사용된다.
  setUploading(true);

  // 4. Firebase Storage에 파일을 저장할 경로를 지정한다.
  //    profiles/{uid} 경로를 사용하면 유저당 1개의 프로필 사진만 유지된다.
  //    같은 경로에 다시 업로드하면 이전 파일이 자동으로 덮어쓰기(overwrite)된다.
  //    → 스토리지 용량을 절약하는 설계.
  const storageRef = ref(storage, `profiles/${user.uid}`);

  // 5. 선택된 파일을 Firebase Storage에 업로드한다.
  //    uploadBytes는 전체 파일을 한 번에 올리는 가장 간단한 방식이다.
  //    대용량 파일이라면 uploadBytesResumable을 써서 진행률을 표시할 수 있다.
  await uploadBytes(storageRef, file);

  // 6. 업로드 완료 후, 파일의 공개 다운로드 URL을 받아온다.
  //    이 URL은 Firebase Storage CDN을 통해 서빙되며, 토큰이 포함되어 있다.
  const url = await getDownloadURL(storageRef);

  // 7. Firebase Auth의 프로필을 업데이트한다.
  //    updateProfile은 Auth 서비스의 photoURL 필드를 직접 수정한다.
  //    이후 user.photoURL로 접근하면 새 URL이 반환된다.
  await updateProfile(user, { photoURL: url });

  // 8. Firestore의 users 컬렉션에도 동일한 URL을 저장한다.
  //    { merge: true } 옵션은 기존 문서의 다른 필드를 건드리지 않고
  //    지정한 필드만 업데이트하거나 추가한다.
  //    → Auth와 Firestore 두 곳에 동시 저장하는 이유:
  //       Auth는 클라이언트에서 빠르게 접근 가능 (user.photoURL),
  //       Firestore는 다른 유저가 이 유저의 프로필을 조회할 때 사용.
  await setDoc(
    doc(db, "users", user.uid),
    { photoURL: url, displayName: user.displayName || "" },
    { merge: true },
  );

  // 9. 로컬 상태를 업데이트하여 UI에 즉시 반영한다.
  //    React의 상태 업데이트로 리렌더링이 발생하고,
  //    <img src={photoURL}> 태그가 새 URL로 교체된다.
  setPhotoURL(url);
  setUploading(false);

  // 10. 토스트 알림을 표시한다.
  //     showToast 내부에서 2.5초 후 자동으로 사라지도록 setTimeout이 걸려 있다.
  showToast("프로필 사진이 변경되었습니다.");
};
```

**핵심 설계 포인트**:
- **Auth + Firestore 이중 저장**: Auth의 `photoURL`은 클라이언트 SDK에서 즉시 접근 가능하지만, 다른 유저가 이 유저의 프로필을 조회하려면 Firestore를 거쳐야 한다.
- **`merge: true`**: 이 옵션 없이 `setDoc`을 호출하면 기존 문서가 통째로 덮어써진다. 예를 들어 `displayName` 필드만 있는 문서에 `photoURL`만 쓰면, `displayName`이 사라진다.
- **경로 설계 `profiles/{uid}`**: 유저당 1개 파일만 유지하여 스토리지 낭비를 방지한다.

---

### 3.2 GA4 연동: `@next/third-parties` 방식

`src/app/layout.tsx`에서 GA4를 연동한 코드를 분석한다.

```typescript
// 1. @next/third-parties/google 패키지에서 GoogleAnalytics 컴포넌트를 임포트한다.
//    이 패키지는 Next.js 팀이 공식으로 관리하는 서드파티 스크립트 최적화 도구다.
//    직접 <script> 태그를 삽입하는 것보다 훨씬 안전하고 성능이 좋다.
import { GoogleAnalytics } from "@next/third-parties/google";
```

```tsx
export default function RootLayout({ children }: ...) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full antialiased overscroll-none`}>
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-slate-900 overscroll-none">
        <TopNav />
        <main className="flex-1">{children}</main>
      </body>
      {/* 2. GoogleAnalytics 컴포넌트를 </body> 바로 아래에 배치한다.
             이 위치는 의도적이다:
             - <body> 안에 넣으면 메인 콘텐츠의 렌더링을 방해할 수 있다.
             - <html> 닫기 직전에 넣으면 GA 스크립트가 렌더링과 무관하게 로드된다.

          3. gaId 프롭에 측정 ID를 전달한다.
             내부적으로 이 컴포넌트는:
             - gtag.js 스크립트를 동적으로 로드한다 (defer/async).
             - Next.js의 라우터 이벤트를 자동으로 감지하여 페이지뷰를 추적한다.
             - SPA(Single Page Application) 환경에서도 페이지 전환을 올바르게 기록한다.

          4. 환경변수 대신 직접 ID를 넣은 이유:
             NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID와 동일한 값이지만,
             GA4는 Firebase와 별개의 서비스이므로 명시적으로 분리했다. */}
      <GoogleAnalytics gaId="G-4MWLQQQHRN" />
    </html>
  );
}
```

**`@next/third-parties`가 직접 `<script>` 삽입보다 나은 점**:
1. **자동 최적화**: `afterInteractive` 전략으로 스크립트를 로드하여 First Contentful Paint(FCP)에 영향을 주지 않는다.
2. **라우터 연동**: App Router의 클라이언트 네비게이션 시 자동으로 `page_view` 이벤트를 전송한다.
3. **타입 안전성**: TypeScript 타입이 내장되어 있어 `gaId` 오타를 빌드 타임에 잡을 수 있다.

---

### 3.3 게시판 에디터: Tiptap + SSR Hydration 해결

`src/app/board/write/page.tsx`의 에디터 설정을 심층 분석한다.

```typescript
// 1. Tiptap 확장 임포트
//    StarterKit: Bold, Italic, Heading, BulletList 등 기본 확장 번들
//    TiptapImage: 이미지 노드를 에디터에 추가하는 확장
//    TiptapLink: 텍스트에 하이퍼링크를 걸 수 있는 마크 확장
//
//    ⚠️ 중요: import 이름을 TiptapImage, TiptapLink로 변경했다.
//    원래 Image, Link로 임포트하면 StarterKit 내부의 동일 이름 확장과
//    "Duplicate extension names" 경고가 발생할 수 있다.
//    이름을 다르게 하면 JavaScript 모듈 스코프에서 충돌을 피할 수 있다.
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
```

```typescript
const editor = useEditor({
  extensions: [
    // 2. StarterKit은 아래 확장들을 한 번에 포함한다:
    //    Document, Paragraph, Text, Bold, Italic, Strike,
    //    Code, Heading, BulletList, OrderedList, ListItem,
    //    Blockquote, HardBreak, HorizontalRule, History(Undo/Redo)
    //
    //    StarterKit에 Link나 Image는 포함되어 있지 않으므로,
    //    별도로 추가해도 이름 충돌은 발생하지 않는다.
    //    (경고가 나왔던 건 import 변수명 충돌이었지 확장 이름 충돌이 아니었다)
    StarterKit,

    // 3. 이미지 확장: inline: false로 설정하면 이미지가 블록 레벨 노드로 렌더링된다.
    //    true이면 텍스트 사이에 인라인으로 들어가는데, 교회 게시판에서는
    //    이미지를 큼직하게 보여주는 게 낫기 때문에 블록으로 설정했다.
    TiptapImage.configure({ inline: false }),

    // 4. 링크 확장: openOnClick: false로 설정하면 에디터 내에서 링크를 클릭해도
    //    페이지가 이동하지 않는다. 편집 중에 실수로 링크를 클릭하는 것을 방지한다.
    //    실제 링크 이동은 게시글 상세 페이지에서 렌더링될 때만 동작한다.
    TiptapLink.configure({ openOnClick: false }),
  ],

  content: "",

  // ★★★ 5. immediatelyRender: false — 이것이 이 코드의 핵심이다. ★★★
  //
  //    [문제 상황]
  //    Next.js는 서버에서 HTML을 먼저 렌더링(SSR)한 뒤,
  //    클라이언트에서 React가 이 HTML에 이벤트 핸들러를 붙인다(Hydration).
  //    이때 서버에서 만든 HTML과 클라이언트에서 만든 HTML이 다르면
  //    "Hydration Mismatch" 에러가 발생한다.
  //
  //    Tiptap 에디터는 브라우저의 DOM API(contentEditable)에 의존하기 때문에,
  //    서버에서는 에디터 DOM을 만들 수 없다.
  //    기본 설정(immediatelyRender: true)에서는 useEditor가 호출되자마자
  //    에디터 DOM을 생성하려고 시도하는데, SSR 환경에서는 DOM이 없으므로 에러가 난다.
  //
  //    [해결]
  //    immediatelyRender: false를 설정하면, 에디터가 컴포넌트 마운트 후
  //    (= 브라우저에서 Hydration이 완료된 후)에야 렌더링을 시작한다.
  //    서버에서는 빈 <div>만 렌더링되고, 클라이언트에서 에디터가 채워지므로
  //    Hydration Mismatch가 발생하지 않는다.
  immediatelyRender: false,

  editorProps: {
    attributes: {
      // 6. 에디터 DOM 요소에 직접 CSS 클래스를 부여한다.
      //    prose: @tailwindcss/typography 플러그인의 기본 타이포그래피 스타일
      //    prose-slate: 슬레이트 색상 테마
      //    max-w-none: prose의 기본 max-width 제한을 해제
      //    min-h-[300px]: 에디터 최소 높이를 확보하여 빈 상태에서도 입력 영역이 보이게 함
      class:
        "prose prose-slate max-w-none min-h-[300px] px-5 py-4 focus:outline-none text-base sm:text-lg",
    },

    // 7. 드래그 앤 드롭 핸들러
    //    사용자가 파일을 에디터 영역에 드래그하면 이 함수가 호출된다.
    handleDrop(view, event) {
      const files = event.dataTransfer?.files;
      if (files?.length) {
        event.preventDefault(); // 브라우저 기본 동작(파일 열기) 방지
        Array.from(files).forEach((file) => {
          if (file.type.startsWith("image/")) {
            // 이미지 파일만 처리. 다른 파일 타입은 무시한다.
            uploadToStorage(file, "posts").then((url) => {
              if (url) {
                // ProseMirror의 트랜잭션 API를 직접 사용하여
                // 현재 커서 위치에 이미지 노드를 삽입한다.
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url }),
                  ),
                );
              }
            });
          }
        });
        return true; // 이벤트를 처리했음을 Tiptap에 알린다
      }
      return false; // 이미지가 아니면 기본 동작을 수행한다
    },
  },
});
```

**파일 첨부 버튼의 동작 흐름**:

```typescript
const handleFileButton = useCallback(() => {
  // 1. 프로그래밍 방식으로 파일 선택 다이얼로그를 연다.
  //    실제 <input type="file">을 DOM에 추가하지 않고,
  //    메모리에서 생성하여 click()을 호출한다.
  const input = document.createElement("input");
  input.type = "file";
  // accept를 설정하지 않아 모든 파일 타입을 허용한다.

  input.onchange = async () => {
    const file = input.files?.[0];
    if (file && editor) {
      // 2. 'files/' 폴더에 업로드한다 (이미지는 'posts/' 폴더).
      const url = await uploadToStorage(file, "files");
      if (url) {
        // 3. 에디터에 다운로드 링크를 HTML 형태로 삽입한다.
        //    insertContent는 Tiptap의 체인 API로,
        //    커서 위치에 HTML 문자열을 파싱하여 삽입한다.
        //    📎 이모지를 파일명 앞에 붙여 시각적으로 파일임을 나타낸다.
        editor
          .chain()
          .focus()
          .insertContent(
            `<p><a href="${url}" target="_blank" rel="noopener noreferrer">📎 ${file.name}</a></p>`,
          )
          .run();
      }
    }
  };
  input.click();
}, [editor, uploadToStorage]);
```

---

### 3.4 useAuth 훅: 인증 상태 관리의 핵심

```typescript
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// 1. 환경변수에서 관리자 이메일을 가져온다.
//    NEXT_PUBLIC_ 접두사가 있어야 클라이언트 번들에 포함된다.
//    ?? ""는 환경변수가 undefined일 때 빈 문자열로 폴백한다.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

export function useAuth() {
  // 2. user: 현재 로그인된 Firebase User 객체 또는 null
  const [user, setUser] = useState<User | null>(null);

  // 3. loading: Auth 상태를 아직 확인 중인지 여부
  //    처음 true로 시작하여, onAuthStateChanged 콜백이 호출되면 false가 된다.
  //    이 값이 true인 동안에는 로그인/비로그인을 판단하지 않는다.
  //    → Protected Route에서 "로그인 안 됨 → 리디렉트"를 성급하게 실행하지 않게 한다.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 4. onAuthStateChanged는 Firebase Auth의 리스너다.
    //    - 페이지 로드 시: 로컬 캐시(IndexedDB)에서 세션을 복원하고 콜백 호출
    //    - 로그인/로그아웃 시: 즉시 콜백 호출
    //    - 토큰 갱신 시: 콜백 호출
    //
    //    이 한 줄로 "새로고침해도 로그인이 유지"되는 기능이 구현된다.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);  // User 객체 또는 null
      setLoading(false);       // 확인 완료
    });

    // 5. 컴포넌트 언마운트 시 리스너를 해제한다.
    //    이걸 빠뜨리면 메모리 누수(memory leak)가 발생한다.
    return () => unsubscribe();
  }, []);

  // 6. isAdmin 계산: 유저가 존재하고, 이메일이 관리자 이메일과 정확히 일치하는지 확인
  //    !!user는 user가 null이 아닌지를 boolean으로 변환한다.
  //    &&로 연결하여 user가 null이면 false를 바로 반환한다.
  const isAdmin = !!user && user.email === ADMIN_EMAIL;

  return { user, loading, isAdmin };
}
```

**이 훅이 사용되는 패턴 (Protected Route)**:

```typescript
// 모든 보호된 페이지에서 동일한 패턴으로 사용된다:
const { user, loading: authLoading, isAdmin } = useAuth();
const router = useRouter();

useEffect(() => {
  if (authLoading) return;          // 아직 확인 중이면 아무것도 하지 않는다
  if (!user) {                       // 비로그인
    router.replace("/");             // 메인으로 리디렉트
    return;
  }
  if (!isAdmin) {                    // 로그인했지만 관리자가 아님 (admin 전용)
    alert("관리자 권한이 없습니다.");
    router.replace("/");
  }
}, [authLoading, user, isAdmin, router]);
```

---

### 3.5 Firebase 초기화: 중복 방지 패턴

```typescript
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  // NEXT_PUBLIC_ 접두사가 있는 환경변수는 클라이언트 번들에 포함된다.
  // 이 값들은 "API 키"이지만, Firebase Security Rules가
  // 실제 보안을 담당하므로 노출되어도 무방하다.
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ★ 핵심: getApps()로 이미 초기화된 앱이 있는지 확인한다.
// Next.js의 Hot Module Replacement(HMR) 중에 이 파일이 재실행될 수 있다.
// 그때 initializeApp을 다시 호출하면 "Firebase App already exists" 에러가 발생한다.
// 이 패턴으로 앱 인스턴스를 싱글톤으로 유지한다.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
```

---

## 4. 핑구(Pingu)의 기술 비유법

### 🐧 핑구의 SSR 레스토랑: `immediatelyRender` 사건의 전말

어느 날, 핑구는 이글루 앞에 멋진 레스토랑을 열었다.

이 레스토랑의 특별한 점은 **이중 주방 시스템**이었다.

---

**1막: 서버 주방 (SSR)**

핑구의 레스토랑에는 두 개의 주방이 있다. 첫 번째는 **'서버 주방'** — 손님이 문을 열기도 전에 미리 음식의 모양(HTML)을 만들어두는 곳이다.

> 핑구: "누트! 누트! (손님이 오기 전에 미리 접시에 음식 모양을 깔아두자!)"

서버 주방의 요리사(Next.js SSR)는 재빠르게 접시(HTML)를 준비한다. 이렇게 하면 손님이 도착했을 때 빈 접시를 보지 않아도 된다.

---

**2막: 클라이언트 주방 (Hydration)**

두 번째 주방은 **'클라이언트 주방'** — 손님이 자리에 앉은 후, 미리 깔아둔 음식에 양념(이벤트 핸들러)을 뿌리고 실제로 먹을 수 있게 만드는 곳이다.

> 핑구: "누트! (이제 양념을 뿌려서 진짜 요리로 만들자!)"

클라이언트 요리사(React Hydration)가 서버 요리사가 만든 접시를 확인하고, 같은 모양으로 양념을 뿌린다.

---

**3막: 사건 발생 — Tiptap 에디터의 등장**

어느 날, 핑구는 새로운 메뉴를 추가했다. **"인터랙티브 에디터 스테이크"** (Tiptap Editor).

이 요리는 특별했다. **손님이 직접 자르고 편집하며 먹는 요리**였다. 브라우저의 `contentEditable` API라는 특수 도마가 필요했다.

문제는... **서버 주방에는 이 특수 도마가 없었다!**

> 서버 요리사: "이 도마... 서버 주방에는 없는데? 그냥 상상으로 만들어볼게."

서버 요리사는 상상력을 발휘해서 대충 비슷한 모양의 접시를 만들었다. 하지만 클라이언트 요리사가 와서 보니...

> 클라이언트 요리사: "뭐야! 이 접시 모양이 내가 만들 거랑 완전 다르잖아!"
>
> **💥 HYDRATION MISMATCH ERROR! 💥**
>
> 핑구: "누트!! 누트!! 누트!!! (접시 두 개가 서로 다르다고 레스토랑이 폭발했어!!!)"

레스토랑에 경보음이 울리고, 콘솔에 빨간 에러가 가득 찼다.

---

**4막: 해결 — `immediatelyRender: false`**

핑구는 고민 끝에 기막힌 아이디어를 떠올렸다.

> 핑구: "누트! (서버 주방에서는 이 요리를 만들지 말자! 빈 접시만 놓아두고, 클라이언트 요리사가 처음부터 만들게 하면 되잖아!)"

```typescript
const editor = useEditor({
  // ...
  immediatelyRender: false,  // 👈 "서버 주방에서 만들지 마!"
});
```

이제 서버 주방에서는 에디터 자리에 빈 접시(`<div>`)만 놓아둔다. 클라이언트 요리사가 도착하면 그때 비로소 특수 도마를 꺼내서 요리를 시작한다.

> 클라이언트 요리사: "오, 빈 접시네? 내가 처음부터 만들면 되겠구나."
>
> **✅ 접시 비교 작업(Hydration) 성공! 에러 없음!**

---

**에필로그**

핑구의 레스토랑은 그날 이후로 두 가지 원칙을 세웠다:

1. **서버 주방에서 만들 수 없는 요리(브라우저 전용 기능)는 빈 접시만 놓아둔다.** (`immediatelyRender: false`)
2. **서버와 클라이언트의 접시 모양은 반드시 같아야 한다.** (Hydration 일치)

> 핑구: "누트~ 🐧" (만족스러운 미소)

---

## 5. 트러블슈팅 및 깃 전략

### 5.1 Controlled Input 에러 (`value || ""`)

**증상**: React 경고 — `A component is changing an uncontrolled input to be controlled.`

**원인**: Firebase에서 가져온 데이터의 필드가 `undefined`일 때 발생. `<input value={undefined}>`는 uncontrolled input으로 취급되고, 이후 `setState`로 값이 채워지면 controlled input으로 전환되면서 경고가 발생.

**해결**: 모든 input의 `value`에 `|| ""` fallback을 적용.

```tsx
// ❌ Before — undefined가 들어올 수 있음
<input value={item.youtubeUrl} onChange={...} />

// ✅ After — 항상 string이 보장됨
<input value={item.youtubeUrl || ""} onChange={...} />
```

**적용 범위**: 프로젝트 전체의 모든 `<input>`, `<textarea>`, `<select>` 태그에 일괄 적용. 특히 Firestore에서 가져온 데이터는 스키마가 유연하기 때문에 어떤 필드든 `undefined`가 될 수 있다.

---

### 5.2 Tiptap Duplicate Extension 경고

**증상**: 콘솔 경고 — `Duplicate extension names found: [...]`

**원인**: `@tiptap/extension-image`와 `@tiptap/extension-link`를 `Image`, `Link`라는 이름으로 import했을 때, JavaScript 모듈 스코프에서 다른 `Image`(Next.js) 또는 `Link`(Next.js)와 충돌할 가능성.

**해결**: import 이름을 명시적으로 변경.

```typescript
// ❌ Before — 다른 모듈과 이름 충돌 가능
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

// ✅ After — Tiptap 전용 이름으로 명확히 구분
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
```

---

### 5.3 Hydration Mismatch (Tiptap + SSR)

**증상**: 서버 렌더링된 HTML과 클라이언트에서 생성된 에디터 DOM이 달라서 에러 발생.

**해결**: `immediatelyRender: false` 설정으로 에디터 렌더링을 클라이언트에서만 수행.

```typescript
const editor = useEditor({
  extensions: [...],
  content: "",
  immediatelyRender: false, // 서버에서는 빈 div만 렌더링
});
```

---

### 5.4 Overscroll Bounce (모바일)

**증상**: iOS Safari/Chrome에서 스크롤 끝에 닿으면 네비바가 고무줄처럼 튀는 현상.

**해결**: 3중 차단 적용.

```css
/* globals.css — 가장 확실한 방법 */
html, body {
  overscroll-behavior: none;
  touch-action: pan-y;
}
```

```tsx
/* layout.tsx — Tailwind 클래스로도 이중 적용 */
<html className="... overscroll-none">
  <body className="... overscroll-none">
```

---

### 5.5 Firebase 중복 초기화

**증상**: Next.js HMR(Hot Module Replacement) 시 `Firebase App already exists` 에러.

**해결**: `getApps()` 체크로 싱글톤 패턴 적용.

```typescript
const app = getApps().length === 0
  ? initializeApp(firebaseConfig) // 첫 실행: 새로 생성
  : getApps()[0];                  // 이미 있음: 기존 앱 재사용
```

---

### 5.6 Git 전략 및 CI/CD 워크플로우

**브랜치 전략**:

```
main (프로덕션)
  ├── feature/board     # 게시판 기능 개발
  ├── feature/auth      # 로그인 및 관리자 시스템
  ├── feature/praise    # 찬양팀 전용 페이지
  └── feature/mypage    # 마이페이지
```

**워크플로우**:

```bash
# 1. 기능 브랜치 생성
git checkout -b feature/board

# 2. 작업 후 커밋
git add src/app/board/
git commit -m "feat: 게시판 CRUD 구현 (Tiptap 에디터, Firestore 연동)"

# 3. 빌드 테스트 (로컬에서 에러 확인)
npm run build

# 4. main으로 머지
git checkout main
git merge feature/board

# 5. 푸시 → Vercel 자동 배포
git push origin main
```

**Vercel CI/CD 파이프라인**:

```
Git Push → Vercel Webhook → Build (npm run build) → Deploy
                                    ↓
                              TypeScript 타입 체크
                              ESLint 검사
                              Static Page Generation
                                    ↓
                              에러 없으면 배포 완료
                              에러 있으면 빌드 실패 → 알림
```

**안전장치**:
- **Preview Deployment**: `main`이 아닌 브랜치를 푸시하면 Vercel이 Preview URL을 생성. 실제 프로덕션에 영향 없이 테스트 가능.
- **빌드 전 로컬 검증**: `npm run build`를 로컬에서 먼저 실행하여 TypeScript 에러, 빌드 실패를 사전에 잡는다.
- **환경변수 분리**: `.env.local`은 Git에 포함되지 않고, Vercel 대시보드에서 별도로 설정.

---

## 마치며

'이음' 프로젝트는 단순한 교회 앱을 넘어, **현대 웹 개발의 핵심 기술들을 실전에서 통합한 풀스택 프로젝트**다.

- **Next.js 16 App Router**: 파일 기반 라우팅, 서버/클라이언트 컴포넌트 분리, `loading.tsx` Suspense 패턴
- **Firebase 생태계**: Auth(인증) + Firestore(실시간 DB) + Storage(파일) 3종 세트를 하나의 앱에서 유기적으로 연결
- **Tiptap Editor**: ProseMirror 기반의 Headless 에디터를 SSR 환경에서 안전하게 운용
- **반응형 UI**: 어르신도 쓸 수 있는 큼직한 카드 UI, 모바일 퍼스트 디자인

이 프로젝트에서 가장 큰 배움은 **"기술은 목적을 위한 도구"**라는 것이다. Next.js의 SSR이든, Firebase의 실시간 동기화든, Tiptap의 리치 텍스트 편집이든 — 결국 **할머니가 스마트폰에서 오늘의 말씀을 읽고, 청년이 연습 시간에 투표하고, 목사님이 주보를 업로드하는** 그 순간을 위해 존재하는 것이다.

이음(E-EUM) — 세대를 잇고, 마음을 잇는 교회 대시보드. 🙏

---

> **Co-Authored-By**: Claude (Anthropic)
> **Last Updated**: 2026-04-19
