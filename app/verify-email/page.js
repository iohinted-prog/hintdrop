"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicShell from "../components/PublicShell";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState(token ? "ready" : "error"); // ready | verifying | success | error
  const [message, setMessage] = useState(token ? "" : "This link is missing its verification code.");

  function handleConfirm() {
    setStatus("verifying");
    fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.error || "Something went wrong.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-[420px] px-4 py-16 text-center">
        {status === "ready" && (
          <>
            <p className="text-4xl mb-4">🎁</p>
            <h1 className="text-[20px] font-semibold text-slate-900">Confirm your email</h1>
            <p className="mt-2 text-sm text-slate-500">Tap below to confirm this is really your address.</p>
            <button type="button" onClick={handleConfirm}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-sm font-semibold text-white shadow-lg">
              Confirm my email
            </button>
          </>
        )}
        {status === "verifying" && (
          <>
            <p className="text-4xl mb-4">🎁</p>
            <p className="text-sm text-slate-400">Confirming your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-4xl mb-4">✅</p>
            <h1 className="text-[20px] font-semibold text-slate-900">Email confirmed</h1>
            <p className="mt-2 text-sm text-slate-500">You're all set — thanks for confirming.</p>
            <Link href="/feed" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-sm font-semibold text-white shadow-lg">
              Go to HintDrop
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-4xl mb-4">🤔</p>
            <h1 className="text-[20px] font-semibold text-slate-900">Couldn't confirm that</h1>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
            <Link href="/settings" className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] px-6 text-sm font-semibold text-slate-700">
              Go to settings
            </Link>
          </>
        )}
      </div>
    </PublicShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <PublicShell>
        <div className="mx-auto max-w-[420px] px-4 py-16 text-center">
          <p className="text-4xl mb-4">🎁</p>
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </PublicShell>
    }>
      <VerifyEmailInner />
    </Suspense>
  );
}
