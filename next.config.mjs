/** @type {import('next').NextConfig} */
const nextConfig = {
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || process.env.GIT_SHA || undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
