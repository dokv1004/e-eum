"use client";

import { useState, useEffect } from "react";
import { Newspaper, Download } from "lucide-react";
import { motion } from "motion/react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp)/i.test(url.split("?")[0]);
}

export default function BulletinPage() {
  const [bulletinUrl, setBulletinUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "bulletin", "current"),
      (snap) => {
        if (snap.exists()) {
          setBulletinUrl(snap.data().url ?? "");
        } else {
          setBulletinUrl("");
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Newspaper className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              주보
            </h1>
          </div>
          {bulletinUrl && (
            <a
              href={bulletinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base transition-colors"
            >
              <Download className="w-4 h-4" />
              원본 보기
            </a>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 sm:p-10 space-y-4">
              <Skeleton className="w-full h-[600px] rounded-xl" />
            </div>
          ) : bulletinUrl ? (
            isImageUrl(bulletinUrl) ? (
              <div className="p-4 sm:p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bulletinUrl}
                  alt="이번 주 주보"
                  className="w-full h-auto rounded-xl shadow-lg"
                />
              </div>
            ) : (
              <iframe
                src={bulletinUrl}
                title="이번 주 주보"
                className="w-full h-[800px] rounded-b-[2rem]"
              />
            )
          ) : (
            <div className="p-10 sm:p-16 flex flex-col items-center justify-center text-center min-h-[50vh]">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                <Newspaper className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
                이번 주 주보
              </h2>
              <p className="text-lg sm:text-xl font-bold text-slate-400 max-w-md break-keep">
                이번 주 주보가 아직 등록되지 않았습니다.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
