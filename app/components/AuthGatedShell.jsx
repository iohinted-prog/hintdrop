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
// While auth hasn't resolved yet, this renders nothing (null) rather
// than guessing - both a signed-in AppShell (already provided by the
// parent layout, invisible to this component) and PublicShell are
// legitimate final states, and rendering either one first only to
// possibly swap it a moment later is its own version of this same
// flicker/double-render class of bug.
export default function AuthGatedShell({ checkedAuth, currentUser, children }) {
  if (!checkedAuth) return null;
  if (!currentUser) return <PublicShell>{children}</PublicShell>;
  return children;
}
