import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import "react-native-reanimated";
import "../global.css";

import ReactQueryProvider from "@/providers/react-query-provider";
import { AlertNotificationRoot } from "react-native-alert-notification";
import { purgeOldLogs } from "@/utils/file-logger";

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => { purgeOldLogs(); }, []);

  if (!loaded) return null;

  return (
    <ReactQueryProvider>
      <AlertNotificationRoot>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#312E81" },
            headerTitleStyle: {
              color: "#fff",
              fontWeight: "bold",
              fontSize: 20,
            },
            headerTintColor: "#fff",
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="vendor/[id]"
            options={{ title: "Vendor Details" }}
          />
          <Stack.Screen
            name="vendor-config/[id]"
            options={{ title: "Prize Configuration" }}
          />
          <Stack.Screen
            name="draw/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="draw/[id]/sales-report"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="draw/[id]/daily-report"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="draw/[id]/winnings"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="draw/[id]/result"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="extra-counts"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="transfer-log"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="monitoring-history"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="booking-details"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="booking-deletions"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="draw/[id]/global-limit-count"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
        </Stack>
      </AlertNotificationRoot>
    </ReactQueryProvider>
  );
}
