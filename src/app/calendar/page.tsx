"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
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
  Plus,
  X,
  Clock,
  Pencil,
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
import Link from "next/link";

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

interface ChurchSchedule {
  id: string;
  date: string;
  title: string;
  time?: string;
  description?: string;
}

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

const SCHEDULE_DOT_COLOR = "#f97316"; // orange-500
const RECURRING_DOT_COLOR = "#8b5cf6"; // violet-500

interface RecurringService {
  name: string;
  time: string;
  day: string;
  dayNum: number; // 0=일~6=토, 7=매일
  canceled_dates?: string[];
}

// 30분 단위 시간 옵션 (오전 06:00 ~ 오후 11:30)
const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "시간 지정 안 함 (종일)" },
  ...Array.from({ length: 36 }, (_, i) => {
    const totalMinutes = (6 * 60) + (i * 30); // 06:00부터 시작
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const period = h < 12 ? "오전" : "오후";
    const displayH = h <= 12 ? h : h - 12;
    const label = `${period} ${displayH}:${m.toString().padStart(2, "0")}`;
    return { value: label, label };
  }),
];

// 찬양 콘티 카테고리 렌더링 우선순위
const CATEGORY_ORDER = [
  "11시 대예배",
  "주일학교",
  "윙윙찬양(유치부)",
  "이글찬양(학생부)",
  "청년부 예배",
  "수요예배",
  "금요철야",
];

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const { isAdmin } = useAuth();
  const [setlists, setSetlists] = useState<PraiseSetlist[]>([]);
  const [schedules, setSchedules] = useState<ChurchSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deleting, setDeleting] = useState(false);

  // 반복 예배 일정
  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);

  // 일정 추가 모달
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addingSched, setAddingSched] = useState(false);

  // 카테고리
  const [categories, setCategories] = useState<{ id: string; label: string; color: string; order?: number }[]>([]);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "service_categories"));
      if (!snap.empty) {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as { id: string; label: string; color: string; order?: number }[]);
      }
    })();
  }, []);

  const getServiceLabel = (type: string) =>
    categories.find((c) => c.id === type)?.label || SERVICE_LABELS[type] || type;
  const getServiceColor = (type: string) =>
    categories.find((c) => c.id === type)?.color || SERVICE_COLORS[type] || "#3b82f6";

  // 데이터 패칭
  const fetchAll = async () => {
    const [setlistSnap, scheduleSnap, worshipSnap] = await Promise.all([
      getDocs(collection(db, "praise_setlists")),
      getDocs(collection(db, "church_schedules")),
      getDoc(doc(db, "worship-schedule", "current")),
    ]);
    setSetlists(setlistSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as PraiseSetlist[]);
    setSchedules(scheduleSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as ChurchSchedule[]);
    if (worshipSnap.exists() && worshipSnap.data().services?.length) {
      setRecurringServices(worshipSnap.data().services as RecurringService[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // 콘티 삭제
  const handleDeleteSetlist = async (id: string) => {
    if (!confirm("이 콘티를 정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    await deleteDoc(doc(db, "praise_setlists", id));
    await fetchAll();
    setDeleting(false);
  };

  // 일정 삭제
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    setDeleting(true);
    await deleteDoc(doc(db, "church_schedules", id));
    await fetchAll();
    setDeleting(false);
  };

  // 일정 추가
  const handleAddSchedule = async () => {
    if (!newTitle.trim()) return;
    setAddingSched(true);
    await addDoc(collection(db, "church_schedules"), {
      date: format(selectedDate, "yyyy-MM-dd"),
      title: newTitle.trim(),
      time: newTime.trim() || "",
      description: newDesc.trim() || "",
      createdAt: serverTimestamp(),
    });
    setNewTitle("");
    setNewTime("");
    setNewDesc("");
    setShowAddForm(false);
    await fetchAll();
    setAddingSched(false);
  };

  // 달력 계산
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 시간 문자열 → 분 변환 (정렬용)
  // "오전 11:00" → 660, "오후 2:00" → 840
  // 시간 있으면 해당 분 반환, 없으면 Infinity(시간 없는 일정은 맨 뒤)
  const parseTimeToMinutes = (time: string): number => {
    if (!time?.trim()) return Infinity;
    const cleaned = time.replace(/\s/g, "");
    const match = cleaned.match(/^(오전|오후)?(\d{1,2}):?(\d{2})?/);
    if (!match) return Infinity;
    let hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3] || "0", 10);
    if (match[1] === "오후" && hours < 12) hours += 12;
    if (match[1] === "오전" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // 카테고리 라벨 기준 우선순위 (CATEGORY_ORDER 배열의 indexOf)
  const getCategoryPriority = (serviceType: string): number => {
    const label = getServiceLabel(serviceType);
    const idx = CATEGORY_ORDER.indexOf(label);
    return idx === -1 ? CATEGORY_ORDER.length : idx;
  };

  // 특정 날짜에 해당하는 반복 예배 일정을 동적으로 생성
  const getRecurringForDate = (date: Date): (ChurchSchedule & { _recurringIdx?: number })[] => {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, "yyyy-MM-dd");
    return recurringServices
      .map((svc, idx) => ({ ...svc, _origIdx: idx }))
      .filter((svc) =>
        (svc.dayNum === dayOfWeek || svc.dayNum === 7) &&
        !(svc.canceled_dates ?? []).includes(dateStr) // 예외 날짜 제외
      )
      .map((svc) => ({
        id: `recurring-${dateStr}-${svc._origIdx}`,
        date: dateStr,
        title: svc.name,
        time: svc.time,
        description: svc.day,
        _recurringIdx: svc._origIdx, // Firestore 배열 인덱스 (제외 시 사용)
      } as ChurchSchedule & { _recurringIdx?: number }));
  };

  // 정기 예배 특정 날짜 제외
  const handleCancelRecurring = async (recurringIdx: number, dateStr: string) => {
    if (!confirm("이 날짜의 정기 예배를 취소(제외)하시겠습니까?")) return;
    setDeleting(true);
    // 현재 services 배열을 가져와서 해당 인덱스의 canceled_dates에 날짜 추가
    const snap = await getDoc(doc(db, "worship-schedule", "current"));
    if (snap.exists()) {
      const services = snap.data().services as RecurringService[];
      if (services[recurringIdx]) {
        const existing = services[recurringIdx].canceled_dates ?? [];
        if (!existing.includes(dateStr)) {
          services[recurringIdx].canceled_dates = [...existing, dateStr];
          await setDoc(doc(db, "worship-schedule", "current"), { services });
        }
      }
    }
    await fetchAll();
    setDeleting(false);
  };

  // 날짜별 데이터 (정렬 포함)
  const getDataForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");

    // 일반 일정 (DB) + 반복 예배 일정 (동적 생성) 병합 후 시간순 정렬
    const manualSchedules = schedules.filter((s) => s.date === dateStr);
    const recurringSchedules = getRecurringForDate(date);
    const allSchedules = [...manualSchedules, ...recurringSchedules]
      .sort((a, b) => {
        const timeDiff = parseTimeToMinutes(a.time || "") - parseTimeToMinutes(b.time || "");
        if (timeDiff !== 0) return timeDiff;
        return (a.title || "").localeCompare(b.title || "", "ko-KR");
      });

    // 찬양 콘티: CATEGORY_ORDER 배열 순서대로 강제 정렬
    const sortedSetlists = setlists
      .filter((s) => (s.date || s.id) === dateStr)
      .sort((a, b) => getCategoryPriority(a.serviceType || "") - getCategoryPriority(b.serviceType || ""));

    return {
      schedules: allSchedules,
      setlists: sortedSetlists,
    };
  };

  // Dot 색상 배열 (반복 예배 + 일반 일정 + 콘티 합산)
  const getDotsForDate = (date: Date): string[] => {
    const { setlists: sl, schedules: sc } = getDataForDate(date);
    const dots: string[] = [];
    // 일정 (반복 예배는 보라, 일반은 주황)
    sc.forEach((s) => {
      const isRecurring = s.id.startsWith("recurring-");
      dots.push(isRecurring ? RECURRING_DOT_COLOR : SCHEDULE_DOT_COLOR);
    });
    // 콘티
    sl.forEach((s) => dots.push(getServiceColor(s.serviceType || "")));
    return dots.slice(0, 4);
  };

  const selectedData = getDataForDate(selectedDate);
  const hasAnyData = selectedData.setlists.length > 0 || selectedData.schedules.length > 0;

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
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                </button>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {format(currentMonth, "yyyy년 M월", { locale: ko })}
                </h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day, i) => (
                  <div key={day} className={`text-center font-black text-sm py-2 ${
                    i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"
                  }`}>{day}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  const dots = getDotsForDate(day);
                  const dayOfWeek = day.getDay();

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => { setSelectedDate(day); setShowAddForm(false); }}
                      className={`relative flex flex-col items-center pt-2 min-h-[3.5rem] sm:min-h-[4rem] rounded-xl sm:rounded-2xl transition-all ${
                        !isCurrentMonth ? "text-slate-300"
                          : isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : isToday ? "bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                          : dayOfWeek === 0 ? "text-red-500 hover:bg-red-50"
                          : dayOfWeek === 6 ? "text-blue-500 hover:bg-blue-50"
                          : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm sm:text-base font-black">{format(day, "d")}</span>
                      {dots.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {dots.map((color, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : color }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 범례 */}
              <div className="flex items-center justify-center gap-3 mt-4 text-xs font-bold text-slate-400">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RECURRING_DOT_COLOR }} />예배
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SCHEDULE_DOT_COLOR }} />일정
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />콘티
                </div>
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
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })}
            </h3>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                  showAddForm
                    ? "bg-slate-200 text-slate-600"
                    : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                }`}
              >
                {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showAddForm ? "취소" : "일정 추가"}
              </button>
            )}
          </div>

          {/* 인라인 일정 추가 폼 (관리자 전용) */}
          {showAddForm && isAdmin && (
            <div className="bg-orange-50 rounded-[2rem] border border-orange-200 shadow-sm p-5 sm:p-6 mb-4 space-y-3">
              <h4 className="text-base font-black text-orange-800">새 일정 추가</h4>
              <input
                type="text"
                value={newTitle || ""}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="일정 제목 (예: 부활절 연합예배)"
                className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 bg-white text-base font-bold text-slate-900 placeholder:text-slate-300 focus:border-orange-400 focus:outline-none transition-colors"
                autoFocus
              />
              <select
                value={newTime || ""}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 bg-white text-base font-bold text-slate-900 focus:border-orange-400 focus:outline-none transition-colors"
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newDesc || ""}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="설명 (선택)"
                className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 bg-white text-base font-bold text-slate-900 placeholder:text-slate-300 focus:border-orange-400 focus:outline-none transition-colors"
              />
              <button
                onClick={handleAddSchedule}
                disabled={addingSched || !newTitle.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black text-base transition-colors"
              >
                {addingSched ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingSched ? "추가 중..." : "일정 등록"}
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* 일반 교회 일정 */}
            {selectedData.schedules.map((sched) => {
              const isRecurring = sched.id.startsWith("recurring-");
              const recurringIdx = (sched as ChurchSchedule & { _recurringIdx?: number })._recurringIdx;
              return (
              <div key={sched.id}
                className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: isRecurring ? RECURRING_DOT_COLOR : SCHEDULE_DOT_COLOR }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-slate-900 truncate">
                        {sched.title || ""}
                      </h4>
                      {isRecurring && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: RECURRING_DOT_COLOR + "15", color: RECURRING_DOT_COLOR }}>
                          정기
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sched.time && (
                        <span className={`flex items-center gap-1 text-sm font-bold ${isRecurring ? "text-violet-600" : "text-orange-600"}`}>
                          <Clock className="w-3 h-3" />{sched.time}
                        </span>
                      )}
                      {sched.description && (
                        <span className="text-sm font-bold text-slate-400">{sched.description}</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && !isRecurring && (
                    <button onClick={() => handleDeleteSchedule(sched.id)} disabled={deleting}
                      className="shrink-0 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="일정 삭제">
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {isAdmin && isRecurring && recurringIdx !== undefined && (
                    <button
                      onClick={() => handleCancelRecurring(recurringIdx, sched.date)}
                      disabled={deleting}
                      className="shrink-0 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="이 날짜만 제외"
                    >
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              );
            })}

            {/* 찬양 콘티 */}
            {selectedData.setlists.map((setlist) => (
              <div key={setlist.id}
                className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getServiceColor(setlist.serviceType || "") }} />
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
                    <div className="flex items-center gap-1">
                      <Link href="/admin/praise"
                        className="shrink-0 w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-500 transition-colors"
                        title="콘티 수정">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => handleDeleteSetlist(setlist.id)} disabled={deleting}
                        className="shrink-0 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
                {setlist.songs.length > 0 ? (
                  <div className="space-y-2">
                    {setlist.songs.map((song, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-slate-50">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs">{i + 1}</span>
                        <span className="flex-1 font-bold text-slate-900 text-sm sm:text-base truncate">{song.title || ""}</span>
                        {song.link && (
                          <a href={song.link} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-500 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-400 text-center py-3">등록된 곡이 없습니다.</p>
                )}
              </div>
            ))}

            {/* 비어있을 때 */}
            {!hasAnyData && !showAddForm && (
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center">
                <Music className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-base font-bold text-slate-400">
                  이 날짜에 등록된 일정이 없습니다.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
