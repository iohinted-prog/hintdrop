// Shared social profile links — used in both PublicShell's footer (every
// guest-facing page: terms/privacy/about/for-brands/contact/gift-shop)
// and the homepage's own separate footer (HomePageClient doesn't route
// through PublicShell). Also the source of truth these URLs came from
// for the Organization JSON-LD sameAs array on the homepage.
export const SOCIAL_LINKS = [
  { name: "LinkedIn", href: "https://www.linkedin.com/company/hintdrop-app/" },
  { name: "Instagram", href: "https://www.instagram.com/hintdrop.app" },
  { name: "X", href: "https://x.com/HintDropapp" },
  { name: "Facebook", href: "https://www.facebook.com/people/HintDrop/61591697110919/" },
];

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "LinkedIn":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="7" cy="7.5" r="1.4" fill="currentColor" />
          <rect x="5.8" y="10.5" width="2.4" height="8" fill="currentColor" />
          <path d="M11 10.5H13.3V11.9C13.7 11.1 14.7 10.2 16.3 10.2C18.6 10.2 19.5 11.8 19.5 14.3V18.5H17.1V14.8C17.1 13.5 16.8 12.6 15.5 12.6C14.2 12.6 13.4 13.4 13.4 14.8V18.5H11V10.5Z" fill="currentColor" />
        </svg>
      );
    case "Instagram":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      );
    case "X":
      return (
        <svg {...common}>
          <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "Facebook":
      return (
        <svg {...common}>
          <path d="M14.5 8.5H16.5V5.3C16.16 5.26 15 5.16 13.65 5.16C10.83 5.16 8.9 6.89 8.9 10.05V12.7H5.8V16.26H8.9V22H12.58V16.26H15.56L16.02 12.7H12.58V10.42C12.58 9.38 12.86 8.5 14.5 8.5Z" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

export default function SocialLinks({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`HintDrop on ${s.name}`}
          className="text-slate-400 transition hover:text-[#ff875d]"
        >
          <Icon name={s.name} />
        </a>
      ))}
    </div>
  );
}
