"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  Music,
  Save,
  Loader2,
  Plus,
  Trash2,
  RotateCcw,
  ArrowLeft,
  Settings,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

interface SetlistSong {
  title: string;
  link: string;
}

interface ServiceCategory {
  id: string;
  label: string;
  color: string;
}

const DEFAULT_COLORS = [
  "#3b82f6", "#22c55e", "#a855f7", "#f59e0b",
  "#ec4899", "#ef4444", "#14b8a6", "#6366f1",
];

function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export default function AdminPraisePage() {
  const { user, loading: authLoading, isAdmin, role } = useAuth();
  const router = useRouter();

  // 카테고리 관리
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState(DEFAULT_COLORS[0]);
  const [catSaving, setCatSaving] = useState(false);

  // 콘티 관리
  const [selectedDate, setSelectedDate] = useState(() => getTodayKST());
  const [serviceType, setServiceType] = useState("");
  const [title, setTitle] = useState("");
  const [songs, setSongs] = useState<SetlistSong[]>([{ title: "", link: "" }]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);

  // 접근 제어: admin 또는 praise_team 역할 허용
  const canManage = isAdmin || role === "praise_team";

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }
    if (!canManage) { alert("찬양팀 권한이 필요합니다."); router.replace("/praise"); }
  }, [authLoading, user, canManage, router]);

  // 카테고리 로드
  const fetchCategories = async () => {
    setCatLoading(true);
    const snap = await getDocs(collection(db, "service_categories"));
    const cats = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ServiceCategory[];
    setCategories(cats);
    if (cats.length > 0 && !serviceType) {
      setServiceType(cats[0].id);
    }
    setCatLoading(false);
  };

  useEffect(() => {
    if (!canManage) return;
    fetchCategories();
  }, [isAdmin]);

  // 카테고리 추가
  const handleAddCategory = async () => {
    if (!newCatLabel.trim()) return;
    setCatSaving(true);
    await addDoc(collection(db, "service_categories"), {
      label: newCatLabel.trim(),
      color: newCatColor,
    });
    setNewCatLabel("");
    await fetchCategories();
    setCatSaving(false);
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("이 카테고리를 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "service_categories", catId));
    await fetchCategories();
    if (serviceType === catId && categories.length > 1) {
      setServiceType(categories.find((c) => c.id !== catId)?.id || "");
    }
  };

  // 날짜 + 예배 종류가 바뀌면 기존 데이터 로드
  useEffect(() => {
    if (!canManage || !selectedDate || !serviceType) return;
    (async () => {
      setDataLoading(true);
      setEditingDocId(null);

      const q = query(
        collection(db, "praise_setlists"),
        where("date", "==", selectedDate),
        where("serviceType", "==", serviceType),
        limit(1),
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const data = existingDoc.data();
        setEditingDocId(existingDoc.id);
        setTitle(data.title ?? "");
        setSongs(
          data.songs?.length
            ? data.songs.map((s: SetlistSong) => ({ title: s.title || "", link: s.link || "" }))
            : [{ title: "", link: "" }],
        );
      } else {
        const catLabel = categories.find((c) => c.id === serviceType)?.label || "";
        setTitle(catLabel ? `${catLabel} 찬양` : "");
        setSongs([{ title: "", link: "" }]);
      }
      setDataLoading(false);
    })();
  }, [isAdmin, selectedDate, serviceType, categories]);

  // 이전 콘티 불러오기
  const handleLoadPrevious = async () => {
    setLoadingPrev(true);
    const q = query(
      collection(db, "praise_setlists"),
      where("serviceType", "==", serviceType),
      orderBy("date", "desc"),
      limit(10),
    );
    const snap = await getDocs(q);
    const prev = snap.docs.find((d) => d.data().date < selectedDate);
    if (prev) {
      const data = prev.data();
      setTitle(data.title ?? "");
      setSongs(
        data.songs?.length
          ? data.songs.map((s: SetlistSong) => ({ title: s.title || "", link: s.link || "" }))
          : [{ title: "", link: "" }],
      );
    } else {
      alert("이전 콘티 데이터가 없습니다.");
    }
    setLoadingPrev(false);
  };

  // 저장
  const handleSave = async () => {
    if (!selectedDate || !serviceType) return;
    setSaving(true);
    setSaved(false);
    const cleanSongs = songs.filter((s) => s.title.trim() !== "");
    const docData = {
      date: selectedDate,
      serviceType,
      title: title.trim(),
      songs: cleanSongs,
      createdAt: serverTimestamp(),
    };
    if (editingDocId) {
      await setDoc(doc(db, "praise_setlists", editingDocId), docData);
    } else {
      const newDoc = await addDoc(collection(db, "praise_setlists"), docData);
      setEditingDocId(newDoc.id);
    }
    setSongs(cleanSongs.length > 0 ? cleanSongs : [{ title: "", link: "" }]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // 곡 CRUD
  const addSong = () => setSongs([...songs, { title: "", link: "" }]);
  const updateSong = (i: number, field: keyof SetlistSong, v: string) =>
    setSongs(songs.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)));
  const removeSong = (i: number) =>
    setSongs(songs.length > 1 ? songs.filter((_, idx) => idx !== i) : songs);

  const formatLabel = (dateStr: string) => {
    try {
      return format(parse(dateStr, "yyyy-MM-dd", new Date()), "yyyy년 M월 d일 (EEEE)", { locale: ko });
    } catch { return dateStr; }
  };

  if (authLoading || !canManage) {
    return (
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
        <Skeleton className="h-10 w-40 rounded-lg mb-8" />
        <Skeleton className="h-96 w-full rounded-[2rem]" />
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
      <Link href="/praise" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-bold mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />찬양팀
      </Link>

      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Music className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">콘티 관리</h1>
            <p className="text-sm font-bold text-slate-400">{formatLabel(selectedDate)}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCatManager(!showCatManager)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            showCatManager ? "bg-blue-100 text-blue-600" : "bg-slate-100 hover:bg-slate-200 text-slate-500"
          }`}
          title="카테고리 관리"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* 카테고리 관리 패널 */}
        {showCatManager && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">예배 카테고리 관리</h2>

            {catLoading ? (
              <Skeleton className="h-20 w-full rounded-2xl" />
            ) : (
              <>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="flex-1 font-bold text-slate-900">{cat.label}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="shrink-0 w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm font-bold text-slate-400 text-center py-3">
                      등록된 카테고리가 없습니다.
                    </p>
                  )}
                </div>

                {/* 새 카테고리 추가 */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCatLabel || ""}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="새 예배 이름"
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-base font-bold text-slate-900 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none transition-colors"
                  />
                  <select
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-14 h-11 rounded-xl border-2 border-slate-200 text-center font-bold"
                    style={{ backgroundColor: newCatColor + "20", color: newCatColor }}
                  >
                    {DEFAULT_COLORS.map((c) => (
                      <option key={c} value={c}>●</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddCategory}
                    disabled={catSaving || !newCatLabel.trim()}
                    className="shrink-0 w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center text-white transition-colors"
                  >
                    {catSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 날짜 + 예배 종류 */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
          <div className="space-y-2">
            <label className="text-base font-bold text-slate-700">날짜</label>
            <input type="date" value={selectedDate || ""} onChange={(e) => setSelectedDate(e.target.value)} className={inputClass} />
          </div>

          <div className="space-y-2">
            <label className="text-base font-bold text-slate-700">예배 종류</label>
            {catLoading ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setServiceType(cat.id)}
                    className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition-all ${
                      serviceType === cat.id
                        ? "shadow-sm scale-105"
                        : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                    }`}
                    style={
                      serviceType === cat.id
                        ? { backgroundColor: cat.color + "20", color: cat.color, borderColor: cat.color + "40" }
                        : undefined
                    }
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-400">
                위의 ⚙️ 버튼을 눌러 카테고리를 먼저 추가하세요.
              </p>
            )}
          </div>

          <button onClick={handleLoadPrevious} disabled={loadingPrev || !serviceType}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 font-bold text-base transition-colors disabled:opacity-50">
            {loadingPrev ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            이전 콘티 불러오기
          </button>
        </div>

        {/* 콘티 폼 */}
        {serviceType && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">콘티 작성</h2>

            {dataLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-base font-bold text-slate-700">제목</label>
                  <input type="text" value={title || ""} onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 4월 3주차 주일 대예배 찬양" className={inputClass} />
                </div>

                <div className="space-y-3">
                  <label className="text-base font-bold text-slate-700">곡 목록</label>
                  {songs.map((song, i) => (
                    <div key={i} className="flex items-start gap-2 p-4 rounded-2xl bg-slate-50">
                      <span className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm mt-1">{i + 1}</span>
                      <div className="flex-1 space-y-2">
                        <input type="text" value={song.title || ""} onChange={(e) => updateSong(i, "title", e.target.value)} placeholder="곡명" className={inputClass} />
                        <input type="text" value={song.link || ""} onChange={(e) => updateSong(i, "link", e.target.value)} placeholder="유튜브/악보 링크 (선택)" className={inputClass} />
                      </div>
                      <button onClick={() => removeSong(i)} className="shrink-0 w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors mt-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addSong} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 font-bold text-base transition-colors">
                    <Plus className="w-5 h-5" />곡 추가
                  </button>
                </div>

                <button onClick={handleSave} disabled={saving || !selectedDate || !serviceType}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-lg transition-colors">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? "저장 중..." : editingDocId ? "수정 저장" : "새로 저장"}
                </button>

                {saved && <p className="text-center text-lg font-bold text-green-600">저장 완료!</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
