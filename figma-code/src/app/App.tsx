import { useState, Fragment } from "react";
import {
  Play,
  Check,
  Calendar,
  Music,
  Users,
  Settings,
} from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function App() {
  const [selectedSlots, setSelectedSlots] = useState<string[]>(
    [],
  );
  const [activeSongId, setActiveSongId] = useState<number>(1);

  const verse = {
    text: '"내가 평생토록 여호와께 노래하며 내가 살아 있는 동안 내 하나님을 찬양하리로다"',
    reference: "(시편 104:33)",
  };

  const songs = [
    {
      id: 1,
      title: "Way Maker",
      subtitle: "인도자: 김인도",
      thumbnail:
        "https://images.unsplash.com/photo-1521547418549-6a31aad7c177?w=800&h=450&fit=crop&q=80",
    },
    {
      id: 2,
      title: "Goodness of God",
      subtitle: "인도자: 이찬양",
      thumbnail:
        "https://images.unsplash.com/photo-1605515149677-061ca53a8221?w=800&h=450&fit=crop&q=80",
    },
    {
      id: 3,
      title: "Great Are You Lord",
      subtitle: "인도자: 박워십",
      thumbnail:
        "https://images.unsplash.com/photo-1536594527669-2f555de54e95?w=800&h=450&fit=crop&q=80",
    },
  ];

  const days = ["목", "금", "토"];
  const times = ["오후 6시", "오후 7시", "오후 8시"];

  const existingVotes: Record<string, number> = {
    "목-오후 6시": 2,
    "목-오후 7시": 5,
    "목-오후 8시": 1,
    "금-오후 6시": 0,
    "금-오후 7시": 8,
    "금-오후 8시": 4,
    "토-오후 6시": 10,
    "토-오후 7시": 6,
    "토-오후 8시": 3,
  };
  const MAX_VOTES = 10;

  const toggleSlot = (id: string) => {
    setSelectedSlots((prev) =>
      prev.includes(id)
        ? prev.filter((slotId) => slotId !== id)
        : [...prev, id],
    );
  };

  const currentDate = format(
    new Date(),
    "yyyy년 M월 d일 (EEEE)",
    { locale: ko },
  );

  const activeSong =
    songs.find((s) => s.id === activeSongId) || songs[0];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Sola Log
            </h1>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#"
                className="flex items-center gap-2 text-blue-600 font-bold text-lg"
              >
                <Calendar className="w-5 h-5" />
                대시보드
              </a>
              <a
                href="#"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-lg transition-colors"
              >
                <Music className="w-5 h-5" />
                악보/콘티
              </a>
              <a
                href="#"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-lg transition-colors"
              >
                <Users className="w-5 h-5" />
                팀원
              </a>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-lg font-bold text-slate-400 hidden lg:block">
              {currentDate}
            </div>
            <button className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-start">
          {/* Left Column: Worship Music */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Video Player Placeholder */}
            <div className="bg-slate-900 rounded-[2rem] aspect-video relative overflow-hidden shadow-lg group cursor-pointer border border-slate-200/50">
              <img
                src={activeSong.thumbnail}
                alt={activeSong.title}
                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-blue-600/90 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 transition-all duration-300 shadow-xl">
                  <Play
                    className="w-12 h-12 text-white ml-2 drop-shadow-md"
                    fill="currentColor"
                  />
                </div>
              </div>

              <div className="absolute bottom-8 left-8 right-8">
                <h2 className="text-4xl font-black text-white drop-shadow-lg tracking-tight">
                  {activeSong.title}
                </h2>
                <p className="text-xl font-bold text-blue-200 mt-2 drop-shadow-md">
                  {activeSong.subtitle}
                </p>
              </div>
            </div>

            {/* Playlist */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                이번 주 찬양 콘티
              </h2>
              <div className="space-y-4">
                {songs.map((song) => {
                  const isActive = song.id === activeSongId;
                  return (
                    <motion.button
                      key={song.id}
                      onClick={() => setActiveSongId(song.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full flex items-center p-4 rounded-2xl border-2 text-left transition-colors ${
                        isActive
                          ? "bg-blue-50 border-blue-500 shadow-sm"
                          : "bg-white border-slate-100 hover:border-blue-200"
                      }`}
                    >
                      <div className="w-24 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-100 relative">
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center backdrop-blur-[2px]">
                            <Play
                              className="w-8 h-8 text-white drop-shadow-md"
                              fill="currentColor"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 ml-6">
                        <h3
                          className={`text-xl font-black truncate tracking-tight ${isActive ? "text-blue-900" : "text-slate-900"}`}
                        >
                          {song.title}
                        </h3>
                        <p
                          className={`text-lg font-bold mt-1 ${isActive ? "text-blue-700" : "text-slate-500"}`}
                        >
                          {song.subtitle}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Schedule & Verse */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.1,
              ease: "easeOut",
            }}
            className="space-y-8"
          >
            {/* Daily Verse Card */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-[2rem] p-10 sm:p-12 border border-blue-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Calendar className="w-48 h-48 text-blue-900" />
              </div>
              <div className="relative z-10 space-y-6 flex flex-col items-center justify-center text-center">
                <div className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 font-bold text-sm tracking-wide">
                  오늘의 말씀
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-relaxed break-keep tracking-tight">
                  {verse.text}
                </h2>
                <p className="text-xl font-bold text-blue-600">
                  {verse.reference}
                </p>
              </div>
            </div>

            {/* Voting Table */}
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  연습 시간 투표
                </h2>
                <p className="text-xl font-bold text-slate-500">
                  가능한 시간을 모두 선택해주세요
                </p>
              </div>

              <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 sm:gap-4 items-center">
                {/* Header */}
                <div />
                {days.map((day) => (
                  <div
                    key={day}
                    className="text-center font-black text-2xl text-slate-800 pb-4 border-b-2 border-slate-100"
                  >
                    {day}
                  </div>
                ))}

                {/* Body */}
                {times.map((time) => (
                  <Fragment key={time}>
                    <div className="text-right font-black text-lg sm:text-xl text-slate-400 pr-4 sm:pr-6 leading-tight whitespace-pre-wrap flex items-center justify-end h-full">
                      {time.replace(" ", "\n")}
                    </div>
                    {days.map((day) => {
                      const id = `${day}-${time}`;
                      const votes = existingVotes[id] || 0;
                      const isSelected =
                        selectedSlots.includes(id);

                      const getHeatmapClass = (v: number) => {
                        if (v === 0) return "bg-slate-50";
                        if (v <= 2) return "bg-blue-100";
                        if (v <= 5) return "bg-blue-300";
                        if (v <= 8) return "bg-blue-500";
                        return "bg-blue-700";
                      };

                      const getTextColorClass = (v: number) => {
                        if (v > 5) return "text-blue-50";
                        return "text-blue-900/60";
                      };

                      const getCheckColorClass = (
                        v: number,
                      ) => {
                        if (v > 5) return "text-white";
                        return "text-blue-900";
                      };

                      return (
                        <button
                          key={id}
                          onClick={() => toggleSlot(id)}
                          className={`h-24 sm:h-28 rounded-2xl sm:rounded-3xl border-4 transition-all relative overflow-hidden active:scale-95 ${getHeatmapClass(votes)} ${
                            isSelected
                              ? "border-blue-900 shadow-md scale-[1.02] z-10"
                              : "border-transparent hover:border-blue-200"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                              <Check
                                className={`w-10 h-10 drop-shadow-md ${getCheckColorClass(votes)}`}
                                strokeWidth={4}
                              />
                            </div>
                          )}
                          <span
                            className={`absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-base sm:text-lg font-black ${getTextColorClass(votes)}`}
                          >
                            {votes}명
                          </span>
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}