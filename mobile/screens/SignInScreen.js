import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";

// Required once, at module scope, per expo-web-browser's own docs -
// completes the in-progress auth session when the app is brought
// back to the foreground by the redirect, rather than leaving the
// browser sheet hanging open.
WebBrowser.maybeCompleteAuthSession();

// hintdrop:///auth-callback - matches the "scheme": "hintdrop" already
// set in app.json. This exact URL needs to be added to Supabase's
// allowed redirect URLs (Authentication > URL Configuration) or the
// OAuth provider will reject the request outright.
const redirectTo = Linking.createURL("auth-callback");

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setError(error.message);
    // On success, AuthContext's onAuthStateChange listener picks up
    // the new session automatically - no manual navigation needed
    // here, App.js swaps to the signed-in stack on its own.
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    try {
      // skipBrowserRedirect: true is what makes Supabase hand back a
      // plain URL to open ourselves (via WebBrowser below) instead of
      // trying to navigate a browser context that doesn't exist here.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success" && result.url) {
        // PKCE flow returns a ?code=... query param on the redirect
        // URL to exchange server-side for the actual session - not
        // tokens directly, unlike the older implicit flow.
        const { params } = Linking.parse(result.url);
        if (params.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            params.code
          );
          if (exchangeError) throw exchangeError;
          // AuthContext's listener picks up the new session from here,
          // same as the email/password path above.
        } else if (params.error_description) {
          throw new Error(String(params.error_description));
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
      <View style={styles.content}>
        <Image
          source={require("../assets/logo-transparent.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>
          Hint<Text style={styles.titleAccent}>Drop</Text>
        </Text>
        <Text style={styles.subtitle}>Sign in to see your hints, circle, and calendar.</Text>

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
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        {/* Microsoft/Apple sign-in intentionally not added here yet -
            same real, unresolved external blockers as the web app
            currently has (see GoogleAuthButtons.js's comments): a
            confirmed Supabase-side bug for Microsoft personal
            accounts, and Apple's invalid_client issue with Feedback
            Assistant report filed and pending. Not worth building the
            mobile deep-link version of either until those are
            actually resolved. */}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf7",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 4,
  },
  titleAccent: {
    color: "#ff875d",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
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
  error: {
    color: "#c9633f",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  button: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "#ff875d",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
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
});
