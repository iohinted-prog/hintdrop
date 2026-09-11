import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator, Pressable, StyleSheet, Modal, Image, Alert } from "react-native";
import { useCallback, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import Icon from "./components/Icon";
import Text from "./components/Text";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import { resolveAvatarColor } from "./lib/avatarColor";
import { registerForPushNotifications } from "./lib/pushNotifications";
import NotificationsPanel from "./components/NotificationsPanel";
import AccountMenu from "./components/AccountMenu";
import SignInScreen from "./screens/SignInScreen";
import FeedScreen from "./screens/FeedScreen";
import HintsScreen from "./screens/HintsScreen";
import CircleScreen from "./screens/CircleScreen";
import AccountScreen from "./screens/AccountScreen";
import SettingsScreen from "./screens/SettingsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import MessagesScreen from "./screens/MessagesScreen";
import CalendarScreen from "./screens/CalendarScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import ShopScreen from "./screens/ShopScreen";
import BottomNav from "./components/BottomNav";

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
// AppShell.jsx) - opens the dropdown menu (Profile/Settings/Account),
// not straight to AccountScreen.
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

// Matches web's header bell exactly (app/components/AppShell.jsx) -
// same grey vector icon (Feather's "bell", web uses this same
// rounded-stroke outline shape), same badge. A global, always-
// reachable notification affordance rather than a dedicated screen/
// tab, since that's genuinely how it works on web (a dropdown off
// the header, not a page). See NotificationsPanel.js for exactly
// what's ported vs deferred within the panel itself.
function NotificationBell({ userId, count, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.bellButton}>
      <Icon name="bell" size={17} color="#475569" />
      {count > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// Matches web's header Messages button (app/components/AppShell.jsx)
// - same grey speech-bubble vector, same position beside the bell.
// Unlike web (a dropdown, capped at 8 conversations, opening floating
// chat windows), this navigates to a real full-screen conversation
// list - see MessagesScreen.js for why that's the better mobile
// pattern, not a corner cut.
function MessagesButton({ unreadCount, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.bellButton}>
      <Icon name="message-square" size={17} color="#475569" />
      {unreadCount > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SignedInApp() {
  const { user } = useAuth();
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profileViewUserId, setProfileViewUserId] = useState(null);
  const [profileViewBoardId, setProfileViewBoardId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("full_name, avatar_url, avatar_color").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user?.id, accountVisible, settingsVisible]); // re-fetch after closing Account/Settings, in case something changed

  useEffect(() => {
    if (user?.id) registerForPushNotifications(user.id);
  }, [user?.id]);

  // Handles both Universal Links/App Links (a hintdrop.app/... URL
  // tapped from anywhere, opened via the associatedDomains/
  // intentFilters config in app.json - see the .well-known route
  // handlers in the web repo for the other half of that setup) and
  // the app's own hintdrop:// custom scheme. Covers exactly the
  // paths the app itself generates via its own share flows: profile
  // shares, board shares, hint shares, and contact/circle invite
  // links - matching web's own redirect targets (e.g. /b/{boardId}
  // resolves the same way web's BoardRedirectClient.jsx does, to
  // /profile/{ownerId}?board={boardId}) rather than inventing a
  // different destination mobile-only.
  const handleIncomingUrl = useCallback(async (url) => {
    if (!url || !user?.id) return;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    const [first, second] = segments;

    if (first === "profile" && second) {
      setProfileViewBoardId(null);
      setProfileViewUserId(second);
      return;
    }
    if (first === "join" && second) {
      // Same destination as web's /join/{ownerId} - a prompt to add
      // this person to your circle - which is just that person's
      // profile plus the "Add to circle" action ProfileScreen.js
      // already has, not a separate screen.
      setProfileViewBoardId(null);
      setProfileViewUserId(second);
      return;
    }
    if (first === "b" && second) {
      const { data: board } = await supabase.from("hint_boards").select("user_id").eq("id", second).maybeSingle();
      if (board?.user_id) {
        setProfileViewBoardId(second);
        setProfileViewUserId(board.user_id);
      }
      return;
    }
    if (first === "h" && second) {
      const { data: hint } = await supabase.from("hints").select("user_id").eq("id", second).maybeSingle();
      if (hint?.user_id) {
        setProfileViewBoardId(null);
        setProfileViewUserId(hint.user_id);
      }
      return;
    }
    // /invite/contact and /invite/circle carry their own token-based
    // state (invite_token, etc.) rather than a plain path segment
    // that maps cleanly to an existing mobile screen the way the
    // others above do - not handled yet.
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    Linking.getInitialURL().then((url) => { if (url) handleIncomingUrl(url); });
    const subscription = Linking.addEventListener("url", ({ url }) => handleIncomingUrl(url));
    return () => subscription.remove();
  }, [user?.id, handleIncomingUrl]);

  // Matches web's badge logic exactly (AppShell.jsx's loadGroupMessages
  // + its "new-messages-global" realtime channel) - same real per-
  // conversation unread counting (not just "has any conversation with
  // unread"), same combination of an initial load, a realtime INSERT
  // subscription for instant updates, and periodic polling as a
  // fallback for anything the realtime channel misses.
  const loadUnreadMessageCount = useCallback(async () => {
    if (!user?.id) return;
    const { data: myMemberships } = await supabase.from("conversation_members").select("conversation_id, last_read_at").eq("user_id", user.id);
    const convIds = (myMemberships || []).map((m) => m.conversation_id);
    if (!convIds.length) {
      setUnreadMessageCount(0);
      return;
    }
    const { data: msgs } = await supabase.from("messages").select("conversation_id, sender_id, created_at").in("conversation_id", convIds);
    const lastReadMap = {};
    (myMemberships || []).forEach((m) => { lastReadMap[m.conversation_id] = m.last_read_at; });
    let total = 0;
    (msgs || []).forEach((m) => {
      if (m.sender_id === user.id) return;
      const lastRead = lastReadMap[m.conversation_id];
      if (!lastRead || new Date(m.created_at) > new Date(lastRead)) total += 1;
    });
    setUnreadMessageCount(total);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadUnreadMessageCount();
    const interval = setInterval(loadUnreadMessageCount, 10000);
    const channel = supabase
      .channel("new-messages-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, loadUnreadMessageCount)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_members" }, loadUnreadMessageCount)
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadUnreadMessageCount]);

  return (
    <>
      <Tab.Navigator
        initialRouteName="Feed"
        tabBar={(props) => <BottomNav {...props} />}
        screenOptions={{
          headerShown: true,
          // Title text hidden everywhere - Circle and Hints already
          // build their own in-screen header (title, actions, etc.),
          // so a default react-navigation title bar on top would be
          // a redundant, visually broken double-header. This bar's
          // only job is the logo + global bell/messages/account row,
          // matching web's actual header content (its desktop nav
          // links are hidden on mobile web too - this app's own
          // BottomNav is the real equivalent of web's mobile bottom
          // nav, a completely separate element from the header).
          headerTitle: () => null,
          headerLeft: () => <HeaderLogo />,
          headerRight: () => (
            <View style={styles.headerRightRow}>
              <MessagesButton unreadCount={unreadMessageCount} onPress={() => setMessagesVisible(true)} />
              <NotificationBell userId={user?.id} count={notifCount} onPress={() => setNotifVisible(true)} />
              <AccountButton profile={profile} userId={user?.id} onPress={() => setAccountMenuVisible(true)} />
            </View>
          ),
          headerStyle: { backgroundColor: "#fffaf7", elevation: 0, shadowOpacity: 0, height: 108 },
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
        onViewProfile={setProfileViewUserId}
      />
      <AccountMenu
        visible={accountMenuVisible}
        onClose={() => setAccountMenuVisible(false)}
        fullName={profile?.full_name}
        email={user?.email}
        onSelectProfile={() => setProfileViewUserId(user?.id)}
        onSelectSettings={() => setSettingsVisible(true)}
        onSelectAccount={() => setAccountVisible(true)}
      />
      <Modal visible={accountVisible} animationType="slide" onRequestClose={() => setAccountVisible(false)}>
        {/* React Native's Modal renders in a separate native root view
            (a distinct UIViewController on iOS), which is NOT a real
            descendant of the outer SafeAreaProvider's measured tree -
            a well-documented react-native-safe-area-context gotcha,
            confirmed here as the actual root cause of the "can't get
            back" bug: SafeAreaView/useSafeAreaInsets() inside a Modal
            can silently return zero insets even with a provider
            higher up, pushing this screen's back button up under the
            notch/status bar exactly as reported. Re-providing here,
            scoped to the modal's own content, is the standard fix. */}
        <SafeAreaProvider>
          <AccountScreen onClose={() => setAccountVisible(false)} />
        </SafeAreaProvider>
      </Modal>
      <Modal visible={settingsVisible} animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <SafeAreaProvider>
          <SettingsScreen onClose={() => setSettingsVisible(false)} />
        </SafeAreaProvider>
      </Modal>
      <Modal visible={Boolean(profileViewUserId)} animationType="slide" onRequestClose={() => setProfileViewUserId(null)}>
        <SafeAreaProvider>
          <ProfileScreen
            userId={profileViewUserId}
            onBack={() => { setProfileViewUserId(null); setProfileViewBoardId(null); }}
            insideModal
            initialBoardId={profileViewBoardId}
          />
        </SafeAreaProvider>
      </Modal>
      <Modal visible={messagesVisible} animationType="slide" onRequestClose={() => setMessagesVisible(false)}>
        <SafeAreaProvider>
          <MessagesScreen
            onBack={() => { setMessagesVisible(false); loadUnreadMessageCount(); }}
            onViewProfile={(uid) => { setMessagesVisible(false); setProfileViewUserId(uid); }}
          />
        </SafeAreaProvider>
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
  //
  // (Icon glyph fonts - previously @expo/vector-icons' Feather font,
  // explicitly preloaded here too - are gone entirely now. See
  // components/Icon.js for why: font-glyph icon rendering stayed
  // broken across several rounds despite ruling out every code-level
  // cause, so icons were rebuilt as actual SVG paths via
  // react-native-svg instead, which needs no font loading step at
  // all - nothing left here to preload.)
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
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
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
