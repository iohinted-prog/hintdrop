/** @type {import('next').NextConfig} */
const nextConfig = {
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || process.env.GIT_SHA || undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // Without this, Vercel's automatic file-tracing doesn't reliably detect
  // that app/opengraph-image.js and app/join/[ownerId]/opengraph-image.js
  // need lib/fonts/*.ttf at runtime (they're read via fs.readFileSync,
  // which static analysis can miss for non-JS binary assets) - the files
  // exist in the repo and build correctly, but silently don't make it
  // into the deployed function bundle without being told to explicitly.
  // Confirmed via a real Vercel production error log: every single
  // request to '/' was throwing ENOENT trying to open the font file,
  // which crashed the whole page (metadata generation failures bring
  // down the full route, not just the OG tag) - this was live and
  // affecting every real visitor, not just the Capacitor app testing
  // that surfaced it.
  outputFileTracingIncludes: {
    "/": ["./lib/fonts/**"],
    "/join/[ownerId]": ["./lib/fonts/**"],
  },
};

export default nextConfig;
