import { useAuthStore } from "@/store/auth";
import { Redirect, Tabs } from "expo-router";
import {
  Building2,
  LayoutDashboard,
  Settings,
  Ticket,
  Users,
} from "lucide-react-native";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { token } = useAuthStore();

  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 16 : 0);

  if (!token) {
    return <Redirect href="/" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#4F46E5",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: "#fff",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            overflow: "hidden",
            borderTopWidth: 0,
            elevation: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            height: 70 + bottomInset,
            paddingBottom: 8 + bottomInset,
            paddingTop: 6,
          },
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => (
              <LayoutDashboard size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="vendors"
          options={{
            title: "Vendors",
            tabBarIcon: ({ color }) => <Building2 size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="draws"
          options={{
            title: "Draws",
            tabBarIcon: ({ color }) => <Ticket size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="admins"
          options={{
            title: "Admins",
            tabBarIcon: ({ color }) => <Users size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
