export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/feed",
          "/hints",
          "/circle",
          "/account",
          "/settings",
          "/onboarding",
          "/circles-legacy",
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
