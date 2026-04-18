"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquareText, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

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
  id: number;
  category: string;
  title: string;
  author: string;
  date: string;
  commentCount: number;
}

const dummyPosts: Post[] = [
  {
    id: 1,
    category: "eagle",
    title: "이번 주 주일예배 찬양 악보 공유합니다",
    author: "김인도",
    date: "2026-04-16",
    commentCount: 3,
  },
  {
    id: 2,
    category: "wingwing",
    title: "윙윙부 여름 수련회 일정 안내",
    author: "이교사",
    date: "2026-04-15",
    commentCount: 12,
  },
  {
    id: 3,
    category: "youth",
    title: "청년부 금요 모임 장소 변경 안내",
    author: "박청년",
    date: "2026-04-15",
    commentCount: 5,
  },
  {
    id: 4,
    category: "eagle",
    title: "새벽기도회 특별 기도제목 나눔",
    author: "최집사",
    date: "2026-04-14",
    commentCount: 8,
  },
  {
    id: 5,
    category: "all",
    title: "교회 주차장 공사 안내 (4/20~5/10)",
    author: "관리팀",
    date: "2026-04-14",
    commentCount: 2,
  },
  {
    id: 6,
    category: "youth",
    title: "청년부 MT 참가비 안내 및 신청",
    author: "정리더",
    date: "2026-04-13",
    commentCount: 15,
  },
  {
    id: 7,
    category: "wingwing",
    title: "어린이 주일 특별 공연 연습 일정",
    author: "송교사",
    date: "2026-04-13",
    commentCount: 4,
  },
  {
    id: 8,
    category: "eagle",
    title: "새가족 환영회 봉사자 모집합니다",
    author: "한집사",
    date: "2026-04-12",
    commentCount: 6,
  },
];

function CategoryTabs({
  categories,
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
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:-mx-0 sm:px-0"
    >
      {categories.map((cat) => {
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
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered =
    activeCategory === "all"
      ? dummyPosts
      : dummyPosts.filter((p) => p.category === activeCategory);

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
            <MessageSquareText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            게시판
          </h1>
        </div>

        {/* Tabs */}
        <CategoryTabs
          categories={categories}
          activeId={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* Post List */}
        <div className="mt-6 sm:mt-8 space-y-3">
          {filtered.map((post, idx) => (
            <motion.button
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="w-full text-left bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 hover:border-blue-200 hover:shadow-sm transition-all group flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold ${categoryColors[post.category] || categoryColors.all}`}
                  >
                    {getCategoryLabel(post.category)}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                  {post.title}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 sm:mt-2 text-sm sm:text-base text-slate-400 font-bold">
                  <span>{post.author}</span>
                  <span>·</span>
                  <span>{post.date}</span>
                  {post.commentCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-blue-500">
                        댓글 {post.commentCount}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
            </motion.button>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-xl font-bold text-slate-400">
              게시글이 없습니다.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
