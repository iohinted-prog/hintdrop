import { Geist, Geist_Mono, Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});
import "./globals.css";
import { PreferencesProvider } from "./providers/PreferencesProvider";
import AppShell from "./components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} antialiased`}>
        <PreferencesProvider>
          <AppShell>{children}</AppShell>
        </PreferencesProvider>
      </body>
    </html>
  );
}
