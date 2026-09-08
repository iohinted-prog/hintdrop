import { Nunito, Inter } from "next/font/google";
import Script from "next/script";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});
import "./globals.css";
import { PreferencesProvider } from "./providers/PreferencesProvider";
import AppShell from "./components/AppShell";

// Sitewide font - switched from Quicksand (which read as too rounded/
// informal once seen live across the whole site) to Inter, the
// cleanest, most neutral option from the original comparison. Loaded
// at 400 (body text), 600 (existing font-semibold usages), and 700
// (bold headings, wordmark).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-inter",
});

export const metadata = {
  icons: {
    // app/favicon.ico (Next.js's own file-convention icon, auto-served
    // at /favicon.ico and auto-linked in every page's <head>) was left
    // as the literal unedited default create-next-app scaffold file —
    // the Vercel triangle logo — the whole time, completely separate
    // from this config. That's almost certainly what Google's crawler
    // and various browsers were actually picking up, regardless of what
    // was declared here. Now replaced with a real multi-resolution
    // HintDrop icon (16/32/48/64/128/256px). Also added a 192x192 PNG
    // option here — Google's guidance wants a size that's a multiple of
    // 48px among the available options, and the old declared set
    // topped out at 32x32.
    // ?v=2 query strings added on the explicit icon/apple/shortcut URLs
    // below - browsers cache favicons far more aggressively than
    // regular images (often ignoring normal cache invalidation
    // entirely), so changing just the file's content wasn't enough to
    // get some browsers to pick up the new design. A version query
    // string forces it to be treated as a genuinely different resource.
    icon: [
      { url: "/favicon.svg?v=9", type: "image/svg+xml" },
      { url: "/favicon.png?v=9", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png?v=9", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png?v=9",
    shortcut: "/favicon.png?v=9",
  },
  title: {
    default: "HintDrop",
    template: "%s | HintDrop",
  },
  description: "Save what you actually want. Remember who matters. Plan gifts together. HintDrop is the thoughtful gifting app for hints, reminders, and group gifting.",
  metadataBase: new URL("https://hintdrop.app"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${inter.variable} antialiased`}>
        {/* Auto-affiliate link rewriting (Skimlinks) — was only loaded on
            /shop, meaning every outbound retailer link anywhere else in the
            app (gift-shop, hints, hint detail modals, shared hint/board
            previews) went straight to the retailer with zero monetization.
            Loading it once here applies it consistently app-wide instead. */}
        <Script
          id="skimlinks-loader"
          strategy="afterInteractive"
          src="https://s.skimresources.com/js/305122X1793314.skimlinks.js"
        />
        <PreferencesProvider>
          <AppShell>{children}</AppShell>
        </PreferencesProvider>
      </body>
    </html>
  );
}
