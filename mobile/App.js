import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import Text from "./components/Text";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import SignInScreen from "./screens/SignInScreen";
import FeedScreen from "./screens/FeedScreen";
import HintsScreen from "./screens/HintsScreen";
import { CircleScreen, CalendarScreen, ShopScreen } from "./screens/PlaceholderScreens";

const Tab = createBottomTabNavigator();

// Temporary, visible sign-out affordance for testing before a real
// Profile/Settings screen exists - not meant to be the permanent
// home for this, just needed somewhere reachable right now.
function SignOutButton() {
  return (
    <Pressable onPress={() => supabase.auth.signOut()} style={styles.signOutButton}>
      <Text style={styles.signOutText}>Sign out</Text>
    </Pressable>
  );
}

function SignedInApp() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#ff875d",
        tabBarInactiveTintColor: "#94a3b8",
        headerRight: () => <SignOutButton />,
        headerStyle: { backgroundColor: "#fffaf7" },
        tabBarStyle: { backgroundColor: "#fffaf7" },
      }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ headerShown: true }} />
      <Tab.Screen name="Circle" component={CircleScreen} />
      <Tab.Screen name="Hints" component={HintsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ff875d" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <SignedInApp /> : <SignInScreen />}
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
  signOutButton: {
    marginRight: 16,
  },
  signOutText: {
    color: "#ff875d",
    fontSize: 14,
    fontWeight: "600",
  },
});
