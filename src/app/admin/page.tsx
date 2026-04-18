"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  ShieldCheck,
  Save,
  Loader2,
  Plus,
  Trash2,
  Clock,
  Newspaper,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ContiItem {
  title: string;
  youtubeUrl: string;
}

interface ServiceItem {
  name: string;
  time: string;
  day: string;
}

const DEFAULT_SERVICES: ServiceItem[] = [
  { name: "주일 대예배", time: "오전 11:00", day: "매주 일요일" },
  { name: "수요 예배", time: "오후 7:30", day: "매주 수요일" },
  { name: "금요 철야", time: "오후 9:00", day: "매주 금요일" },
  { name: "새벽 기도회", time: "오전 5:30", day: "월~토요일" },
];

function extractYoutubeId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([^\s&?#]+)/,
  );
  return match?.[1] ?? trimmed;
}

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();

  const [verse, setVerse] = useState("");
  const [reference, setReference] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [conti, setConti] = useState<ContiItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [bulletinUrl, setBulletinUrl] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!isAdmin) {
      alert("관리자 권한이 없습니다.");
      router.replace("/");
    }
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [wordSnap, scheduleSnap, bulletinSnap] = await Promise.all([
        getDoc(doc(db, "daily-word", "current")),
        getDoc(doc(db, "worship-schedule", "current")),
        getDoc(doc(db, "bulletin", "current")),
      ]);
      if (wordSnap.exists()) {
        const data = wordSnap.data();
        setVerse(data.verse ?? "");
        setReference(data.reference ?? "");
        setYoutubeInput(data.youtubeId ?? "");
        setConti(data.conti ?? []);
      }
      if (scheduleSnap.exists()) {
        const data = scheduleSnap.data();
        if (data.services?.length) {
          setServices(data.services);
        }
      }
      if (bulletinSnap.exists()) {
        setBulletinUrl(bulletinSnap.data().url ?? "");
      }
      setDataLoading(false);
    })();
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const youtubeId = extractYoutubeId(youtubeInput);
    const cleanConti = conti.filter((c) => c.title.trim() !== "");
    const cleanServices = services.filter((s) => s.name.trim() !== "");

    await Promise.all([
      setDoc(doc(db, "daily-word", "current"), {
        verse,
        reference,
        youtubeId,
        conti: cleanConti,
      }),
      setDoc(doc(db, "worship-schedule", "current"), {
        services: cleanServices,
      }),
      setDoc(doc(db, "bulletin", "current"), {
        url: bulletinUrl.trim(),
      }),
    ]);

    setYoutubeInput(youtubeId);
    setConti(cleanConti);
    setServices(cleanServices);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── 콘티 관리 ──
  const addContiItem = () =>
    setConti([...conti, { title: "", youtubeUrl: "" }]);
  const updateContiItem = (i: number, field: keyof ContiItem, v: string) =>
    setConti(conti.map((c, idx) => (idx === i ? { ...c, [field]: v } : c)));
  const removeContiItem = (i: number) =>
    setConti(conti.filter((_, idx) => idx !== i));

  // ── 예배 시간 관리 ──
  const addServiceItem = () =>
    setServices([...services, { name: "", time: "", day: "" }]);
  const updateServiceItem = (i: number, field: keyof ServiceItem, v: string) =>
    setServices(
      services.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)),
    );
  const removeServiceItem = (i: number) =>
    setServices(services.filter((_, idx) => idx !== i));

  if (authLoading || !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-[2rem]" />
      </div>
    );
  }

  const previewId = extractYoutubeId(youtubeInput);
  const inputClass =
    "w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none transition-colors";
  const inputClassLg =
    "w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          관리자
        </h1>
      </div>

      <div className="space-y-8">
        {/* ── 오늘의 말씀 + 유튜브 ── */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            오늘의 말씀
          </h2>
          {dataLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-base sm:text-lg font-bold text-slate-700">
                  말씀 구절
                </label>
                <textarea
                  value={verse}
                  onChange={(e) => setVerse(e.target.value)}
                  rows={4}
                  placeholder="예: 내가 평생토록 여호와께 노래하며..."
                  className={`${inputClassLg} resize-none`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-base sm:text-lg font-bold text-slate-700">
                  성경 장절
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="예: (시편 104:33)"
                  className={inputClassLg}
                />
              </div>
              <div className="space-y-2">
                <label className="text-base sm:text-lg font-bold text-slate-700">
                  이번 주 찬양 유튜브
                </label>
                <input
                  type="text"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="유튜브 링크 또는 영상 ID"
                  className={inputClassLg}
                />
                <p className="text-sm font-bold text-slate-400">
                  전체 링크, 공유 링크, 영상 ID 모두 가능합니다
                </p>
              </div>
              {previewId && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-500">미리보기</p>
                  <iframe
                    className="w-full aspect-video rounded-xl"
                    src={`https://www.youtube.com/embed/${previewId}`}
                    title="미리보기"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── 찬양 콘티 ── */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            이번 주 찬양 콘티
          </h2>
          {dataLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {conti.length === 0 && (
                <p className="text-lg font-bold text-slate-400 text-center py-4">
                  등록된 곡이 없습니다. 아래 버튼으로 추가하세요.
                </p>
              )}
              <div className="space-y-4">
                {conti.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 sm:gap-3 p-4 rounded-2xl bg-slate-50"
                  >
                    <span className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm mt-1">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateContiItem(index, "title", e.target.value)
                        }
                        placeholder="곡명 (예: Way Maker)"
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={item.youtubeUrl || ""}
                        onChange={(e) =>
                          updateContiItem(index, "youtubeUrl", e.target.value)
                        }
                        placeholder="유튜브 링크 (선택사항)"
                        className={inputClass}
                      />
                    </div>
                    <button
                      onClick={() => removeContiItem(index)}
                      className="shrink-0 w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors mt-1"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addContiItem}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 font-bold text-lg transition-colors"
              >
                <Plus className="w-5 h-5" />곡 추가
              </button>
            </>
          )}
        </div>

        {/* ── 예배 시간 관리 ── */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              예배 시간 안내
            </h2>
          </div>
          {dataLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {services.map((svc, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 sm:gap-3 p-4 rounded-2xl bg-slate-50"
                  >
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={svc.name}
                        onChange={(e) =>
                          updateServiceItem(index, "name", e.target.value)
                        }
                        placeholder="예배명 (예: 주일 대예배)"
                        className={inputClass}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={svc.time}
                          onChange={(e) =>
                            updateServiceItem(index, "time", e.target.value)
                          }
                          placeholder="시간 (예: 오전 11:00)"
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={svc.day}
                          onChange={(e) =>
                            updateServiceItem(index, "day", e.target.value)
                          }
                          placeholder="요일 (예: 매주 일요일)"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeServiceItem(index)}
                      className="shrink-0 w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors mt-1"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addServiceItem}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 font-bold text-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                예배 추가
              </button>
            </>
          )}
        </div>

        {/* ── 이번 주 주보 관리 ── */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <Newspaper className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              이번 주 주보
            </h2>
          </div>
          {dataLoading ? (
            <Skeleton className="h-14 w-full rounded-2xl" />
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-base sm:text-lg font-bold text-slate-700">
                  주보 파일 URL
                </label>
                <input
                  type="text"
                  value={bulletinUrl}
                  onChange={(e) => setBulletinUrl(e.target.value)}
                  placeholder="Firebase Storage URL (.pdf, .jpg, .png)"
                  className={inputClassLg}
                />
                <p className="text-sm font-bold text-slate-400">
                  Firebase Storage에서 복사한 파일 URL을 붙여넣으세요
                </p>
              </div>
              {bulletinUrl.trim() && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-500">미리보기</p>
                  {/\.(jpg|jpeg|png|webp)/i.test(bulletinUrl) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={bulletinUrl}
                      alt="주보 미리보기"
                      className="w-full h-auto rounded-xl border border-slate-200"
                    />
                  ) : (
                    <iframe
                      src={bulletinUrl}
                      title="주보 미리보기"
                      className="w-full h-[400px] rounded-xl border border-slate-200"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── 저장 ── */}
        {!dataLoading && (
          <div className="space-y-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-lg transition-colors"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? "저장 중..." : "전체 저장하기"}
            </button>
            {saved && (
              <p className="text-center text-lg font-bold text-green-600">
                저장 완료! 메인 화면에 바로 반영됩니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
