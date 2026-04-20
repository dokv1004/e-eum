"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Music, ListMusic, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";

interface ServiceItem {
  name: string;
  time: string;
  day: string;
}

interface DailyWord {
  verse: string;
  reference: string;
}

interface SetlistSong {
  title: string;
  link?: string;
}

interface PraiseSetlist {
  id: string;
  date: string;
  serviceType: string;
  title: string;
  songs: SetlistSong[];
}

interface ServiceCategory {
  id: string;
  label: string;
  color: string;
}

interface LinkedSong {
  title: string;
  link: string;
  youtubeId: string;
}

const DEFAULT_SERVICES: ServiceItem[] = [
  { name: "주일 대예배", time: "오전 11:00", day: "매주 일요일" },
  { name: "수요 예배", time: "오후 7:30", day: "매주 수요일" },
  { name: "금요 철야", time: "오후 9:00", day: "매주 금요일" },
  { name: "새벽 기도회", time: "오전 5:30", day: "월~토요일" },
];

function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function extractYoutubeId(url: string): string {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([^\s&?#]+)/,
  );
  return match?.[1] ?? "";
}

export default function Home() {
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [wordLoading, setWordLoading] = useState(true);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [servicesLoading, setServicesLoading] = useState(true);

  // 카테고리
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  // 콘티 슬라이드
  const [setlists, setSetlists] = useState<PraiseSetlist[]>([]);
  const [setlistsLoading, setSetlistsLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 자동 롤링 대표 찬양
  const [linkedSongs, setLinkedSongs] = useState<LinkedSong[]>([]);
  const [activeSongIdx, setActiveSongIdx] = useState(0);

  // 오늘의 말씀
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "daily-word", "current"),
      (snap) => {
        setDailyWord(snap.exists() ? (snap.data() as DailyWord) : null);
        setWordLoading(false);
      },
      () => { setDailyWord(null); setWordLoading(false); },
    );
    return () => unsubscribe();
  }, []);

  // 예배 시간
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

  // 카테고리
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "service_categories"));
      if (!snap.empty) {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceCategory)));
      }
    })();
  }, []);

  // 찬양 콘티 + 링크 있는 곡 추출
  useEffect(() => {
    (async () => {
      const today = getTodayKST();
      const q = query(
        collection(db, "praise_setlists"),
        where("date", ">=", today),
        orderBy("date", "asc"),
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setSetlists([]);
        setLinkedSongs([]);
        setSetlistsLoading(false);
        return;
      }

      const nearestDate = snap.docs[0].data().date as string;
      const grouped = snap.docs
        .filter((d) => d.data().date === nearestDate)
        .map((d) => ({ id: d.id, ...d.data() } as PraiseSetlist));

      setSetlists(grouped);

      // 모든 콘티에서 유튜브 링크가 있는 곡만 추출
      const songs: LinkedSong[] = [];
      for (const setlist of grouped) {
        for (const song of setlist.songs) {
          if (song.link?.trim()) {
            const ytId = extractYoutubeId(song.link);
            if (ytId) {
              songs.push({ title: song.title, link: song.link, youtubeId: ytId });
            }
          }
        }
      }
      setLinkedSongs(songs);
      setSetlistsLoading(false);
    })();
  }, []);

  // 7초 자동 롤링
  useEffect(() => {
    if (linkedSongs.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSongIdx((prev) => (prev + 1) % linkedSongs.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [linkedSongs.length]);

  // 슬라이드 dot
  const handleScroll = () => {
    if (!scrollRef.current || setlists.length <= 1) return;
    const el = scrollRef.current;
    const slideWidth = el.scrollWidth / setlists.length;
    const index = Math.round(el.scrollLeft / slideWidth);
    setActiveSlide(index);
  };

  const formatDateBadge = (dateStr: string) => {
    try {
      return format(parse(dateStr, "yyyy-MM-dd", new Date()), "M/d (EEEE)", { locale: ko });
    } catch { return dateStr; }
  };

  const card = "w-full max-w-md mx-auto lg:max-w-none";
  const currentSong = linkedSongs[activeSongIdx];

  return (
    <div className="pb-20 selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* ===== Left Column ===== */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-8 order-3 lg:order-none lg:col-span-2 w-full min-w-0"
          >
            {/* ===== 대표 찬양 자동 롤링 ===== */}
            {setlistsLoading ? (
              <div className={`${card} bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8`}>
                <div className="flex flex-col items-center mb-5">
                  <Skeleton className="w-12 h-12 rounded-2xl mb-3" />
                  <Skeleton className="h-7 w-36 rounded-md" />
                </div>
                <Skeleton className="w-full aspect-video rounded-xl" />
              </div>
            ) : linkedSongs.length > 0 && currentSong ? (
              <div className={`${card} bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8`}>
                <div className="flex flex-col items-center mb-5 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                    <Music className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    이번 주 찬양
                  </h2>
                </div>

                {/* 유튜브 플레이어 — 페이드 전환 */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSong.youtubeId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <iframe
                      className="w-full aspect-video rounded-2xl shadow-lg"
                      src={`https://www.youtube.com/embed/${currentSong.youtubeId}`}
                      title={currentSong.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <p className="text-center text-base sm:text-lg font-black text-slate-700 mt-3 truncate">
                      {currentSong.title}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* 곡 선택 dot / 버튼 */}
                {linkedSongs.length > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {linkedSongs.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSongIdx(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          activeSongIdx === i
                            ? "w-7 bg-blue-500"
                            : "w-2 bg-slate-300 hover:bg-slate-400"
                        }`}
                        title={s.title}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* ===== 찬양 콘티 슬라이드 ===== */}
            <div
              className={`${card} bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden`}
            >
              <div className="flex flex-col items-center text-center p-6 sm:p-8 pb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                  <ListMusic className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  찬양 콘티
                </h2>
                {setlists.length > 0 && (
                  <span className="mt-1 px-3 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs sm:text-sm font-bold">
                    {formatDateBadge(setlists[0].date)}
                  </span>
                )}
              </div>

              {setlistsLoading ? (
                <div className="p-6 sm:p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : setlists.length > 0 ? (
                <>
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                  >
                    {setlists.map((setlist) => (
                      <div
                        key={setlist.id}
                        className="w-full shrink-0 snap-center p-6 sm:p-8 pt-4 space-y-3"
                      >
                        <div className="flex items-center justify-center mb-2">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-bold"
                            style={{
                              backgroundColor: (categories.find((c) => c.id === setlist.serviceType)?.color || "#3b82f6") + "15",
                              color: categories.find((c) => c.id === setlist.serviceType)?.color || "#3b82f6",
                            }}
                          >
                            {categories.find((c) => c.id === setlist.serviceType)?.label || setlist.serviceType}
                          </span>
                        </div>

                        {setlist.songs.map((song, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors"
                          >
                            <span className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-base sm:text-lg">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                                {song.title || ""}
                              </h3>
                            </div>
                            {song.link && (
                              <a
                                href={song.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors group"
                                title="링크 열기"
                              >
                                <Play
                                  className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 group-hover:text-red-600 ml-0.5"
                                  fill="currentColor"
                                />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {setlists.length > 1 && (
                    <div className="flex justify-center gap-2 py-5 border-t border-slate-100 mx-6 sm:mx-8">
                      {setlists.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            scrollRef.current?.children[i]?.scrollIntoView({
                              behavior: "smooth",
                              inline: "center",
                              block: "nearest",
                            });
                          }}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            activeSlide === i
                              ? "w-7 bg-blue-500"
                              : "w-2 bg-slate-300 hover:bg-slate-400"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <ListMusic className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-lg sm:text-xl font-bold text-slate-400 break-keep">
                    다가오는 콘티가 아직 등록되지 않았습니다.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* ===== Right Column ===== */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="lg:col-span-1 flex flex-col gap-6 w-full min-w-0"
          >
            {/* 오늘의 말씀 */}
            <div
              className="w-full bg-gradient-to-br from-blue-50 to-white rounded-[2rem] p-5 sm:p-8 border border-blue-100 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <svg className="w-36 h-36 sm:w-48 sm:h-48 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="relative z-10 space-y-5 sm:space-y-6 flex flex-col items-center justify-center text-center">
                <div className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 font-bold text-sm tracking-wide">
                  오늘의 말씀
                </div>
                {wordLoading ? (
                  <>
                    <Skeleton className="h-7 w-full max-w-sm rounded-md" />
                    <Skeleton className="h-7 w-3/4 max-w-xs rounded-md" />
                    <Skeleton className="h-5 w-28 rounded-md" />
                  </>
                ) : dailyWord ? (
                  <>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-relaxed break-keep tracking-tight">
                      {dailyWord.verse}
                    </h2>
                    <p className="text-base sm:text-lg font-bold text-blue-600">
                      {dailyWord.reference}
                    </p>
                  </>
                ) : (
                  <p className="text-lg sm:text-xl font-bold text-slate-400">
                    오늘의 말씀을 준비 중입니다.
                  </p>
                )}
              </div>
            </div>

            {/* 예배 시간 안내 */}
            <div
              className="w-full bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center"
            >
              <div className="w-full flex flex-col items-center justify-center mb-5 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  예배 시간 안내
                </h2>
              </div>
              <div className="w-full flex flex-col items-center justify-center space-y-3">
                {servicesLoading
                  ? [1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-full flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-slate-50 space-y-2">
                        <Skeleton className="h-5 w-28 rounded-md" />
                        <Skeleton className="h-5 w-20 rounded-md" />
                        <Skeleton className="h-4 w-24 rounded-md" />
                      </div>
                    ))
                  : services.map((service) => (
                      <div key={service.name} className="w-full flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900">{service.name}</h3>
                        <p className="text-lg sm:text-xl font-black text-blue-600 mt-1">{service.time}</p>
                        <p className="text-base sm:text-lg font-bold text-slate-400 mt-0.5">{service.day}</p>
                      </div>
                    ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
