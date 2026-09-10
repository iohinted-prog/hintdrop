"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Deliberately a client-side redirect, not next/navigation's server-
// side redirect() - see the comment in page.js for why: a server
// redirect sends a real HTTP 307, so a crawler never actually reads
// this route's generateMetadata output, it just follows the redirect
// straight past it. This component only runs in the browser, after
// the crawler-visible HTML (with the real metadata already in
// <head>) has already been served.
export default function BoardRedirectClient({ to }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [to, router]);

  return null;
}
