import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="page-card" style={{ maxWidth: 720 }}>
        <span className="eyebrow">Login</span>
        <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>Welcome back.</h1>
        <p className="hero-copy">Sign in to manage your circles, review hints, and stay on top of the moments that matter.</p>

        <form className="form-stack">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Enter your password" />
          </div>
          <div className="actions">
            <button type="submit" className="btn btn-primary">Sign in</button>
            <Link href="/onboarding" className="btn">Create account</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
