"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquareText,
  ChevronRight,
  Plus,
} from "lucide-react";
import { motion } from "motion/react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Category {
  id: string;
  label: string;
}

const categories: Category[] = [
  { id: "all", label: "전체" },
  { id: "eagle", label: "이글" },
  { id: "wingwing", label: "윙윙" },
  { id: "youth", label: "청년부" },
];

interface Post {
  id: string;
  category: string;
  title: string;
  authorName: string;
  createdAt: Timestamp | null;
}

function CategoryTabs({
  categories: cats,
  activeId,
  onSelect,
}: {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = scrollRef.current?.querySelector("[data-active=true]");
    if (active) {
      active.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeId]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:-mx-0 sm:px-0"
    >
      {cats.map((cat) => {
        const isActive = cat.id === activeId;
        return (
          <button
            key={cat.id}
            data-active={isActive}
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-base sm:text-lg transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 border-2 border-slate-200 hover:border-blue-200 hover:text-blue-600"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

function getCategoryLabel(catId: string) {
  return categories.find((c) => c.id === catId)?.label ?? catId;
}

const categoryColors: Record<string, string> = {
  eagle: "bg-amber-100 text-amber-800",
  wingwing: "bg-green-100 text-green-800",
  youth: "bg-purple-100 text-purple-800",
  all: "bg-slate-100 text-slate-600",
};

export default function BoardPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];
        setPosts(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, []);

  const filtered =
    activeCategory === "all"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

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
              <MessageSquareText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              게시판
            </h1>
          </div>
          {user && (
            <Link
              href="/board/write"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base transition-colors"
            >
              <Plus className="w-4 h-4" />
              글쓰기
            </Link>
          )}
        </div>

        {/* Tabs */}
        <CategoryTabs
          categories={categories}
          activeId={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* Post List */}
        <div className="mt-6 sm:mt-8 space-y-3">
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3"
                >
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <div className="flex gap-3">
                    <Skeleton className="h-4 w-14 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                  </div>
                </div>
              ))
            : filtered.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                >
                  <Link
                    href={`/board/${post.id}`}
                    className="block w-full text-left bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 hover:border-blue-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                          <span
                            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold ${categoryColors[post.category] || categoryColors.all}`}
                          >
                            {getCategoryLabel(post.category || "all")}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                          {post.title || ""}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 sm:mt-2 text-sm sm:text-base text-slate-400 font-bold">
                          <span>{post.authorName || "익명"}</span>
                          <span>·</span>
                          <span>
                            {post.createdAt
                              ? format(
                                  post.createdAt.toDate(),
                                  "yyyy.MM.dd",
                                )
                              : ""}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-xl font-bold text-slate-400">
              게시글이 없습니다.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
