import { useAuthStore } from "@/store/auth";
import api from "@/utils/axios";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  RefreshCw,
  Ticket,
} from "lucide-react-native";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

type StatsData = {
  vendorCount: number;
  drawCount: number;
  adminCount: number;
  vendors: { id: number; name: string }[];
};

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const {
    data: vendors = [],
    isLoading: vendorsLoading,
    refetch: refetchVendors,
  } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/administrator/vendors/").then((r) => r.data),
  });

  const {
    data: draws = [],
    isLoading: drawsLoading,
    refetch: refetchDraws,
  } = useQuery<any[]>({
    queryKey: ["draws"],
    queryFn: () => api.get("/draw/").then((r) => r.data),
  });

  const isLoading = vendorsLoading || drawsLoading;

  const onRefresh = () => {
    refetchVendors();
    refetchDraws();
  };

  const stats = [
    {
      label: "Total Vendors",
      value: vendors.length,
      icon: Building2,
      color: "#4F46E5",
      bg: "#EEF2FF",
      route: "/(tabs)/vendors" as const,
    },
    {
      label: "Total Draws",
      value: draws.length,
      icon: Ticket,
      color: "#059669",
      bg: "#ECFDF5",
      route: "/(tabs)/draws" as const,
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />

      {/* Header */}
      <View className="bg-indigo-900 pt-14 pb-8 px-6 rounded-b-3xl">
        <Text className="text-indigo-300 text-sm font-medium">
          Welcome back,
        </Text>
        <Text className="text-white text-2xl font-bold mt-1">
          {user?.username || "Super Admin"}
        </Text>
        <Text className="text-indigo-400 text-xs mt-1">
          Multi-Vendor Control Panel
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 -mt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            colors={["#4F46E5"]}
            tintColor="#4F46E5"
          />
        }
      >
        {/* Stats Cards */}
        <View className="flex-row flex-wrap justify-between mt-2">
          {stats.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              onPress={() => router.push(stat.route)}
              className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100"
              style={{ width: "48%" }}
              activeOpacity={0.7}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mb-3"
                style={{ backgroundColor: stat.bg }}
              >
                <stat.icon size={20} color={stat.color} />
              </View>
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={stat.color}
                  style={{ alignSelf: "flex-start", marginBottom: 4 }}
                />
              ) : (
                <Text
                  className="text-3xl font-bold mb-1"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </Text>
              )}
              <Text className="text-gray-500 text-xs font-medium">
                {stat.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Refresh Card */}
          <TouchableOpacity
            onPress={onRefresh}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 items-center justify-center"
            style={{ width: "48%" }}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3 bg-gray-100">
              <RefreshCw size={20} color="#6B7280" />
            </View>
            <Text className="text-gray-500 text-xs font-medium">
              Refresh All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Vendors */}
        <View className="mt-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">
              Recent Vendors
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/vendors")}>
              <Text className="text-indigo-600 text-sm font-semibold">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {vendorsLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : vendors.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Building2 size={32} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2 text-sm">
                No vendors yet
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {vendors.slice(0, 5).map((vendor, index) => (
                <TouchableOpacity
                  key={vendor.id}
                  onPress={() =>
                    router.push({
                      pathname: "/vendor/[id]",
                      params: { id: String(vendor.id), name: vendor.name },
                    })
                  }
                  className={`flex-row items-center justify-between px-5 py-4 ${
                    index < Math.min(vendors.length, 5) - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                  activeOpacity={0.6}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-9 h-9 rounded-lg bg-indigo-50 items-center justify-center mr-3">
                      <Building2 size={16} color="#4F46E5" />
                    </View>
                    <Text className="text-gray-800 font-semibold text-base">
                      {vendor.name}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recent Draws */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">
              Active Draws
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/draws")}>
              <Text className="text-indigo-600 text-sm font-semibold">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {drawsLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="small" color="#059669" />
            </View>
          ) : draws.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Ticket size={32} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2 text-sm">No draws yet</Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {draws.slice(0, 5).map((draw: any, index: number) => (
                <View
                  key={draw.id}
                  className={`flex-row items-center px-5 py-4 ${
                    index < Math.min(draws.length, 5) - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View
                    className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                    style={{
                      backgroundColor: draw.color_theme
                        ? `${draw.color_theme}20`
                        : "#ECFDF5",
                    }}
                  >
                    <Ticket
                      size={16}
                      color={draw.color_theme || "#059669"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-800 font-semibold text-sm">
                      {draw.name}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      Draw: {draw.draw_time} | Cut-off: {draw.cut_off_time}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
