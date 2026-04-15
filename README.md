# 🌿 이음 (E-EUM) : 세대와 마음을 잇는 교회 대시보드
> 파편화된 소통을 하나로 모으고, 전 세대가 함께 누리는 스마트 커뮤니티 워크스페이스

## 1. Background & Problem (문제 정의)
현재 교회 내 공동체(찬양팀, 청년부 등)는 주로 카카오톡 단체방을 통해 소통하고 있으나, 다음과 같은 한계가 존재합니다.
* **Information Overload:** 일상적인 대화와 중요 공지(합주 시간, 장소)가 섞여 중요 일정이 상단으로 유실됨.
* **Resource Fragmentation:** 매주 공유되는 유튜브 링크, 악보, 주보 등이 체계적으로 저장되지 않아 매번 다시 검색해야 하는 피로도 발생.
* **Accessibility:** 디지털 기기에 서툰 중장년층 및 노년층 교인들이 작은 글씨와 복잡한 네비게이션을 가진 기존 서비스에 적응하기 어려움.

## 2. Solution & MVP Features (해결책 및 최소 기능)
어린이부터 어르신까지 누구나 직관적으로 사용할 수 있는 **초간단 UI 기반의 중앙 집중형 대시보드**를 제공합니다.

* 📖 **모바일 주보 뷰어 (Mobile Bulletin):** 어르신들을 배려하여 큼직하고 손가락으로 확대 가능한(Pinch-to-zoom) 주보 전용 페이지 제공.
* 🎵 **찬양 플레이리스트 (Worship Board):** YouTube API를 연동하여 이번 주 합주/찬양곡 리스트를 대형 카드 형태로 직관화.
* 🗓️ **스마트 일정 투표 (Smart Scheduler):** 복잡한 표 대신, 직관적인 큼직한 터치형 타임블록을 통한 합주 및 모임 시간 조율 (When2meet 모바일 최적화).
* ✨ **오늘의 말씀 (Daily Spirit):** 대시보드 최상단에 매일 업데이트되는 성경 구절을 배치하여 앱 접속 유도.

## 3. Tech Stack (기술 스택)
* **Frontend:** Next.js 14 (App Router), Tailwind CSS, Shadcn/UI
* **Backend (BaaS):** Firebase (Firestore, Storage, Authentication)
* **Data Tracking:** Google Analytics (GA4)

## 4. Target & Milestone (단기 목표)
* **1차 타겟:** 본인이 속한 교회 찬양팀 및 공동체 지인.
* **마일스톤:** 2026년 4월 23일(목)까지 Google Analytics 기준 **초기 사용자 10명 확보** 및 사용자 이벤트 지표 분석.

## 5. Scalability Vision (확장성 고려)
초기 버전은 단일 공동체를 위한 MVP이나, 향후 전국 교회 대상의 SaaS형 서비스 확장을 고려하여 데이터베이스를 설계합니다.
* **Multi-Tenancy:** 모든 데이터(일정, 플레이리스트)에 `teamId`를 참조하게 하여 다른 공동체의 데이터와 철저히 분리되도록 구조화 예정.
