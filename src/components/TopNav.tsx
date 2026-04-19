"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquareText,
  Newspaper,
  Music,
  Menu,
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import PhoneLogin from "@/components/PhoneLogin";

const publicNavItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/board", label: "게시판", icon: MessageSquareText },
  { href: "/bulletin", label: "주보", icon: Newspaper },
];

const authNavItems = [
  { href: "/praise", label: "찬양팀", icon: Music },
];

export default function TopNav() {
  const pathname = usePathname();
  const { user, loading, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);

  const currentDate = format(new Date(), "yyyy년 M월 d일 (EEEE)", {
    locale: ko,
  });

  const navItems = [
    ...publicNavItems,
    ...(user ? authNavItems : []),
  ];

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "사용자";

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-6 lg:gap-12">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
          >
            <Image
              src="/logo.png"
              alt="이음 로고"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
            이음
          </Link>
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 font-bold text-lg transition-colors ${
                    isActive
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Date + Auth + Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-base lg:text-lg font-bold text-slate-400 hidden lg:block">
            {currentDate}
          </div>

          {/* Auth Area */}
          {!loading && (
            <>
              {user ? (
                <div className="hidden sm:flex items-center gap-2">
                  {/* Profile — 클릭 시 마이페이지 */}
                  <Link
                    href="/mypage"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    {user.photoURL ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.photoURL}
                        alt={displayName}
                        className="w-9 h-9 rounded-full border-2 border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-bold text-slate-700 hidden lg:block max-w-[7rem] truncate">
                      {displayName}
                    </span>
                  </Link>

                  {/* Admin Link — 관리자 이메일만 표시 */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-amber-100 flex items-center justify-center transition-colors text-slate-500 hover:text-amber-600"
                      title="관리자"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </Link>
                  )}

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors text-slate-500 hover:text-red-500"
                    title="로그아웃"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={handleLogin}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    구글 로그인
                  </button>
                  <button
                    onClick={() => setShowPhoneLogin(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    전화번호
                  </button>
                </div>
              )}
            </>
          )}

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-4">
          <div className="text-sm font-bold text-slate-400 py-3">
            {currentDate}
          </div>

          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}

          {/* Mobile Auth */}
          {!loading && (
            <div className="mt-2 pt-3 border-t border-slate-100">
              {user ? (
                <div className="space-y-1">
                  <Link
                    href="/mypage"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 transition-colors"
                  >
                    {user.photoURL ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.photoURL}
                        alt={displayName}
                        className="w-8 h-8 rounded-full border-2 border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <span className="font-bold text-slate-700 truncate">
                      {displayName}
                    </span>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-lg text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      관리자
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      handleLogin();
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-lg text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <LogIn className="w-5 h-5" />
                    구글 로그인
                  </button>
                  <button
                    onClick={() => {
                      setShowPhoneLogin(true);
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-lg text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    전화번호 로그인
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {showPhoneLogin && (
        <PhoneLogin onClose={() => setShowPhoneLogin(false)} />
      )}
    </nav>
  );
}
