import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator, Pressable, StyleSheet, Modal, Image } from "react-native";
import { useEffect, useState } from "react";
import Text from "./components/Text";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import { resolveAvatarColor } from "./lib/avatarColor";
import NotificationsPanel from "./components/NotificationsPanel";
import SignInScreen from "./screens/SignInScreen";
import FeedScreen from "./screens/FeedScreen";
import HintsScreen from "./screens/HintsScreen";
import CircleScreen from "./screens/CircleScreen";
import AccountScreen from "./screens/AccountScreen";
import CalendarScreen from "./screens/CalendarScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import BottomNav from "./components/BottomNav";
import { ShopScreen } from "./screens/PlaceholderScreens";

const Tab = createBottomTabNavigator();

// Matches web's header logo (app/components/AppShell.jsx's LogoMark)
// - on mobile web this is icon-only, no "HintDrop" wordmark (that's
// desktop-only there too), so this matches that exactly rather than
// adding a wordmark web itself doesn't show at this size.
function HeaderLogo() {
  return (
    <Image
      source={{ uri: "https://hintdrop.app/illustrations/giftbox-icon-v2.png" }}
      style={{ width: 28, height: 33, marginLeft: 16 }}
      resizeMode="contain"
    />
  );
}

// Matches web's header account avatar button (app/components/
// AppShell.jsx) - opens the account page directly rather than a
// dropdown menu (web's dropdown has Profile/Account/Sign out links;
// mobile's AccountScreen already contains sign-out itself, so one
// tap goes straight there instead of a two-step menu).
function AccountButton({ profile, userId, onPress }) {
  const c = resolveAvatarColor({ avatarColor: profile?.avatar_color, id: userId });
  return (
    <Pressable onPress={onPress} style={styles.accountButton}>
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.accountAvatarImage} />
      ) : (
        <View style={[styles.accountAvatarImage, { alignItems: "center", justifyContent: "center", backgroundColor: c.to }]}>
          <Text style={styles.accountInitialsText}>
            {(profile?.full_name || "U").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// Matches web's header bell (app/components/AppShell.jsx) - a global,
// always-reachable notification affordance rather than a dedicated
// screen/tab, since that's genuinely how it works on web (a dropdown
// off the header, not a page). See NotificationsPanel.js for exactly
// what's ported vs deferred within the panel itself.
function NotificationBell({ userId, count, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.bellButton}>
      <Text style={styles.bellIcon}>🔔</Text>
      {count > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SignedInApp() {
  const { user } = useAuth();
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [accountVisible, setAccountVisible] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("full_name, avatar_url, avatar_color").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user?.id, accountVisible]); // re-fetch after closing Account, in case something changed

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <BottomNav {...props} />}
        screenOptions={{
          headerShown: true,
          // Title text hidden everywhere - Circle and Hints already
          // build their own in-screen header (title, actions, etc.),
          // so a default react-navigation title bar on top would be
          // a redundant, visually broken double-header. This bar's
          // only job is the logo + global bell + account row, matching
          // web's actual header content (its desktop nav links are
          // hidden on mobile web too - this app's own BottomNav is
          // the real equivalent of web's mobile bottom nav, a
          // completely separate element from the header).
          headerTitle: () => null,
          headerLeft: () => <HeaderLogo />,
          headerRight: () => (
            <View style={styles.headerRightRow}>
              <NotificationBell userId={user?.id} count={notifCount} onPress={() => setNotifVisible(true)} />
              <AccountButton profile={profile} userId={user?.id} onPress={() => setAccountVisible(true)} />
            </View>
          ),
          headerStyle: { backgroundColor: "#fffaf7", elevation: 0, shadowOpacity: 0 },
        }}
      >
        <Tab.Screen name="Feed" component={FeedScreen} />
        <Tab.Screen name="Circle" component={CircleScreen} />
        <Tab.Screen name="Hints" component={HintsScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Shop" component={ShopScreen} />
      </Tab.Navigator>
      <NotificationsPanel
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        currentUserId={user?.id}
        onCountChange={setNotifCount}
      />
      <Modal visible={accountVisible} animationType="slide" onRequestClose={() => setAccountVisible(false)}>
        <AccountScreen onClose={() => setAccountVisible(false)} />
      </Modal>
    </>
  );
}

function RootNavigator() {
  const { session, user, loading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Matches web's gate exactly (app/feed/page.js server-redirects to
  // /onboarding whenever profiles.onboarding_completed isn't true) -
  // without this check, a new mobile signup would drop straight into
  // the main app with no profile/interests/birthday ever collected.
  useEffect(() => {
    if (!session || !user?.id) {
      setOnboardingChecked(false);
      return;
    }
    let active = true;
    supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!active) return;
      setNeedsOnboarding(data?.onboarding_completed !== true);
      setOnboardingChecked(true);
    });
    return () => { active = false; };
  }, [session, user?.id]);

  if (loading || (session && !onboardingChecked)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ff875d" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? (
        <SignInScreen />
      ) : needsOnboarding ? (
        <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
      ) : (
        <SignedInApp />
      )}
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

export default function App() {
  // Web's sitewide font is Inter (400/600/700) - the whole app was
  // rendering in the OS default system font (San Francisco on iOS,
  // Roboto on Android) until now, a significant part of why nothing
  // felt like the website regardless of colors/layout being close.
  // Gated on fontsLoaded so no screen ever flashes the wrong font
  // before swapping.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ff875d" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffaf7",
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 8,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ead8ce",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    fontSize: 15,
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: "#f36f64",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  accountButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ead8ce",
  },
  accountAvatarImage: {
    width: "100%",
    height: "100%",
  },
  accountInitialsText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
