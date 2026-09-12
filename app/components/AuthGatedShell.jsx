"use client";
import PublicShell from "./PublicShell";

// The single source of truth for "which shell wraps this page" across
// every public/share page that needs to look different signed-in vs
// signed-out (join, profile, hint/board previews, extension, pot).
// This bug (both a real signed-in AppShell AND a PublicShell rendering
// at once) has now recurred more than once because each page
// reimplemented its own version of this check by hand - easy to get
// subtly wrong or just forget entirely, which is exactly what happened
// in JoinCircleClient.jsx. Routing every one of these pages through
// this one component instead means there's exactly one place this
// logic can ever be wrong, not N places, and a new page that uses it
// literally cannot reproduce this bug.
//
// Usage: track auth resolution yourself (checkedAuth/currentUser,
// same getSession-then-getUser pattern already used everywhere for
// the flicker-free signed-in read), then wrap your page's whole
// returned JSX in this instead of conditionally wrapping in
// PublicShell by hand.
//
//   if (checkedAuth) return <AuthGatedShell checkedAuth={checkedAuth} currentUser={currentUser}>{inner}</AuthGatedShell>;
//
// While auth hasn't resolved yet, this now renders children bare
// (unwrapped) rather than null. Returning null was the safer choice
// against the double-header bug this component exists to prevent,
// but it had a real cost that only showed up later: any page using
// this rendered completely empty - not just headerless, genuinely
// content-free - for the entire window between mount and the async
// auth check resolving. For a page a real visitor waits half a
// second for, that's invisible. For a crawler that renders once and
// moves on (confirmed via Search Console: gift-shop-uk was crawled
// successfully - 200 OK - but flagged as a Soft 404, because
// whatever Googlebot's renderer captured looked empty), it can mean
// the page is judged to have no real content at all.
//
// This is still safe against the double-header bug: AppShell (the
// parent layout) independently hides its own header for every path
// in its conditionallyHiddenPath list until ITS OWN auth check
// resolves, regardless of what this component does - so during this
// component's loading window, AppShell's header stays hidden on its
// own, and there's nothing here yet to conflict with. Once this
// component's checkedAuth resolves, it swaps to PublicShell (signed
// out) or bare children with AppShell's now-visible header (signed
// in) - exactly one shell, same as before, just with real content
// visible the whole time instead of a blank window first.
export default function AuthGatedShell({ checkedAuth, currentUser, children }) {
  if (checkedAuth && !currentUser) return <PublicShell>{children}</PublicShell>;
  return children;
}
