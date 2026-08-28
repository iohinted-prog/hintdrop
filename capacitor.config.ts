import type { CapacitorConfig } from '@capacitor/cli';

// Points the native app shell at the live production site rather than
// bundling a static copy. This is the right call specifically because
// HintDrop is a server-rendered Next.js app with real API routes, auth,
// and cron-dependent features - a static export wouldn't work correctly
// (Next.js static export doesn't support API routes or server actions).
// This approach gets a real installable app - icon, splash screen,
// native shell, App Store presence - without any risky rework of the
// actual app itself. It's genuinely how a lot of production apps work,
// not just a demo shortcut.
const config: CapacitorConfig = {
  appId: 'app.hintdrop.mobile',
  appName: 'HintDrop',
  webDir: 'public', // unused when server.url is set, but required by the type
  server: {
    url: 'https://hintdrop.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
