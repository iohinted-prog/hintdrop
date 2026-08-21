"use client";
import Link from "next/link";

// A thin vector chevron, not a text arrow character (←) — text glyphs have
// inconsistent vertical metrics across fonts/browsers, which is what was
// actually causing the "arrow isn't centered" look. Matches the standard
// iOS-style back pattern: small chevron + label, precisely centered via
// flex, subtle pill hover rather than a heavy button.
export default function BackLink({ href, onClick, children }) {
  const className =
    "inline-flex h-8 items-center gap-1 rounded-full pl-1.5 pr-3 text-[13px] font-semibold text-slate-400 transition hover:bg-[#fff1e9] hover:text-[#df7b59]";

  const content = (
    <>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      <span className="leading-none">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
