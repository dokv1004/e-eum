import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import TopNav from "@/components/TopNav";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "이음(E-EUM) — 교회 대시보드",
  description: "전 세대가 함께 쓰는 초간단 교회 대시보드",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full antialiased overscroll-none`}>
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-slate-900 overscroll-none">
        <TopNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
