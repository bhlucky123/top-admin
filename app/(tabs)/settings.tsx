import { queryClient } from "@/providers/react-query-provider";
import { useAuthStore } from "@/store/auth";
import { getLogFilePaths } from "@/utils/file-logger";
import {
  ChevronRight,
  FileText,
  Info,
  LogOut,
  Shield,
  User,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function SettingItem({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  onPress,
  danger,
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center px-5 py-4 ${
        danger ? "" : "border-b border-gray-100"
      }`}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text
          className={`font-semibold text-base ${
            danger ? "text-red-600" : "text-gray-800"
          }`}
        >
          {label}
        </Text>
        {value && (
          <Text className="text-gray-400 text-xs mt-0.5">{value}</Text>
        )}
      </View>
      {onPress && !danger && <ChevronRight size={18} color="#D1D5DB" />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          queryClient.clear();
          logout();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />

      {/* Header */}
      <View className="bg-indigo-900 pt-14 pb-8 px-6 rounded-b-3xl">
        <Text className="text-white text-2xl font-bold">Settings</Text>
      </View>

      <ScrollView
        className="flex-1 px-5 -mt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-5">
          <View className="px-5 py-5 flex-row items-center">
            <View className="w-14 h-14 rounded-2xl bg-indigo-100 items-center justify-center mr-4">
              <Shield size={28} color="#4F46E5" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">
                {user?.username || "Super Admin"}
              </Text>
              <Text className="text-indigo-500 text-sm font-medium mt-0.5">
                Super Administrator
              </Text>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider ml-2 mb-2">
          Account
        </Text>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-5">
          <SettingItem
            icon={User}
            iconColor="#4F46E5"
            iconBg="#EEF2FF"
            label="Username"
            value={user?.username}
          />
          <SettingItem
            icon={Shield}
            iconColor="#059669"
            iconBg="#ECFDF5"
            label="Role"
            value="Super Admin (Full Access)"
          />
        </View>

        {/* App Info */}
        <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider ml-2 mb-2">
          App Info
        </Text>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-5">
          <SettingItem
            icon={Info}
            iconColor="#6B7280"
            iconBg="#F3F4F6"
            label="Version"
            value="1.0.0"
          />
        </View>

        {/* Support */}
        <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider ml-2 mb-2">
          Support
        </Text>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-5">
          <SettingItem
            icon={FileText}
            iconColor="#6366F1"
            iconBg="#EEF2FF"
            label="Send Logs"
            value="Share app logs for debugging"
            onPress={async () => {
              try {
                const paths = await getLogFilePaths();
                if (paths.length === 0) {
                  Alert.alert("No Logs", "No log files found.");
                  return;
                }
                let combined = "";
                for (const p of paths) {
                  const name = p.split("/").pop() || p;
                  const content = await FileSystem.readAsStringAsync(p);
                  combined += `=== ${name} ===\n${content}\n\n`;
                }
                const tmpPath = `${FileSystem.cacheDirectory}app-logs.txt`;
                await FileSystem.writeAsStringAsync(tmpPath, combined);
                await Sharing.shareAsync(tmpPath, {
                  mimeType: "text/plain",
                  dialogTitle: "Send App Logs",
                });
              } catch {
                Alert.alert("Error", "Failed to share logs.");
              }
            }}
          />
        </View>

        {/* Logout */}
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <SettingItem
            icon={LogOut}
            iconColor="#DC2626"
            iconBg="#FEF2F2"
            label="Sign Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </ScrollView>
    </View>
  );
}
