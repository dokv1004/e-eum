"use client";

import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { motion } from "motion/react";

interface CalendarEvent {
  date: string;
  title: string;
  color: string;
}

const sampleEvents: CalendarEvent[] = [
  { date: "2026-04-19", title: "주일 대예배", color: "bg-blue-500" },
  { date: "2026-04-16", title: "수요 예배", color: "bg-green-500" },
  { date: "2026-04-17", title: "금요 철야", color: "bg-purple-500" },
  { date: "2026-04-20", title: "청년부 MT", color: "bg-amber-500" },
  { date: "2026-04-26", title: "주일 대예배", color: "bg-blue-500" },
  { date: "2026-04-23", title: "수요 예배", color: "bg-green-500" },
  { date: "2026-04-24", title: "금요 철야", color: "bg-purple-500" },
];

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getEventsForDate = (date: Date) =>
    sampleEvents.filter((e) => e.date === format(date, "yyyy-MM-dd"));

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

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
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-slate-600" />
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-slate-600" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2 sm:mb-3">
            {weekDays.map((day, i) => (
              <div
                key={day}
                className={`text-center font-black text-sm sm:text-base py-2 ${
                  i === 0
                    ? "text-red-400"
                    : i === 6
                      ? "text-blue-400"
                      : "text-slate-400"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected =
                selectedDate && isSameDay(day, selectedDate);
              const dayEvents = getEventsForDate(day);
              const dayOfWeek = day.getDay();

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center justify-start pt-2 sm:pt-3 min-h-[3.5rem] sm:min-h-[4.5rem] rounded-xl sm:rounded-2xl transition-all ${
                    !isCurrentMonth
                      ? "text-slate-300"
                      : isSelected
                        ? "bg-blue-600 text-white shadow-lg"
                        : isToday
                          ? "bg-blue-50 text-blue-700 ring-2 ring-blue-300"
                          : dayOfWeek === 0
                            ? "text-red-500 hover:bg-red-50"
                            : dayOfWeek === 6
                              ? "text-blue-500 hover:bg-blue-50"
                              : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-base sm:text-lg font-black">
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((ev, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSelected ? "bg-white/80" : ev.color}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events */}
        {selectedDate && (
          <motion.div
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 sm:mt-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8"
          >
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-4">
              {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })}
            </h3>
            {selectedEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 sm:p-5 rounded-2xl bg-slate-50"
                  >
                    <div
                      className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0 ${ev.color}`}
                    />
                    <span className="text-lg sm:text-xl font-bold text-slate-800">
                      {ev.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-lg font-bold text-slate-400 text-center py-6">
                일정이 없습니다
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
