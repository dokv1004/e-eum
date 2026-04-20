"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Music, ListMusic, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

type VotesMap = Record<string, string[]>;

const days = ["월", "화", "수", "목", "금", "토", "일"];
const times = [
  "오전 8시", "오전 9시", "오전 10시", "오전 11시",
  "오후 12시", "오후 1시", "오후 2시", "오후 3시",
  "오후 4시", "오후 5시", "오후 6시", "오후 7시", "오후 8시",
];

export default function PraisePage() {
  const { user, loading: authLoading, isAdmin, role } = useAuth();
  const canManage = isAdmin || role === "praise_team";
  const router = useRouter();

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
    if (!user) return;
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
      () => { setVotes({}); setVotesLoading(false); },
    );
    return () => unsubscribe();
  }, [user]);

  const voterName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "";

  const toggleVote = async (slotId: string) => {
    if (!user) { alert("로그인이 필요합니다."); return; }
    const ref = doc(db, "practice-votes", "current-week");
    const current = votes[slotId] ?? [];
    if (current.includes(voterName)) {
      await updateDoc(ref, { [`votes.${slotId}`]: arrayRemove(voterName) });
    } else {
      await setDoc(ref, { votes: { [slotId]: arrayUnion(voterName) } }, { merge: true });
    }
  };

  const getHeatmapClass = (v: number) => {
    if (v === 0) return "bg-slate-50";
    if (v <= 2) return "bg-blue-100";
    if (v <= 4) return "bg-blue-300";
    if (v <= 6) return "bg-blue-500";
    return "bg-blue-700";
  };

  const getTextColor = (v: number) => (v > 4 ? "text-blue-50" : "text-blue-900/60");
  const getCheckColor = (v: number) => (v > 4 ? "text-white" : "text-blue-900");

  if (authLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-96 w-full rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Music className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            찬양팀
          </h1>
        </div>

        {/* 콘티 관리 버튼 */}
        {canManage && (
          <Link
            href="/praise/manage"
            className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-white rounded-[2rem] border border-blue-100 shadow-sm p-5 sm:p-6 hover:shadow-md transition-all group mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                <ListMusic className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  찬양 콘티 관리
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-400">
                  예배별 콘티 작성 및 카테고리 관리
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
          </Link>
        )}

        {/* 연습 시간 투표 */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              연습 시간 투표
            </h2>
            <p className="text-base sm:text-lg font-bold text-slate-500">
              가능한 시간을 모두 선택해주세요
            </p>
          </div>

          {votesLoading ? (
            <Skeleton className="w-full h-80 rounded-2xl" />
          ) : (
            /* 엑셀급 스크롤러블 투표판 */
            <div className="overflow-auto rounded-2xl border border-slate-100 max-h-[65vh]">
              <table className="border-collapse">
                {/* 요일 헤더 — sticky top */}
                <thead>
                  <tr>
                    {/* 좌상단 깍두기 — sticky top + left, 최고 z-index */}
                    <th className="sticky top-0 left-0 z-30 bg-white min-w-[52px] sm:min-w-[64px] p-0">
                      <div className="h-10 sm:h-12 border-b border-r border-slate-100" />
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="sticky top-0 z-20 bg-white min-w-[60px] sm:min-w-[72px] p-0"
                      >
                        <div className="h-10 sm:h-12 flex items-center justify-center font-black text-base sm:text-lg text-slate-800 border-b border-slate-100">
                          {day}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {times.map((time) => (
                    <tr key={time}>
                      {/* 시간 레이블 — sticky left */}
                      <td className="sticky left-0 z-10 bg-white p-0">
                        <div className="min-w-[52px] sm:min-w-[64px] h-[44px] sm:h-[48px] flex items-center justify-center text-xs sm:text-sm font-black text-slate-400 border-r border-slate-100 whitespace-nowrap px-1">
                          {time}
                        </div>
                      </td>

                      {/* 투표 셀 */}
                      {days.map((day) => {
                        const slotId = `${day}-${time}`;
                        const voters = votes[slotId] ?? [];
                        const count = voters.length;
                        const isMine = !!voterName && voters.includes(voterName);

                        return (
                          <td key={slotId} className="p-0.5 sm:p-1">
                            <button
                              onClick={() => toggleVote(slotId)}
                              title={voters.length > 0 ? voters.join(", ") : "아직 투표 없음"}
                              className={`w-full min-w-[54px] sm:min-w-[64px] h-[40px] sm:h-[44px] rounded-lg sm:rounded-xl transition-colors duration-200 relative overflow-hidden active:scale-95 ${getHeatmapClass(count)} ${
                                isMine
                                  ? "ring-2 ring-blue-900 ring-offset-1 shadow-sm"
                                  : "hover:ring-1 hover:ring-blue-300"
                              }`}
                            >
                              {isMine && (
                                <Check
                                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 drop-shadow ${getCheckColor(count)}`}
                                  strokeWidth={3}
                                />
                              )}
                              {count > 0 && (
                                <span className={`absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-black ${getTextColor(count)}`}>
                                  {count}
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 범례 */}
          <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />0명
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-100" />1~2명
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-300" />3~4명
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />5~6명
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-700" />7명+
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
