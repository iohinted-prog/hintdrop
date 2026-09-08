import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Same Supabase project as the web app (hintdrop.app) - same users,
// same database, same auth accounts. Someone signed in on the
// website is a real, findable row in the same `profiles` table this
// app reads and writes, not a separate account system.
//
// Storage is AsyncStorage rather than SecureStore deliberately, even
// though SecureStore sounds like the "more secure" choice: Supabase's
// session object (access + refresh tokens together) can exceed
// SecureStore's 2048-byte-per-key limit on iOS, and silently fails
// to save past that - a real, documented gotcha, not a theoretical
// one. AsyncStorage has no such limit. The session tokens themselves
// are already short-lived and scoped to the Supabase project (not
// the device's actual keychain-grade secrets, like a device
// passcode), so this trade-off is standard practice for Supabase +
// React Native specifically, not a shortcut.
//
// The actual URL/anon key values are read from Expo's public env
// vars (EXPO_PUBLIC_ prefix - the React Native/Expo equivalent of
// Next.js's NEXT_PUBLIC_ prefix, both meaning "safe to ship in the
// client bundle"). Set these in mobile/.env - see .env.example.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY - copy mobile/.env.example to mobile/.env and fill in the real values (same ones the web app's Vercel project already uses)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // The web app relies on detecting an OAuth redirect in the URL
    // itself (detectSessionInUrl: true is its default) - there's no
    // browser URL bar here, auth redirects come back through a deep
    // link instead (see lib/authRedirect.js), so this must be off or
    // the client tries to parse a URL structure that doesn't apply.
    detectSessionInUrl: false,
  },
});
