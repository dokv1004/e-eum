"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("user");

  // Auth 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore users/{uid}.role 실시간 구독
  useEffect(() => {
    if (!user) {
      setRole("user");
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          setRole(snap.data().role ?? "user");
        }
      },
      () => setRole("user"),
    );
    return () => unsubscribe();
  }, [user]);

  // 관리자 판별: 이메일 일치 OR Firestore role === "admin"
  const isAdmin =
    (!!user && user.email === ADMIN_EMAIL) || role === "admin";

  return { user, loading, isAdmin, role };
}
