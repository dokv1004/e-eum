"use client";

import { useState, useEffect } from "react";
import { Clock, Music, ListMusic, Play } from "lucide-react";
import { motion } from "motion/react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

interface ContiItem {
  title: string;
  youtubeUrl?: string;
}

interface ServiceItem {
  name: string;
  time: string;
  day: string;
}

interface DailyWord {
  verse: string;
  reference: string;
  youtubeId?: string;
  conti?: ContiItem[];
}

const DEFAULT_SERVICES: ServiceItem[] = [
  { name: "주일 대예배", time: "오전 11:00", day: "매주 일요일" },
  { name: "수요 예배", time: "오후 7:30", day: "매주 수요일" },
  { name: "금요 철야", time: "오후 9:00", day: "매주 금요일" },
  { name: "새벽 기도회", time: "오전 5:30", day: "월~토요일" },
];

export default function Home() {
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [wordLoading, setWordLoading] = useState(true);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [servicesLoading, setServicesLoading] = useState(true);

  // 오늘의 말씀 + 콘티
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

  const conti = dailyWord?.conti ?? [];
  const card = "w-full max-w-md mx-auto lg:max-w-none";

  return (
    <div className="pb-20 selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-start">
          {/* ===== Left Column ===== */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-8 order-3 lg:order-none w-full"
          >
            {/* 이번 주 찬양 미리듣기 */}
            <div
              className={`${card} bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col items-center`}
            >
              <div className="w-full flex flex-col items-center justify-center mb-5 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                  <Music className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  이번 주 찬양
                </h2>
              </div>
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
            </div>

            {/* 이번 주 찬양 콘티 */}
            <div
              className={`${card} bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5 sm:space-y-6`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                  <ListMusic className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  이번 주 찬양 콘티
                </h2>
              </div>

              {wordLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50"
                    >
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32 rounded-md" />
                        <Skeleton className="h-4 w-20 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conti.length > 0 ? (
                <div className="space-y-3">
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
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ListMusic className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-lg sm:text-xl font-bold text-slate-400 break-keep">
                    이번 주 콘티가 아직 등록되지 않았습니다.
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
            className="space-y-8 w-full contents lg:block lg:space-y-8"
          >
            {/* 오늘의 말씀 */}
            <div
              className={`${card} order-1 lg:order-none bg-gradient-to-br from-blue-50 to-white rounded-[2rem] p-8 sm:p-12 border border-blue-100 shadow-sm relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <svg
                  className="w-36 h-36 sm:w-48 sm:h-48 text-blue-900"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
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
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-relaxed break-keep tracking-tight">
                      {dailyWord.verse}
                    </h2>
                    <p className="text-lg sm:text-xl font-bold text-blue-600">
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

            {/* 예배 시간 안내 (Firestore + fallback) */}
            <div
              className={`${card} order-2 lg:order-none bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center`}
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
                      <div
                        key={i}
                        className="w-full flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-slate-50 space-y-2"
                      >
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
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
