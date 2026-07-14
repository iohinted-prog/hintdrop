"use client";
import Link from "next/link";
import GoogleAuthButtons from "./GoogleAuthButtons";

function LandingLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-b from-[#ffa47f] to-[#ff875d] text-xl text-white shadow-lg">
        🎁
      </div>
      <div className="text-[20px] font-bold tracking-[-0.03em] text-slate-900">
        Hint<span className="text-[#f36f64]">Drop</span>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  return (
    <main className="min-h-screen bg-white text-slate-800">

      {/* Nav */}
      <header className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-6 md:px-10">
        <LandingLogo />
        <div className="flex items-center gap-3">
          <Link href="/gift-shop"
            className="hidden sm:inline-flex h-11 items-center justify-center rounded-full border border-[#ead8ce] bg-white px-5 text-[14px] font-semibold text-slate-700 hover:bg-[#fff5f0]">
            Gift Shop
          </Link>
          <a href="#signup"
            className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-6 text-[14px] font-bold text-white shadow-lg">
            Get started
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[820px] px-6 pt-16 pb-24 text-center md:px-10 md:pt-24">
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#ff8060]">
          Thoughtful gifting
        </p>
        <h1 className="mt-5 text-[52px] font-[800] leading-[1.0] tracking-[-0.05em] text-slate-900 sm:text-[72px] md:text-[88px]"
          style={{fontFamily: "var(--font-nunito), system-ui, sans-serif", fontWeight: 800}}>
          Never forget.<br />
          <span className="text-[#ff8060]">Always thoughtful.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-[520px] text-[17px] leading-8 text-slate-500">
          Save what you actually want. Remember who matters.
          Plan gifts together with the people you care about.
        </p>
        <div id="signup" className="mx-auto mt-10 max-w-[440px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-900">Join HintDrop</h2>
          <p className="mt-1 text-sm text-slate-400">Save hints, remember dates, plan gifts with friends.</p>
          <div className="mt-5 space-y-3">
            <GoogleAuthButtons variant="hero-primary" />
            <p className="text-xs text-slate-400">
              New here? Use Google to create your account. Returning users log in the same way.
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline">Terms</Link>{" "}
            and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      {/* Feature 1 — Hints */}
      <section className="border-t border-slate-100 bg-[#fffaf7]">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#ff8060]">Hints</p>
              <h2 className="mt-4 text-[36px] font-[700] leading-[1.1] tracking-[-0.04em] text-slate-900 md:text-[44px]">
                Save what you actually want.
              </h2>
              <p className="mt-5 text-[16px] leading-8 text-slate-500">
                Build your hint list with things you genuinely want — from any retailer, at any price. Share it with the people who matter so they always know what to get you.
              </p>
            </div>
            <div className="rounded-[28px] bg-[#f5f0eb] p-6 md:p-8">
              <div className="space-y-3">
                {[
                  { title: "Noise-cancelling headphones", retailer: "amazon.co.uk", price: "~£120", tag: "Tech" },
                  { title: "Weekend cabin stay", retailer: "airbnb.co.uk", price: "Price varies", tag: "Experiences" },
                  { title: "Cast-iron casserole dish", retailer: "johnlewis.com", price: "~£85", tag: "Home" },
                ].map((hint, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-[18px] bg-white p-4">
                    <div className="h-10 w-10 rounded-[12px] bg-gradient-to-br from-[#f5d5c4] to-[#e8a080] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{hint.title}</p>
                      <p className="text-[12px] text-slate-400">{hint.retailer} · {hint.price}</p>
                    </div>
                    <span className="rounded-full bg-[#fff4ee] px-2.5 py-1 text-[11px] font-semibold text-[#df7b59] shrink-0">{hint.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2 — People */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 md:order-1 rounded-[28px] bg-[#f0f4f8] p-6 md:p-8">
              <div className="space-y-3">
                {[
                  { name: "Mum", date: "Birthday · 12 Aug", initials: "M", colors: "from-[#e8b9a7] to-[#bf755f]" },
                  { name: "Sarah", date: "Anniversary · 29 Jun", initials: "S", colors: "from-[#efcdbf] to-[#bb8168]" },
                  { name: "James", date: "New job · 6 Jul", initials: "J", colors: "from-[#b7c8db] to-[#6b88a7]" },
                ].map((person, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-[18px] bg-white p-4">
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-b flex items-center justify-center text-sm font-bold text-white shrink-0 ${person.colors}`}>{person.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{person.name}</p>
                      <p className="text-[12px] text-slate-400">{person.date}</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-[#ff8060] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#ff8060]">People</p>
              <h2 className="mt-4 text-[36px] font-[700] leading-[1.1] tracking-[-0.04em] text-slate-900 md:text-[44px]">
                Remember who matters.
              </h2>
              <p className="mt-5 text-[16px] leading-8 text-slate-500">
                Keep track of the people in your life — their birthdays, milestones, and what they love. HintDrop reminds you before the moment passes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3 — Circles */}
      <section className="border-t border-slate-100 bg-[#fffaf7]">
        <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#ff8060]">Circles</p>
              <h2 className="mt-4 text-[36px] font-[700] leading-[1.1] tracking-[-0.04em] text-slate-900 md:text-[44px]">
                Plan gifts together.
              </h2>
              <p className="mt-5 text-[16px] leading-8 text-slate-500">
                Create a circle around a birthday, wedding, or milestone. Invite people in, agree on a gift, and coordinate who contributes what — all in one place.
              </p>
            </div>
            <div className="rounded-[28px] bg-[#f0f7ee] p-6 md:p-8">
              <div className="rounded-[20px] bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Circle</p>
                    <p className="text-[18px] font-semibold text-slate-900 mt-0.5">Dad's 60th birthday</p>
                  </div>
                  <span className="rounded-full bg-[#fff4ee] px-3 py-1 text-[11px] font-semibold text-[#df7b59]">3 of 4 joined</span>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "You", status: "✓ Paid", green: true },
                    { name: "Sarah", status: "✓ Paid", green: true },
                    { name: "James", status: "✓ Paid", green: true },
                    { name: "Emma", status: "Invited", green: false },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between rounded-[12px] bg-[#f7fbf5] px-3 py-2.5">
                      <p className="text-sm font-medium text-slate-700">{m.name}</p>
                      <span className={`text-[11px] font-semibold ${m.green ? "text-[#4a7a3a]" : "text-slate-400"}`}>{m.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-[600px] px-6 py-24 text-center md:px-10">
          <h2 className="text-[36px] font-[700] leading-[1.1] tracking-[-0.04em] text-slate-900 md:text-[48px]">
            Start with the people you love.
          </h2>
          <p className="mx-auto mt-5 max-w-[420px] text-[16px] leading-8 text-slate-500">
            Free to join. No credit card needed.
          </p>
          <a href="#signup"
            className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-b from-[#ff966f] to-[#ff7e54] px-10 text-[15px] font-bold text-white shadow-lg">
            Get started free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-400 sm:flex-row md:px-10">
          <LandingLogo />
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-slate-700">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link href="/about" className="hover:text-slate-700">About</Link>
            <Link href="/contact" className="hover:text-slate-700">Contact</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
