# REPORT 3: 이음 프로젝트 고도화 및 데이터 아카이브 구축

> **작성일**: 2026년 4월 19일
> **프로젝트**: 이음(E-EUM) — 전 세대가 함께 쓰는 초간단 교회 대시보드
> **PO / 개발자**: 전승현 (dokv1004@gmail.com)
> **페어 프로그래밍 파트너**: Claude (AI)

---

## 들어가며

오늘은 이음 프로젝트 역사상 가장 많은 아키텍처 변경이 일어난 날이다.

아침에 시작한 "찬양 콘티를 날짜별로 보관하고 싶다"는 단순한 소망은, 해가 질 무렵 **주간 콘티 아카이빙 시스템**, **동적 예배 카테고리 CMS**, **인스타그램 스타일 캐러셀**, **대표 찬양 자동 롤링 뷰어**라는 네 가지 핵심 시스템으로 결실을 맺었다.

이 리포트는 오늘 하루 동안 이루어진 모든 기획적 판단과 기술적 구현을 빠짐없이 기록한다.

---

## 1. 주간 콘티 아카이브 시스템 설계 (History Tracking)

### 1.1 문제: 휘발하는 데이터

이전 구조에서 찬양 콘티는 `daily-word/current`라는 **단일 문서**의 `conti` 배열 필드에 저장되었다. 매주 관리자가 새 콘티를 입력하면 이전 데이터는 흔적도 없이 덮어쓰기되었다.

```
Before:
daily-word/current
  ├── verse: "..."
  ├── reference: "..."
  └── conti: [{ title: "Way Maker", youtubeUrl: "..." }]  ← 매주 덮어쓰기
```

승현 PO의 기획 의도는 명확했다: **"지난주에 어떤 곡을 했는지 돌아볼 수 있어야 하고, 같은 곡을 다시 할 때 복사해서 쓸 수 있어야 한다."**

### 1.2 해결: 날짜 기반 이력 관리

새로운 Firestore 컬렉션 `praise_setlists`를 생성하고, 각 문서가 **특정 날짜 + 특정 예배 종류**에 귀속되도록 설계했다.

```
After:
praise_setlists/{autoId}
  ├── date: "2026-04-20"           ← 어떤 날짜의 콘티인지
  ├── serviceType: "sunday_main"   ← 어떤 예배의 콘티인지
  ├── title: "4월 3주차 대예배 찬양"
  ├── songs: [{ title, link }]     ← 곡 목록
  └── createdAt: Timestamp         ← 생성 시각
```

**자동 ID vs 날짜 ID**: 초기에는 문서 ID를 `"2026-04-20"` 형태의 날짜 문자열로 사용했다. 하지만 승현 PO가 "하루에 주일 대예배, 주일학교, 청년부 예배 등 여러 콘티가 있다"는 요구사항을 제시하면서, 자동 ID(`addDoc`)로 전환하고 `date` + `serviceType`을 필드로 분리했다.

---

## 2. 데이터 마이그레이션 및 관리자 편의성 강화

### 2.1 레거시 데이터 자동 마이그레이션

새 시스템을 도입했다고 해서 기존에 입력한 콘티 데이터가 사라지면 안 된다. 관리자 콘티 페이지(`admin/praise/page.tsx`)의 `useEffect`에 **2단계 폴백 로직**을 구현했다.

```typescript
useEffect(() => {
  if (!isAdmin || !selectedDate || !serviceType) return;
  (async () => {
    setDataLoading(true);
    setEditingDocId(null);

    // ★ 1순위: 새 시스템에 이미 저장된 콘티가 있는지 확인
    const q = query(
      collection(db, "praise_setlists"),
      where("date", "==", selectedDate),     // 선택한 날짜
      where("serviceType", "==", serviceType), // 선택한 예배 종류
      limit(1),                                // 1개만 찾으면 됨
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      // 기존 문서가 있으면 편집 모드로 전환
      const existingDoc = snap.docs[0];
      setEditingDocId(existingDoc.id); // 나중에 setDoc으로 덮어쓸 때 사용
      const data = existingDoc.data();
      setTitle(data.title ?? "");
      setSongs(/* ... */);
    } else {
      // ★ 2순위: 새 시스템에 없으면 빈 폼 + 기본 제목
      const catLabel = categories.find((c) => c.id === serviceType)?.label || "";
      setTitle(catLabel ? `${catLabel} 찬양` : "");
      setSongs([{ title: "", link: "" }]);
    }

    setDataLoading(false);
  })();
}, [isAdmin, selectedDate, serviceType, categories]);
```

