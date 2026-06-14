import Link from "next/link";

export const metadata = {
  title: "Hinted.io | Build circles, hints, and reminders",
  description:
    "Hinted helps you keep track of people, memories, and follow-ups with circles, hints, and reminders.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-800">
      <header className="border-b border-slate-200/80 bg-[#f7f4ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <span className="text-lg">💬</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Hinted.io</div>
              <div className="text-xs text-slate-500">Build circles, hints, and reminders</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900">
              How it works
            </Link>
            <Link href="#features" className="text-sm text-slate-600 hover:text-slate-900">
              Features
            </Link>
            <Link href="/login" className="text-sm font-medium text-slate-900">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1200px] gap-12 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            Early access
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
            Welcome to Hinted.
          </h1>

          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
            Join early access and start building your Circles, Hints, and reminders.
          </p>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex gap-2 rounded-2xl border border-slate-200 bg-[#fbf8f4] p-2">
              <Link
                href="/login"
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Sign in
              </Link>

              <Link
                href="/onboarding"
                className="flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Create account
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-full bg-[#f36f64] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                Sign in
              </button>
              <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700">
                Continue with Google
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              You can use an email/password account now and connect other sign-in methods later.
            </p>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-[#f9f5f0] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Circles
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Organize people you care about.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Group friends, family, or teammates into private circles.
              </p>
            </div>

            <div className="rounded-3xl bg-[#eef3f8] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Hints
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Capture context before you forget.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Save notes, reminders, and subtle clues tied to each person.
              </p>
            </div>

            <div className="rounded-3xl bg-[#f4f7ef] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Reminders
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Never miss the important follow-up.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Set reminders so the right message lands at the right time.
              </p>
            </div>

            <div className="rounded-3xl bg-[#f8eef0] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Memory
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Remember the little things.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep track of notes, context, and details that matter later.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
