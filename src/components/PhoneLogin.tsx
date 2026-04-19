"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Phone, ArrowRight, Loader2, X, Check } from "lucide-react";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
  }
}

const RECAPTCHA_ID = "recaptcha-container";

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  if (digits.startsWith("82")) return `+${digits}`;
  return `+82${digits}`;
}

export default function PhoneLogin({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const confirmRef = useRef<ConfirmationResult | null>(null);
  const isRecaptchaInit = useRef(false);

  // ── reCAPTCHA 초기화 (visible, normal 모드) ──
  useEffect(() => {
    // ★ 이중 잠금: 이미 초기화했으면 절대 재실행하지 않음 (StrictMode 방어)
    if (isRecaptchaInit.current) return;

    // ★ 전역 객체가 이미 존재하면 초기화하지 않음
    if (window.recaptchaVerifier) return;

    const container = document.getElementById(RECAPTCHA_ID);
    if (!container) return;

    // ★ 잠금 걸기 — 이 아래로는 절대 두 번 실행되지 않음
    isRecaptchaInit.current = true;

    // DOM 강제 초기화: 이전 찌꺼기 물리적으로 제거
    container.innerHTML = "";
    document
      .querySelectorAll(".grecaptcha-badge")
      .forEach((el) => el.remove());

    const verifier = new RecaptchaVerifier(auth, container, {
      size: "normal",
      callback: () => setCaptchaPassed(true),
      "expired-callback": () => setCaptchaPassed(false),
    });

    verifier
      .render()
      .then(() => {
        window.recaptchaVerifier = verifier;
        console.log("[PhoneLogin] reCAPTCHA 렌더 완료");
      })
      .catch((err) => {
        console.error("[PhoneLogin] reCAPTCHA 렌더 실패:", err);
        // 실패 시 잠금 해제하여 재시도 가능하게
        isRecaptchaInit.current = false;
      });

    // 언마운트 시: 완전 파괴
    return () => {
      isRecaptchaInit.current = false;
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch { /* */ }
        window.recaptchaVerifier = null;
      }
      const el = document.getElementById(RECAPTCHA_ID);
      if (el) el.innerHTML = "";
      document
        .querySelectorAll(".grecaptcha-badge")
        .forEach((badge) => badge.remove());
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // ── 인증번호 전송 ──
  const handleSendCode = useCallback(async () => {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      setError("올바른 전화번호를 입력해주세요.");
      return;
    }
    if (!window.recaptchaVerifier) {
      setError("보안 인증을 먼저 완료해주세요.");
      return;
    }

    setSending(true);
    try {
      const e164 = toE164(phone);
      console.log("[PhoneLogin] E.164:", e164);
      const result = await signInWithPhoneNumber(
        auth,
        e164,
        window.recaptchaVerifier,
      );
      confirmRef.current = result;
      setStep("code");
      showToast("인증번호가 전송되었습니다.");
    } catch (err: unknown) {
      const fe = err as { code?: string; message?: string };
      console.error("[PhoneLogin] 전송 실패:", fe.code, fe.message);
      const msgs: Record<string, string> = {
        "auth/invalid-phone-number":
          "번호 형식이 잘못되었습니다. 010으로 시작하는 번호를 입력해주세요.",
        "auth/too-many-requests":
          "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        "auth/invalid-app-credential":
          "보안 인증이 만료되었습니다. 체크박스를 다시 클릭해주세요.",
        "auth/quota-exceeded":
          "일일 SMS 한도를 초과했습니다.",
        "auth/operation-not-allowed":
          "전화번호 로그인이 비활성화되어 있습니다. 관리자에게 문의해주세요.",
      };
      setError(
        msgs[fe.code ?? ""] ??
          `전송 실패: ${fe.message ?? "알 수 없는 오류"}`,
      );

      // reCAPTCHA 리셋 — 파괴 후 재생성
      setCaptchaPassed(false);
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch { /* */ }
        window.recaptchaVerifier = null;
      }
      isRecaptchaInit.current = false;
      const container = document.getElementById(RECAPTCHA_ID);
      if (container) {
        container.innerHTML = "";
        const newVerifier = new RecaptchaVerifier(auth, container, {
          size: "normal",
          callback: () => setCaptchaPassed(true),
          "expired-callback": () => setCaptchaPassed(false),
        });
        newVerifier.render().then(() => {
          window.recaptchaVerifier = newVerifier;
          isRecaptchaInit.current = true;
          console.log("[PhoneLogin] reCAPTCHA 재생성 완료");
        });
      }
    } finally {
      setSending(false);
    }
  }, [phone]);

  // ── 인증번호 확인 + 로그인 ──
  const handleVerifyCode = useCallback(async () => {
    setError("");
    if (code.length !== 6) {
      setError("6자리 인증번호를 입력해주세요.");
      return;
    }
    if (!confirmRef.current) {
      setError("인증번호를 먼저 전송해주세요.");
      return;
    }

    setVerifying(true);
    try {
      const credential = await confirmRef.current.confirm(code);
      const user = credential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          displayName: user.displayName || "새 신자",
          photoURL: user.photoURL || "",
          phoneNumber: user.phoneNumber || "",
        });
      }

      showToast("로그인되었습니다!");
      setTimeout(() => onClose(), 500);
    } catch (err: unknown) {
      const fe = err as { code?: string; message?: string };
      console.error("[PhoneLogin] 인증 실패:", fe.code, fe.message);
      const msgs: Record<string, string> = {
        "auth/invalid-verification-code":
          "인증번호가 올바르지 않습니다.",
        "auth/code-expired":
          "인증번호가 만료되었습니다. 다시 전송해주세요.",
        "auth/session-expired":
          "세션이 만료되었습니다. 처음부터 다시 시도해주세요.",
      };
      setError(
        msgs[fe.code ?? ""] ??
          `인증 실패: ${fe.message ?? "알 수 없는 오류"}`,
      );
    } finally {
      setVerifying(false);
    }
  }, [code, onClose]);

  const phoneDigits = phone.replace(/\D/g, "");
  const canSend = captchaPassed && phoneDigits.length >= 10 && !sending;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl w-full max-w-sm p-6 sm:p-8 relative">
          {/* 닫기 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 헤더 */}
          <div className="flex flex-col items-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
              <Phone className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              전화번호 로그인
            </h2>
          </div>

          {/* 에러 */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-bold text-center">
              {error}
            </div>
          )}

          {step === "phone" ? (
            <div className="space-y-4">
              {/* 전화번호 입력 */}
              <div>
                <label className="text-sm font-bold text-slate-500 mb-1.5 block">
                  전화번호 (하이픈 없이)
                </label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 px-3 py-3.5 rounded-xl bg-slate-100 text-base font-black text-slate-600">
                    +82
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="01012345678"
                    className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              {/* reCAPTCHA (visible, normal) */}
              <div className="flex justify-center">
                <div id={RECAPTCHA_ID} />
              </div>

              {/* 전송 버튼 */}
              <button
                onClick={handleSendCode}
                disabled={!canSend}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black text-lg transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
                {sending ? "전송 중..." : "인증번호 전송"}
              </button>

              {!captchaPassed && (
                <p className="text-center text-sm font-bold text-slate-400">
                  위의 보안 인증을 먼저 완료해주세요
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={code || ""}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="인증번호 6자리"
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-center text-2xl font-black text-slate-900 tracking-[0.5em] placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-lg focus:border-blue-400 focus:bg-white focus:outline-none transition-colors"
                maxLength={6}
                autoFocus
              />
              <button
                onClick={handleVerifyCode}
                disabled={verifying || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black text-lg transition-colors"
              >
                {verifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {verifying ? "확인 중..." : "로그인"}
              </button>
              <button
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                  setCaptchaPassed(false);
                }}
                className="w-full text-center text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors py-2"
              >
                전화번호 다시 입력
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-6 py-3.5 rounded-full bg-slate-900 text-white font-bold text-base shadow-xl">
          <Check className="w-5 h-5 text-green-400" />
          {toast}
        </div>
      )}
    </>
  );
}
