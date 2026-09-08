import { cookies, headers } from "next/headers";
import { REGION_COOKIE, countryToRegion, isValidRegion } from "./region";

// Read-only counterpart to the detection in middleware.js. Server
// Components can read cookies/headers during render but can't write
// a Set-Cookie header themselves (that's only allowed from Server
// Actions, Route Handlers, or Middleware) - so this never persists
// anything, it just picks the best region to render *this* request
// with. /shop-uk and /shop-us go through middleware.js on every
// request anyway, which keeps the cookie in sync; this is for pages
// like /gift-shop that stay on one URL regardless of region and so
// never pass through that redirect/cookie-refresh logic.
export async function detectRegionServer() {
  const cookieStore = await cookies();
  const existingRegion = cookieStore.get(REGION_COOKIE)?.value;

  if (isValidRegion(existingRegion)) return existingRegion;

  const headerStore = await headers();
  const country = headerStore.get("x-vercel-ip-country");

  return countryToRegion(country);
}
