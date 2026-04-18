"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, deleteDoc, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import Link from "next/link";

const categoryLabels: Record<string, string> = {
  eagle: "이글",
  wingwing: "윙윙",
  youth: "청년부",
};

const categoryColors: Record<string, string> = {
  eagle: "bg-amber-100 text-amber-800",
  wingwing: "bg-green-100 text-green-800",
  youth: "bg-purple-100 text-purple-800",
};

interface PostData {
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorId: string;
  createdAt: Timestamp | null;
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "posts", id));
      if (snap.exists()) {
        setPost(snap.data() as PostData);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    await deleteDoc(doc(db, "posts", id));
    router.replace("/board");
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20 space-y-6">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20 text-center py-20">
        <p className="text-xl font-bold text-slate-400">
          게시글을 찾을 수 없습니다.
        </p>
        <Link
          href="/board"
          className="inline-block mt-4 text-blue-600 font-bold"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isAuthor = user?.uid === post.authorId;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
      {/* 뒤로가기 */}
      <Link
        href="/board"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-bold mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        목록
      </Link>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* 헤더 */}
        <div className="p-6 sm:p-8 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold ${categoryColors[post.category] || "bg-slate-100 text-slate-600"}`}
            >
              {categoryLabels[post.category] || post.category || ""}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight break-keep">
            {post.title || ""}
          </h1>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3 text-sm sm:text-base text-slate-400 font-bold">
              <span>{post.authorName || "익명"}</span>
              <span>·</span>
              <span>
                {post.createdAt
                  ? format(post.createdAt.toDate(), "yyyy.MM.dd")
                  : ""}
              </span>
            </div>
            {isAuthor && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 font-bold text-sm transition-colors"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                삭제
              </button>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div
          className="prose prose-slate max-w-none p-6 sm:p-8 text-lg"
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />
      </div>
    </div>
  );
}
