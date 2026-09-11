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
  // Cache note: Vercel's CDN caches static /public assets persistently
  // by exact path, independent of deploys (confirmed the hard way with
  // the icon files above) - if manifest.json's content ever needs to
  // change after this is live, rename it (manifest-v2.json) rather
  // than editing in place, same as icon-192-v3.png etc. Fine as a
  // bare name for now since this is its first version.
  manifest: "/manifest-v2.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HintDrop",
  },
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
    // Previously used ?v=N query strings to bust caches on these -
    // that worked for regular browser tab favicons, but confirmed NOT
    // sufficient for Android's native share-sheet icon (still showing
    // the old design on two different devices after multiple ?v=
    // bumps). Root cause: Vercel's CDN caches static /public assets
    // persistently BY EXACT PATH, independent of deploys - a lesson
    // already learned earlier for the OG image and logo files
    // (og-default.png -> og-default-v2.png) but not yet applied here.
    // Android's icon-fetch mechanism most likely requests the bare
    // path directly, bypassing the query string entirely, so the CDN
    // kept serving its old cached response no matter how many times
    // the query string changed. Switched to genuinely renamed files
    // (icon-192-v3.png etc.) instead - a real rename forces a new CDN
    // cache entry regardless of how the consumer requests it.
    //
    // favicon-v2.svg removed entirely - confirmed it's not real
    // vector art, just a 64x64 raster PNG wrapped in <svg><image>
    // markup. Declaring it as image/svg+xml told browsers/crawlers
    // it was infinitely scalable, so Google Search (which needs an
    // icon >=48px and reaches for a larger one than the tiny 32px
    // favicon) picked this "SVG" and scaled up what's actually a
    // small, transparent raster - producing exactly the blurry,
    // white-background look seen in Search results. icon-192-v3.png
    // (properly sized, coral-filled, no transparency) is now the
    // only larger option available, so that's what Search should
    // pick up on its next crawl instead.
    icon: [
      { url: "/favicon-v2.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192-v3.png", type: "image/png", sizes: "192x192" },
    ],
    // v3: the v2 file was transparent (bare glyph, no fill) - fine
    // for a browser tab, but iOS renders transparent areas of a
    // home-screen icon as solid black, not see-through. Needed the
    // same opaque coral+white treatment as every other real app-icon
    // context, not the tab-only transparent style.
    apple: "/apple-touch-icon-v3.png",
    shortcut: "/favicon-v2.png",
  },
  title: {
    default: "HintDrop",
    template: "%s | HintDrop",
  },
  description: "Save what you actually want. Remember who matters. Plan gifts together. HintDrop is the thoughtful gifting app for hints, reminders, and group gifting.",
  metadataBase: new URL("https://hintdrop.app"),
  // Sitewide fallback - only takes effect on a page/layout that
  // doesn't declare its own openGraph/twitter config. Every page
  // audited in this pass already sets its own, but this is a safety
  // net so a future page that forgets metadata entirely still gets a
  // real image and description in link previews instead of nothing.
  openGraph: {
    title: "HintDrop",
    description: "Save what you actually want. Remember who matters. Plan gifts together.",
    siteName: "HintDrop",
    type: "website",
    images: ["https://hintdrop.app/og-default-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "HintDrop",
    description: "Save what you actually want. Remember who matters. Plan gifts together.",
    images: ["https://hintdrop.app/og-default-v2.png"],
  },
};

// Separate from metadata above - themeColor and viewport settings
// moved to their own export in modern Next.js. themeColor colours
// the browser's own UI chrome (Android's status bar, installed-PWA
// title bar) to match the brand instead of defaulting to plain
// white/black.
export const viewport = {
  themeColor: "#ff875d",
  width: "device-width",
  initialScale: 1,
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
