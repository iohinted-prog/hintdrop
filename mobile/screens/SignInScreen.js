import { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Text from "../components/Text";
import { supabase } from "../lib/supabase";

// Mirrors app/components/AuthModal.jsx. Found a critical gap here
// auditing against web: this screen previously only had a sign-in
// form (signInWithPassword) - there was no way at all to create a
// new account with email/password on mobile, only via Google OAuth.
// Now has all three of web's modes (signin/signup/forgot), matching
// its validation rules (6-char minimum password, confirm-password
// match on signup) and copy.

WebBrowser.maybeCompleteAuthSession();

// hintdrop:///auth-callback - matches the "scheme": "hintdrop" already
// set in app.json. This exact URL needs to be added to Supabase's
// allowed redirect URLs (Authentication > URL Configuration) or the
// OAuth provider will reject the request outright.
const redirectTo = Linking.createURL("auth-callback");

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

export default function SignInScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError("");
    setMessage("");
    setResendSent(false);
    if (next !== "signup") setConfirmPassword("");
  }

  async function handleResendConfirmation() {
    if (resendLoading || !email.trim()) return;
    setResendLoading(true);
    setResendSent(false);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
      if (resendError) throw resendError;
      setResendSent(true);
    } catch (err) {
      setError(err?.message || "Couldn't resend the confirmation email.");
    } finally {
      setResendLoading(false);
    }
  }

  async function handleForgotSubmit() {
    setError("");
    setMessage("");
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (resetError) throw resetError;
      setMessage("If that email has an account, a reset link is on its way. Check your inbox.");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit() {
    setError("");
    setMessage("");
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signUpError) throw signUpError;
        if (data?.session) {
          // Session issued immediately (email confirmation off) -
          // AuthContext's listener picks this up on its own.
        } else if (data?.user && (data.user.identities?.length ?? 0) === 0) {
          // Supabase returns a user with no identities (and no error,
          // by design, to avoid email enumeration) when the email is
          // already registered.
          setError("That email is already in use. Try signing in instead.");
        } else {
          setMessage("Almost there — check your email and confirm your account, then come back here and sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInError) throw signInError;
        // AuthContext's onAuthStateChange listener picks up the new
        // session automatically - no manual navigation needed.
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    try {
      // skipBrowserRedirect: true is what makes Supabase hand back a
      // plain URL to open ourselves (via WebBrowser below) instead of
      // trying to navigate a browser context that doesn't exist here.
      // Scopes match web's AuthModal.jsx exactly - without these, the
      // resulting session has no provider_token with Contacts access,
      // which is what Circle's and Onboarding's Google-contacts search
      // need (both currently show "not available for this session"
      // without it).
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly",
        },
      });
      if (oauthError) throw oauthError;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success" && result.url) {
        // PKCE flow returns a ?code=... query param on the redirect
        // URL to exchange server-side for the actual session - not
        // tokens directly, unlike the older implicit flow.
        const { queryParams } = Linking.parse(result.url);
        if (queryParams?.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            queryParams.code
          );
          if (exchangeError) throw exchangeError;
        } else if (queryParams?.error_description) {
          throw new Error(String(queryParams.error_description));
        }
      }
      // result.type === "cancel" or "dismiss" - user backed out of the
      // Google screen themselves, not an error worth surfacing.
    } catch (err) {
      setError(err?.message || "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Image
          source={require("../assets/logo-transparent.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>
          Hint<Text style={styles.titleAccent}>Drop</Text>
        </Text>
        <Text style={styles.modeTitle}>
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in"}
        </Text>

        {mode !== "forgot" ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>

            {/* Microsoft/Apple sign-in intentionally not added here yet -
                same real, unresolved external blockers as the web app
                currently has (see AuthModal.jsx's comments, both are
                actually commented out there too right now): a confirmed
                Supabase-side bug for Microsoft personal accounts, and
                Apple's invalid_client issue with Feedback Assistant
                report filed and pending. */}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        ) : (
          <Text style={styles.forgotHint}>Enter your email and we'll send you a link to reset your password.</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        {mode !== "forgot" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />
            {mode === "signup" ? (
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                textContentType="password"
              />
            ) : null}
            {mode === "signin" ? (
              <Pressable style={styles.forgotLink} onPress={() => switchMode("forgot")}>
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
            {mode === "signup" ? (
              <Pressable onPress={handleResendConfirmation} disabled={resendLoading}>
                <Text style={styles.resendText}>{resendLoading ? "Sending..." : resendSent ? "Sent — check your email" : "Didn't get it? Resend"}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={mode === "forgot" ? handleForgotSubmit : handleEmailSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{mode === "forgot" ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"}</Text>
          )}
        </Pressable>

        <View style={styles.switchModeRow}>
          {mode === "signup" ? (
            <Text style={styles.switchModeText}>
              Already have an account? <Text style={styles.switchModeLink} onPress={() => switchMode("signin")}>Sign in</Text>
            </Text>
          ) : mode === "forgot" ? (
            <Text style={styles.switchModeLink} onPress={() => switchMode("signin")}>← Back to sign in</Text>
          ) : (
            <Text style={styles.switchModeText}>
              Don't have an account? <Text style={styles.switchModeLink} onPress={() => switchMode("signup")}>Sign up</Text>
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf7",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  titleAccent: {
    color: "#ff875d",
    fontWeight: "700",
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  forgotHint: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 19,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ead8ce",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 12,
  },
  forgotLink: {
    alignItems: "flex-end",
    marginTop: -6,
    marginBottom: 8,
  },
  forgotLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ff875d",
  },
  error: {
    color: "#c9633f",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  messageBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe8d8",
    backgroundColor: "#f1faf4",
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 13,
    color: "#3a7d55",
  },
  resendText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3a7d55",
    marginTop: 8,
    textDecorationLine: "underline",
  },
  button: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ead8ce",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: "#94a3b8",
  },
  googleButton: {
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ead8ce",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  switchModeRow: {
    marginTop: 18,
    alignItems: "center",
  },
  switchModeText: {
    fontSize: 13,
    color: "#64748b",
  },
  switchModeLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ff875d",
  },
});
