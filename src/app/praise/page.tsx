"use client";

import { useState, useEffect, Fragment } from "react";
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

const days = ["목", "금", "토"];
const times = ["오후 6시", "오후 7시", "오후 8시"];

export default function PraisePage() {
  const { user, loading: authLoading, isAdmin, role } = useAuth();
  const canManage = isAdmin || role === "praise_team";
  const router = useRouter();

  // 접근 제어: 비로그인 시 메인으로 리다이렉트
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
      () => {
        setVotes({});
        setVotesLoading(false);
      },
    );
    return () => unsubscribe();
  }, [user]);

  const voterName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "";

  const toggleVote = async (slotId: string) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    const ref = doc(db, "practice-votes", "current-week");
    const current = votes[slotId] ?? [];
    const alreadyVoted = current.includes(voterName);

    if (alreadyVoted) {
      await updateDoc(ref, {
        [`votes.${slotId}`]: arrayRemove(voterName),
      });
    } else {
      await setDoc(
        ref,
        { votes: { [slotId]: arrayUnion(voterName) } },
        { merge: true },
      );
    }
  };

  const getHeatmapClass = (v: number) => {
    if (v === 0) return "bg-slate-50";
    if (v <= 2) return "bg-blue-100";
    if (v <= 4) return "bg-blue-300";
    if (v <= 6) return "bg-blue-500";
    return "bg-blue-700";
  };

  const getTextColorClass = (v: number) =>
    v > 4 ? "text-blue-50" : "text-blue-900/60";

  const getCheckColorClass = (v: number) =>
    v > 4 ? "text-white" : "text-blue-900";

  if (authLoading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-96 w-full rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
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

        {/* 콘티 관리 버튼 (관리자/찬양팀 전용) */}
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
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6 sm:space-y-8">
          <div className="space-y-1 sm:space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              연습 시간 투표
            </h2>
            <p className="text-lg sm:text-xl font-bold text-slate-500">
              가능한 시간을 모두 선택해주세요
            </p>
          </div>

          {votesLoading ? (
            <div className="w-full grid grid-cols-[2.5rem_1fr_1fr_1fr] sm:grid-cols-[3.5rem_1fr_1fr_1fr] gap-2 sm:gap-3">
              <div />
              {days.map((d) => (
                <Skeleton key={d} className="h-8 rounded-lg" />
              ))}
              {times.flatMap((t) => [
                <Skeleton
                  key={`label-${t}`}
                  className="h-20 sm:h-28 rounded-lg"
                />,
                ...days.map((d) => (
                  <Skeleton
                    key={`${d}-${t}`}
                    className="h-20 sm:h-28 rounded-2xl"
                  />
                )),
              ])}
            </div>
          ) : (
            <div className="w-full grid grid-cols-[2.5rem_1fr_1fr_1fr] sm:grid-cols-[3.5rem_1fr_1fr_1fr] gap-2 sm:gap-3">
              {/* Header */}
              <div />
              {days.map((day) => (
                <div
                  key={day}
                  className="text-center font-black text-xl sm:text-2xl text-slate-800 pb-3 sm:pb-4 border-b-2 border-slate-100"
                >
                  {day}
                </div>
              ))}

              {/* Body */}
              {times.map((time) => (
                <Fragment key={time}>
                  <div className="font-black text-sm sm:text-lg text-slate-400 leading-tight whitespace-pre-wrap flex items-center justify-center text-center h-full">
                    {time.replace(" ", "\n")}
                  </div>
                  {days.map((day) => {
                    const slotId = `${day}-${time}`;
                    const voters = votes[slotId] ?? [];
                    const count = voters.length;
                    const isMine =
                      !!voterName && voters.includes(voterName);

                    return (
                      <button
                        key={slotId}
                        onClick={() => toggleVote(slotId)}
                        title={
                          voters.length > 0
                            ? voters.join(", ")
                            : "아직 투표 없음"
                        }
                        className={`w-full h-20 sm:h-28 rounded-2xl sm:rounded-3xl border-4 transition-all relative overflow-hidden active:scale-95 ${getHeatmapClass(count)} ${
                          isMine
                            ? "border-blue-900 shadow-md scale-[1.02] z-10"
                            : "border-transparent hover:border-blue-200"
                        }`}
                      >
                        {isMine && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                            <Check
                              className={`w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md ${getCheckColorClass(count)}`}
                              strokeWidth={4}
                            />
                          </div>
                        )}
                        <span
                          className={`absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-sm sm:text-lg font-black ${getTextColorClass(count)}`}
                        >
                          {count}명
                        </span>
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
