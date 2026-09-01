import { Suspense } from "react";
import UnsubscribeClient from "./UnsubscribeClient";

// noindex - this page is only ever meant to be reached via the private,
// per-person link in an email, never discovered/indexed on its own.
export const metadata = {
  title: "Manage Email Preferences | HintDrop",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fffaf7]" />}>
      <UnsubscribeClient />
    </Suspense>
  );
}
