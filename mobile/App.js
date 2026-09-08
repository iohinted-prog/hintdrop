import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator, Pressable, Text, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import SignInScreen from "./screens/SignInScreen";
import FeedScreen from "./screens/FeedScreen";
import { CircleScreen, HintsScreen, CalendarScreen, ShopScreen } from "./screens/PlaceholderScreens";

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
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
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
