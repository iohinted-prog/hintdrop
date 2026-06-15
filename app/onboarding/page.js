import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="page-shell">
      <section className="page-card" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Early access</span>

        <h1
          className="hero-title"
          style={{ fontSize: "clamp(2.25rem, 4vw, 3.75rem)" }}
        >
          Create your account.
        </h1>

        <p className="hero-copy">
          Join Hinted to organize your circles, keep context on the people you
          care about, and never forget important follow-ups.
        </p>

        <form className="form-stack">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
            />
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Create account
            </button>

            <Link href="/login" className="btn">
              Sign in instead
            </Link>
          </div>
        </form>

        <p className="helper">
          By continuing, you agree to the early access terms for Hinted.
        </p>
      </section>
    </main>
  );
}
