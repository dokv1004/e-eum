"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Music,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ko } from "date-fns/locale";

interface SetlistSong {
  title: string;
  link?: string;
}

interface PraiseSetlist {
  id: string;
  date: string;
  serviceType?: string;
  title: string;
  songs: SetlistSong[];
}

// 예배 종류별 dot 색상
const SERVICE_COLORS: Record<string, string> = {
  sunday_main: "#3b82f6",
  wednesday: "#22c55e",
  friday: "#a855f7",
  youth: "#f59e0b",
  sunday_school: "#ec4899",
  eagle: "#ef4444",
  wingwing: "#14b8a6",
};

const SERVICE_LABELS: Record<string, string> = {
  sunday_main: "11시 대예배",
  wednesday: "수요예배",
  friday: "금요철야",
  youth: "청년부 예배",
  sunday_school: "주일학교",
  eagle: "이글찬양",
  wingwing: "윙윙찬양",
};

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const { isAdmin } = useAuth();
  const [setlists, setSetlists] = useState<PraiseSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deleting, setDeleting] = useState(false);

  // Firestore에서 카테고리 불러오기
  const [categories, setCategories] = useState<{ id: string; label: string; color: string }[]>([]);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "service_categories"));
      if (!snap.empty) {
        const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as { id: string; label: string; color: string }[];
        setCategories(cats);
      }
    })();
  }, []);

  const getServiceLabel = (type: string) =>
    categories.find((c) => c.id === type)?.label || SERVICE_LABELS[type] || type;

  const getServiceColor = (type: string) =>
    categories.find((c) => c.id === type)?.color || SERVICE_COLORS[type] || "#3b82f6";

  const fetchSetlists = async () => {
    const snap = await getDocs(collection(db, "praise_setlists"));
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as PraiseSetlist[];
    setSetlists(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSetlists();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("이 콘티를 정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    await deleteDoc(doc(db, "praise_setlists", id));
    await fetchSetlists();
    setDeleting(false);
  };

  // 달력 계산
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 날짜별 콘티 그룹
  const getSetlistsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return setlists.filter((s) => (s.date || s.id) === dateStr);
  };

  const selectedSetlists = getSetlistsForDate(selectedDate);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            캘린더
          </h1>
        </div>

        {/* Calendar Card */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 sm:p-8">
          {loading ? (
            <Skeleton className="w-full h-[400px] rounded-xl" />
          ) : (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                </button>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {format(currentMonth, "yyyy년 M월", { locale: ko })}
                </h2>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day, i) => (
                  <div
                    key={day}
                    className={`text-center font-black text-sm py-2 ${
                      i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  const daySetlists = getSetlistsForDate(day);
                  const dayOfWeek = day.getDay();

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`relative flex flex-col items-center pt-2 min-h-[3.5rem] sm:min-h-[4rem] rounded-xl sm:rounded-2xl transition-all ${
                        !isCurrentMonth
                          ? "text-slate-300"
                          : isSelected
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : isToday
                              ? "bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                              : dayOfWeek === 0
                                ? "text-red-500 hover:bg-red-50"
                                : dayOfWeek === 6
                                  ? "text-blue-500 hover:bg-blue-50"
                                  : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm sm:text-base font-black">
                        {format(day, "d")}
                      </span>
                      {/* Dots */}
                      {daySetlists.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {daySetlists.slice(0, 4).map((s, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor: isSelected
                                  ? "rgba(255,255,255,0.8)"
                                  : getServiceColor(s.serviceType || ""),
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Selected Date Detail */}
        <motion.div
          key={selectedDate.toISOString()}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 sm:mt-8"
        >
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-4 px-1">
            {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })}
          </h3>

          {selectedSetlists.length > 0 ? (
            <div className="space-y-4">
              {selectedSetlists.map((setlist) => (
                <div
                  key={setlist.id}
                  className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 sm:p-6"
                >
                  {/* 헤더 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: getServiceColor(setlist.serviceType || "") }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-black text-slate-900 truncate">
                        {setlist.title || getServiceLabel(setlist.serviceType || "")}
                      </h4>
                      {setlist.serviceType && (
                        <p className="text-sm font-bold text-slate-400">
                          {getServiceLabel(setlist.serviceType)}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(setlist.id)}
                        disabled={deleting}
                        className="shrink-0 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {deleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* 곡 리스트 */}
                  {setlist.songs.length > 0 ? (
                    <div className="space-y-2">
                      {setlist.songs.map((song, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-slate-50"
                        >
                          <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs">
                            {i + 1}
                          </span>
                          <span className="flex-1 font-bold text-slate-900 text-sm sm:text-base truncate">
                            {song.title || ""}
                          </span>
                          {song.link && (
                            <a
                              href={song.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-500 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-400 text-center py-3">
                      등록된 곡이 없습니다.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center">
              <Music className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-base font-bold text-slate-400">
                이 날짜에 등록된 콘티가 없습니다.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