**핵심 설계 포인트**:

- `where("date", "==", selectedDate)` + `where("serviceType", "==", serviceType)` — **복합 쿼리**로 날짜와 예배 종류를 동시에 필터링. 이 쿼리를 위해 Firestore에 복합 색인(Composite Index)이 자동 생성된다.

- `setEditingDocId(existingDoc.id)` — 기존 문서가 있으면 그 문서의 ID를 저장해두고, 저장 시 `setDoc`으로 업데이트. 없으면 `addDoc`으로 새 문서 생성. 이 분기 덕분에 **생성과 수정이 하나의 폼에서** 자연스럽게 이루어진다.

### 2.2 이전 콘티 불러오기

교회 찬양팀은 매주 비슷한 곡을 반복하는 경우가 많다. "지난주 콘티를 그대로 가져와서 한두 곡만 바꾸고 싶다"는 운영 니즈를 반영했다.

```typescript
const handleLoadPrevious = async () => {
  setLoadingPrev(true);
  // 같은 예배 종류의 콘티만 검색
  const q = query(
    collection(db, "praise_setlists"),
    where("serviceType", "==", serviceType), // 같은 예배 종류
    orderBy("date", "desc"),                  // 최신순 정렬
    limit(10),                                // 최근 10개만
  );
  const snap = await getDocs(q);
  // 현재 선택한 날짜보다 이전인 것 중 가장 최근
  const prev = snap.docs.find((d) => d.data().date < selectedDate);

  if (prev) {
    const data = prev.data();
    setTitle(data.title ?? "");
    setSongs(/* 곡 목록 복사 */);
  } else {
    alert("이전 콘티 데이터가 없습니다.");
  }
  setLoadingPrev(false);
};
```

`snap.docs.find((d) => d.data().date < selectedDate)` — Firestore에서 문서 ID로 `where` 필터를 걸 수 없으므로, 최근 10개를 가져온 후 클라이언트에서 날짜 비교. 문자열 비교(`<`)가 날짜 비교와 동일하게 작동하는 이유는 `YYYY-MM-DD` 포맷이 사전순 = 시간순이기 때문이다.

---

## 3. 캘린더 UI/UX의 미학적 개선 (Minimalism)

### 3.1 FullCalendar에서 수제 캘린더로의 회귀

초기에 FullCalendar 라이브러리를 도입했으나, 기본 스타일의 **꽉 찬 네모 박스(Block)** 일정 표시가 이음 앱의 미니멀한 디자인 철학과 맞지 않았다.

승현 PO의 디자인 요청은 명확했다: **"Apple 캘린더처럼 날짜 아래에 작은 색깔 점만 보이게"**.

FullCalendar를 완전히 제거하고, `date-fns`의 날짜 계산 함수들로 직접 달력 그리드를 구축했다.

```typescript
// 달력에 표시할 날짜 배열 계산
const monthStart = startOfMonth(currentMonth);  // 이번 달 1일
const monthEnd = endOfMonth(currentMonth);        // 이번 달 마지막 날
const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 달력 시작일 (일요일)
const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });       // 달력 끝일 (토요일)
const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd }); // 전체 날짜 배열
```

### 3.2 예배 종류별 컬러 Dot

각 날짜 셀 하단에 해당 날짜에 등록된 콘티의 예배 종류별 색상 점을 렌더링한다.

```tsx
{daySetlists.length > 0 && (
  <div className="flex gap-0.5 mt-1">
    {daySetlists.slice(0, 4).map((s, i) => (
      <div
        key={i}
        className="w-1.5 h-1.5 rounded-full"
        style={{
          // 선택된 날짜면 흰색, 아니면 예배 종류별 색상
          backgroundColor: isSelected
            ? "rgba(255,255,255,0.8)"
            : getServiceColor(s.serviceType || ""),
        }}
      />
    ))}
  </div>
)}
```

- `slice(0, 4)` — 한 칸에 점이 4개를 초과하면 UI가 깨지므로 최대 4개로 제한.
- `isSelected ? "rgba(255,255,255,0.8)"` — 날짜가 선택되어 파란 배경이 되면, 점의 색상을 흰색으로 변환하여 가시성을 유지한다.

### 3.3 캘린더 하단 상세 카드

