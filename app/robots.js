export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/feed",
          "/hints",
          "/circles",
          "/account",
          "/settings",
          "/onboarding",
          "/people",
          "/calendar",
          "/shop",
          "/invite",
          "/join",
          "/profile",
          "/billing",
          "/auth",
          "/api/",
        ],
      },
    ],
    sitemap: "https://hintdrop.app/sitemap.xml",
  };
}
