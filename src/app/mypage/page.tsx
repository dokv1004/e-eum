"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { User, Camera, Save, Loader2, Check, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";

export default function MyPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [togglingRole, setTogglingRole] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    setDisplayName(user.displayName || "");
    setPhotoURL(user.photoURL || "");
  }, [authLoading, user, router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    await updateProfile(user, { displayName });
    await setDoc(
      doc(db, "users", user.uid),
      { displayName, photoURL: user.photoURL || "" },
      { merge: true },
    );
    setSaving(false);
    showToast("이름이 저장되었습니다.");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const storageRef = ref(storage, `profiles/${user.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateProfile(user, { photoURL: url });
    await setDoc(
      doc(db, "users", user.uid),
      { photoURL: url, displayName: user.displayName || "" },
      { merge: true },
    );

    setPhotoURL(url);
    setUploading(false);
    showToast("프로필 사진이 변경되었습니다.");
  };

  const handleToggleAdmin = async () => {
    if (!user) return;
    setTogglingRole(true);
    const newRole = role === "admin" ? "user" : "admin";
    await setDoc(
      doc(db, "users", user.uid),
      { role: newRole },
      { merge: true },
    );
    // useAuth의 onSnapshot이 자동으로 role 변경을 감지하여 리렌더링
    showToast(
      newRole === "admin"
        ? "관리자 모드가 활성화되었습니다!"
        : "일반 유저 모드로 전환되었습니다.",
    );
    setTogglingRole(false);
  };

  const isAdminMode = role === "admin";

  if (authLoading || !user) {
    return (
      <div className="max-w-md mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-80 w-full rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            마이페이지
          </h1>
        </div>

        <div className="space-y-6">
          {/* 내 정보 카드 */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8">
            {/* 프로필 이미지 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {photoURL ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoURL}
                    alt="프로필"
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-4xl">
                    {(displayName || "?").charAt(0)}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white shadow-lg transition-colors disabled:bg-blue-400"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm font-bold text-slate-400 mt-3">
                사진을 눌러 변경
              </p>
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg font-bold text-slate-700">
                이메일
              </label>
              <div className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-bold text-slate-400">
                {user.email || ""}
              </div>
            </div>

            {/* 이름 */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg font-bold text-slate-700">
                이름
              </label>
              <input
                type="text"
                value={displayName || ""}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* 저장 */}
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-lg transition-colors"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? "저장 중..." : "저장하기"}
            </button>
          </div>

          {/* 관리자 모드 체험 */}
          <div
            className={`rounded-[2rem] border shadow-sm p-6 sm:p-8 transition-colors ${
              isAdminMode
                ? "bg-gradient-to-br from-amber-50 to-white border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  isAdminMode ? "bg-amber-100" : "bg-slate-100"
                }`}
              >
                <ShieldCheck
                  className={`w-5 h-5 transition-colors ${
                    isAdminMode ? "text-amber-600" : "text-slate-400"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  관리자 모드 체험
                </h2>
                <p className="text-sm font-bold text-slate-400">
                  포트폴리오 데모용
                </p>
              </div>

              {/* iOS 스타일 토글 스위치 */}
              <button
                onClick={handleToggleAdmin}
                disabled={togglingRole}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                  isAdminMode ? "bg-amber-500" : "bg-slate-300"
                } ${togglingRole ? "opacity-60" : ""}`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${
                    isAdminMode ? "translate-x-7" : "translate-x-1"
                  }`}
                >
                  {togglingRole && (
                    <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                  )}
                </div>
              </button>
            </div>

            <p
              className={`text-sm sm:text-base font-bold transition-colors ${
                isAdminMode ? "text-amber-700" : "text-slate-400"
              }`}
            >
              {isAdminMode
                ? "현재 관리자 권한으로 앱을 체험 중입니다 ✨"
                : "일반 유저 모드입니다. 토글을 켜면 관리자 기능을 체험할 수 있어요."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 토스트 */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-100 flex items-center gap-2 px-6 py-3.5 rounded-full bg-slate-900 text-white font-bold text-base shadow-xl"
        >
          <Check className="w-5 h-5 text-green-400" />
          {toast}
        </motion.div>
      )}
    </div>
  );
}