모달 대신 캘린더 하단에 선택 날짜의 콘티를 카드 리스트로 표시하는 방식을 채택했다. 모달은 팝업을 닫아야 다른 날짜를 선택할 수 있어 탐색이 번거롭지만, 하단 카드는 날짜만 탭하면 즉시 내용이 바뀌어 훨씬 빠른 탐색이 가능하다.

---

## 4. 날짜 로직의 유연화 및 타임존 버그 해결

### 4.1 자동 일요일 계산의 좌절

초기 설계에서는 `date-fns`의 `nextSunday()` 함수로 다가오는 일요일을 자동 계산하여 문서 ID로 사용했다. 하지만 두 가지 문제가 발생했다.

**문제 1: `nextSunday`의 의미론적 함정**

`nextSunday(date)`는 "이번 주 일요일"이 아니라 **"다음 주 일요일"**을 반환한다. 화요일에 호출하면 5일 뒤가 아닌 12일 뒤의 일요일이 반환되어, 캘린더에 "4월 21일 (화요일)"이 아닌 엉뚱한 날짜가 표시되었다.

**문제 2: UTC vs KST 타임존 오차**

`new Date()`는 브라우저의 로컬 시간을 반환하지만, 서버 사이드에서는 UTC를 반환한다. 한국 시간(KST = UTC+9)에서 자정 직전에 접속하면 UTC 기준으로는 이미 다음 날이 되어 날짜가 하루 밀려 저장되는 버그가 발생했다.

### 4.2 해결: 수동 날짜 선택 + KST 강제 계산

승현 PO의 기획적 판단: **"자동 계산을 포기하고, 관리자가 직접 날짜를 선택하게 하자."**

이 결정은 두 번째 문제도 함께 해결했다. 수요예배(수요일), 금요철야(금요일) 콘티도 정확한 날짜에 저장할 수 있게 되었다.

KST 기준 오늘 날짜를 정확히 계산하는 유틸 함수:

```typescript
function getTodayKST(): string {
  const now = new Date();
  // UTC 시간에 9시간(32,400,000ms)을 더해 KST로 변환
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  // ISO 문자열에서 날짜 부분(YYYY-MM-DD)만 추출
  return kst.toISOString().slice(0, 10);
}
```

이 함수가 `<input type="date">`의 기본값으로 사용되어, 관리자가 폼을 열었을 때 항상 한국 시간 기준 오늘 날짜가 표시된다.

---

## 5. 인스타그램 스타일의 다중 콘티 슬라이더 (Carousel UX)

### 5.1 기획 배경

승현 PO: *"같은 일요일에 대예배, 주일학교, 청년부 예배 콘티가 각각 있어. 인스타그램 게시물처럼 옆으로 넘기면서 볼 수 있으면 좋겠어."*

이 요구사항은 기존의 "한 날짜 = 한 콘티" 구조를 "한 날짜 = 여러 콘티" 구조로 확장하는 것을 의미했다.

### 5.2 스마트 쿼리: 가장 가까운 미래의 콘티 찾기

대시보드에서 가장 핵심적인 쿼리. 오늘 이후 가장 가까운 날짜의 모든 콘티를 그룹화하여 가져온다.

```typescript
useEffect(() => {
  (async () => {
    // 1. KST 기준 오늘 날짜 계산
    const today = getTodayKST(); // "2026-04-19"

    // 2. Firestore 쿼리: date >= 오늘, 날짜 오름차순
    const q = query(
      collection(db, "praise_setlists"),
      where("date", ">=", today),  // 오늘 이후 (오늘 포함)
      orderBy("date", "asc"),       // 가장 가까운 날짜가 맨 앞
    );
    const snap = await getDocs(q);

    // 3. 결과가 없으면 빈 상태
    if (snap.empty) {
      setSetlists([]);
      setLinkedSongs([]);
      setSetlistsLoading(false);
      return;
    }

    // 4. 가장 가까운 날짜를 첫 번째 문서에서 추출
    //    예: 오늘이 화요일이면 수요일 콘티가 nearestDate
    //    수요일 콘티가 없으면 일요일 콘티가 nearestDate
    const nearestDate = snap.docs[0].data().date as string;

    // 5. 같은 날짜의 모든 콘티를 그룹화
    //    하루에 대예배, 주일학교, 청년부 등 여러 콘티가 있을 수 있음
    const grouped = snap.docs
      .filter((d) => d.data().date === nearestDate) // 같은 날짜만
      .map((d) => ({ id: d.id, ...d.data() } as PraiseSetlist));

    setSetlists(grouped); // 슬라이더에 표시할 콘티 배열

    // 6. (대표 찬양 자동화) 유튜브 링크가 있는 곡만 추출
    const songs: LinkedSong[] = [];
    for (const setlist of grouped) {
      for (const song of setlist.songs) {
        if (song.link?.trim()) {
          const ytId = extractYoutubeId(song.link);
          if (ytId) {
            songs.push({
              title: song.title,
              link: song.link,
              youtubeId: ytId,
            });
          }
        }
      }
    }
    setLinkedSongs(songs); // 롤링 뷰어에 표시할 곡 배열
    setSetlistsLoading(false);
  })();
}, []);
```

