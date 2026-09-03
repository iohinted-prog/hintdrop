"use client";

import { useEffect, useState } from "react";
import PublicShell from "../components/PublicShell";
import { createClient } from "../../lib/supabase/client";

export default function ExtensionClient() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // Same two-step pattern as ProfileClient.jsx: a fast local session
      // read first so the correct header renders immediately, then
      // confirmed/replaced with the network-validated user once that
      // resolves - avoids the signed-in-vs-signed-out flicker documented
      // there.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUser(session.user);

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setCheckedAuth(true);
    }

    load();
  }, []);

  const inner = (
    <main className="min-h-screen bg-[#fffaf7] text-slate-800">
      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 rounded-[28px] border border-[#eadfd4] bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#c1846c]">
              Coming soon
            </p>
            <h1 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              The HintDrop browser extension
            </h1>
            <p className="mb-4 text-slate-600">
              Some shops don&apos;t make it easy to grab a product&apos;s photo, name, and price
              automatically. The HintDrop extension reads the page directly, right from your
              own browser, while you&apos;re already looking at it — so you can save the exact
              details, even from the trickiest sites.
            </p>
            <p className="mb-6 text-slate-600">
              It&apos;s in final testing right now. Check back here — this page will turn into
              a one-click install for your browser as soon as it&apos;s live.
            </p>
            <div className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-full border border-[#ead8ce] bg-[#f3ece3] px-6 text-sm font-semibold text-slate-400">
              Coming soon
            </div>
          </div>
        </div>
      </section>
    </main>
  );

  // Same pattern as ProfileClient.jsx: only wrap in PublicShell (its own
  // signed-out-appropriate header) once we've actually confirmed there's
  // no signed-in user - the parent layout's AppShell already provides
  // the normal app header for a signed-in visitor, so wrapping
  // unconditionally here duplicated both headers at once.
  if (checkedAuth && !currentUser) return <PublicShell>{inner}</PublicShell>;
  if (!checkedAuth) return null;
  return inner;
}