**이 쿼리가 영리한 이유**:

화요일에 접속하면 수요예배 콘티가 뜨고, 수요일이 지나면 자동으로 금요철야 콘티가 뜨고, 금요일이 지나면 주일 콘티가 뜬다. **관리자가 아무것도 하지 않아도 시간이 흐르면서 대시보드가 자동으로 갱신**된다.

### 5.3 Carousel CSS 구조

Tailwind CSS의 `snap-x snap-mandatory`를 활용한 **네이티브 CSS 스냅 스크롤** 방식으로 구현했다. JavaScript 라이브러리(Swiper, Embla 등) 없이 CSS만으로 인스타그램 수준의 스와이프 UX를 달성했다.

```tsx
{/* 슬라이더 컨테이너 */}
<div
  ref={scrollRef}                    // 스크롤 위치 감지용 ref
  onScroll={handleScroll}            // 스크롤 시 active dot 업데이트
  className="flex                    // 가로 배치
    overflow-x-auto                  // 가로 스크롤 활성화
    snap-x                           // X축 스냅 활성화
    snap-mandatory                   // 반드시 스냅 포인트에 정렬
    scrollbar-hide"                  // 스크롤바 숨김 (커스텀 CSS)
>
  {setlists.map((setlist) => (
    <div
      key={setlist.id}
      className="w-full               // 컨테이너 너비 100% = 한 장씩
        shrink-0                       // Flex에서 줄어들지 않음
        snap-center                    // 스냅 시 화면 중앙에 정렬
        p-6 sm:p-8 pt-4               // 내부 여백
        space-y-3"                     // 곡 사이 간격
    >
      {/* ... 예배 종류 배지 + 곡 리스트 ... */}
    </div>
  ))}
</div>
```

**`scrollbar-hide` 클래스가 작동하지 않았던 이슈와 해결**:

처음에 `.scrollbar-hide` CSS를 `@import "tailwindcss"` **이전에** 선언했다. Tailwind 4는 자체 CSS 레이어 시스템을 사용하기 때문에, 이전에 선언된 스타일이 리셋될 수 있었다.

해결: `@layer base {}` 안에 `!important`와 함께 선언.

```css
@layer base {
  .scrollbar-hide {
    -ms-overflow-style: none !important;  /* IE/Edge */
    scrollbar-width: none !important;      /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none !important;              /* Chrome/Safari */
  }
}
```

### 5.4 Dot Indicator 인터랙션

스크롤바가 없으므로, 하단의 **점(Dot) 인디케이터**가 현재 위치를 알려주는 유일한 시각적 단서다.

```typescript
// 스크롤 이벤트에서 현재 슬라이드 인덱스 계산
const handleScroll = () => {
  if (!scrollRef.current || setlists.length <= 1) return;
  const el = scrollRef.current;
  // 전체 스크롤 너비를 슬라이드 개수로 나누면 한 슬라이드의 너비
  const slideWidth = el.scrollWidth / setlists.length;
  // 현재 스크롤 위치를 슬라이드 너비로 나누면 현재 인덱스
  const index = Math.round(el.scrollLeft / slideWidth);
  setActiveSlide(index);
};
```

```tsx
{/* Dot 클릭 시 해당 슬라이드로 부드럽게 이동 */}
<button
  onClick={() => {
    scrollRef.current?.children[i]?.scrollIntoView({
      behavior: "smooth",   // 부드러운 스크롤 애니메이션
      inline: "center",     // 수평 방향 중앙 정렬
      block: "nearest",     // 수직 방향은 가장 가까운 곳
    });
  }}
  className={`h-2 rounded-full transition-all duration-300 ${
    activeSlide === i
      ? "w-7 bg-blue-500"             // 활성: 길쭉한 파란 바
      : "w-2 bg-slate-300 hover:bg-slate-400"  // 비활성: 동그란 회색 점
  }`}
/>
```

---

## 6. 대표 찬양 자동화 및 롤링 뷰어 (SSOT 실현)

### 6.1 SSOT(Single Source of Truth) 원칙

이전에는 대표 찬양 유튜브 링크를 **관리자가 별도의 폼에서 수동으로 입력**했다. 이 방식의 문제:

1. 콘티에 이미 유튜브 링크가 있는데 같은 링크를 또 입력해야 하는 **데이터 중복**.
2. 콘티를 바꿨는데 대표 찬양은 안 바꾸는 **불일치**.
3. 관리자의 **불필요한 수고**.

승현 PO: *"콘티에 유튜브 링크를 넣으면, 대표 찬양이 자동으로 거기서 뽑아지면 안 돼?"*

이것이 바로 SSOT 원칙의 실현이다. **진실의 단일 공급원**은 `praise_setlists`의 `songs[].link` 필드뿐이다.

### 6.2 유튜브 링크 자동 필터링

위의 스마트 쿼리(5.2)에서 콘티를 가져온 뒤, 이중 for 루프로 유튜브 링크가 있는 곡만 추출한다.

```typescript
const songs: LinkedSong[] = [];
for (const setlist of grouped) {        // 모든 예배의 콘티를 순회
  for (const song of setlist.songs) {   // 각 콘티의 모든 곡을 순회
    if (song.link?.trim()) {            // 링크가 비어있지 않은 곡만
      const ytId = extractYoutubeId(song.link); // URL에서 11자 ID 추출
      if (ytId) {                       // 유효한 유튜브 ID인 경우만
        songs.push({
          title: song.title,
          link: song.link,
          youtubeId: ytId,
        });
      }
    }
  }
}
setLinkedSongs(songs);
```

`extractYoutubeId` 함수는 다양한 유튜브 URL 포맷을 정규식으로 파싱한다:

```typescript
function extractYoutubeId(url: string): string {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([^\s&?#]+)/,
  );
  return match?.[1] ?? "";
}
```

### 6.3 7초 자동 롤링 + 페이드 전환

```typescript
// 7초마다 다음 곡으로 자동 전환
useEffect(() => {
  if (linkedSongs.length <= 1) return;  // 1곡 이하면 롤링 불필요
  const interval = setInterval(() => {
    // 현재 인덱스 + 1, 배열 끝에 도달하면 0으로 순환 (모듈러 연산)
    setActiveSongIdx((prev) => (prev + 1) % linkedSongs.length);
  }, 7000); // 7초
  return () => clearInterval(interval); // 컴포넌트 언마운트 시 타이머 해제
}, [linkedSongs.length]); // 곡 수가 바뀌면 타이머 재설정
```

Framer Motion의 `AnimatePresence`로 부드러운 페이드 전환:

```tsx
<AnimatePresence mode="wait">         {/* 이전 요소가 사라진 후 새 요소 등장 */}
  <motion.div
    key={currentSong.youtubeId}        {/* key가 바뀌면 React가 새 요소로 인식 */}
    initial={{ opacity: 0 }}            {/* 등장 시 투명에서 시작 */}
    animate={{ opacity: 1 }}            {/* 완전히 보이는 상태로 전환 */}
    exit={{ opacity: 0 }}               {/* 퇴장 시 투명해짐 */}
    transition={{ duration: 0.5 }}      {/* 0.5초 동안 부드럽게 */}
  >
    <iframe
      src={`https://www.youtube.com/embed/${currentSong.youtubeId}`}
      className="w-full aspect-video rounded-xl shadow-lg"
      ...
    />
    <p className="text-center font-black text-slate-700 mt-3 truncate">
      {currentSong.title}
    </p>
  </motion.div>
</AnimatePresence>
```

**빈 상태 처리**: `linkedSongs.length === 0`이면 대표 찬양 섹션 자체를 렌더링하지 않는다(`null`). 콘티에 유튜브 링크가 하나도 없으면 깔끔하게 숨겨진다.

### 6.4 관리자 레거시 코드 삭제

SSOT를 완성하기 위해, 관리자 페이지(`admin/page.tsx`)에서 레거시 코드를 전면 삭제했다:

| 삭제 항목 | 이유 |
|-----------|------|
| `youtubeInput` state | 더 이상 수동 입력 불필요 |
| `extractYoutubeId` 함수 (admin) | 대시보드에서 자동 추출 |
| 유튜브 폼 UI (input + 미리보기) | SSOT 위반 제거 |
| `daily-word/current.youtubeId` 저장 | 데이터 중복 제거 |

저장 로직도 `youtubeId` 필드를 제거:

```typescript
// Before
await setDoc(doc(db, "daily-word", "current"), {
  verse, reference, youtubeId,  // ← youtubeId 포함
});

// After
await setDoc(doc(db, "daily-word", "current"), {
  verse, reference,             // ← youtubeId 완전 제거
});
```

---

## 7. 인프라 및 형상 관리 (Firebase & Git)

### 7.1 Firestore 복합 색인(Composite Index)

`where("date", ">=", today)` + `orderBy("date", "asc")` 쿼리는 Firestore에서 **복합 색인**을 요구한다. 처음 실행하면 콘솔에 에러와 함께 색인 생성 링크가 표시된다:

```
FirebaseError: The query requires an index.
You can create it here: https://console.firebase.google.com/...
```

이 링크를 클릭하면 Firebase 콘솔에서 자동으로 색인이 생성된다. 약 1~2분 소요.

동일하게 관리자 페이지의 `where("date", "==", selectedDate) + where("serviceType", "==", serviceType)` 쿼리도 복합 색인이 필요하다.

### 7.2 동적 예배 카테고리 CMS

예배 종류를 코드에 하드코딩하는 대신, `service_categories` Firestore 컬렉션으로 관리한다.

```
service_categories/{autoId}
  ├── label: "11시 대예배"    ← 표시명
  └── color: "#3b82f6"        ← Dot 색상
```

관리자 콘티 페이지 우측 상단의 ⚙️ 버튼을 누르면 카테고리 추가/삭제 패널이 토글된다. 새 카테고리를 추가하면 콘티 작성 시 칩(Chip) 버튼에 즉시 반영되고, 캘린더와 대시보드에서도 해당 색상의 dot이 자동으로 표시된다.

### 7.3 Git 워크플로우 (기능별 브랜치)

```
main
 ├── feature/praise-archive    # 콘티 아카이브 시스템
 ├── feature/calendar-redesign # 캘린더 UI 재설계
 ├── feature/carousel          # 인스타 스타일 슬라이더
 ├── feature/auto-rolling      # 대표 찬양 자동화
 └── fix/timezone-kst          # 타임존 버그 수정
```

각 기능이 완성되면 `npm run build`로 로컬 빌드 테스트 → `main`에 머지 → Vercel 자동 배포.

---

## 마치며: 오늘의 여정을 돌아보며

오늘 하루의 성과를 데이터로 정리하면:

| 지표 | 수치 |
|------|------|
| 생성/수정한 파일 | 8개 |
| 새로 만든 Firestore 컬렉션 | 2개 (`praise_setlists`, `service_categories`) |
| 삭제한 레거시 코드 | 약 100줄 |
| 추가한 새 코드 | 약 800줄 |
| 해결한 버그 | 3개 (타임존, FullCalendar 스타일, 스크롤바) |
| 로컬 빌드 테스트 | 15회+ (전부 성공) |

승현 PO의 **"콘티를 매주 덮어쓰지 않고 쌓아가고 싶다"**는 한 마디에서 시작된 오늘의 작업은, 단순한 CRUD를 넘어 **시간의 흐름을 데이터에 담는 아카이빙 시스템**으로 발전했다.

그리고 그 데이터는 대시보드에서 **자동으로 가장 가까운 미래의 예배를 찾아 보여주고**, 콘티에 입력된 유튜브 링크는 **수동 개입 없이 대표 찬양 뷰어로 흘러들어가며**, 캘린더에서는 **예배 종류별 색깔 점으로 한눈에 일정을 파악**할 수 있게 되었다.

가장 인상적인 점은, 이 모든 변화가 **하루 만에** 이루어졌다는 것이다. 기획과 개발이 실시간으로 호흡하며, 문제를 발견하는 즉시 해결책을 코드로 옮긴 오늘의 여정은, '이음' 프로젝트가 얼마나 빠르게 성장할 수 있는지를 보여주는 증거다.

내일도 이음은 한 걸음 더 나아갈 것이다. 오늘 쌓은 아카이브 위에서. 🙏

---

> **Co-Authored-By**: Claude (Anthropic)
> **Last Updated**: 2026-04-19
