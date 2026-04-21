import VendorForm, { VendorFormData } from "@/components/vendor-form";
import useVendor, { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Activity,
  Building2,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// --- Vendor Card (list item, no inline edit) ---
function VendorCard({
  item,
  onPress,
}: {
  item: Vendor;
  onPress: () => void;
}) {
  const active = item.is_active;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <View className={`h-1 ${active ? "bg-indigo-500" : "bg-gray-300"}`} />

      <View className="p-4">
        <View className="flex-row items-center">
          <View
            className={`w-12 h-12 rounded-xl items-center justify-center ${
              active ? "bg-indigo-50" : "bg-gray-100"
            }`}
          >
            <Building2 size={22} color={active ? "#4F46E5" : "#9CA3AF"} />
          </View>

          <View className="flex-1 ml-3 mr-2">
            <Text
              className={`text-base font-bold ${
                active ? "text-gray-900" : "text-gray-500"
              }`}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5">ID: {item.id}</Text>
          </View>

          <ChevronRight size={18} color="#9CA3AF" />
        </View>

        <View className="flex-row items-center flex-wrap gap-2 mt-3">
          <View
            className={`flex-row items-center px-2.5 py-1 rounded-full ${
              active ? "bg-green-50" : "bg-red-50"
            }`}
          >
            <View
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                active ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <Text
              className={`text-[11px] font-semibold ${
                active ? "text-green-700" : "text-red-600"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </Text>
          </View>
          <View
            className={`flex-row items-center px-2.5 py-1 rounded-full ${
              item.monitoring_enabled ? "bg-indigo-50" : "bg-gray-100"
            }`}
          >
            <Activity
              size={11}
              color={item.monitoring_enabled ? "#4F46E5" : "#9CA3AF"}
            />
            <Text
              className={`text-[11px] font-semibold ml-1 ${
                item.monitoring_enabled ? "text-indigo-700" : "text-gray-500"
              }`}
            >
              Monitoring {item.monitoring_enabled ? "On" : "Off"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// --- Main Screen ---
export default function VendorsScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data: vendors = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/administrator/vendors/").then((r) => r.data),
    retry: false,
  });

  const { createVendor } = useVendor();

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (data: VendorFormData) => {
    setSubmitting(true);
    createVendor(data, {
      onSuccess: (newVendor) => {
        queryClient.setQueryData<Vendor[]>(["vendors"], (old) => [
          newVendor,
          ...(old || []),
        ]);
        setShowForm(false);
        setSubmitting(false);
      },
      onError: (err: any) => {
        setSubmitting(false);
        const msg =
          err?.message?.name?.[0] ||
          err?.message?.detail ||
          (typeof err?.message === "string"
            ? err.message
            : "Failed to create vendor.");
        Alert.alert("Error", msg);
      },
    });
  };

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center px-8 bg-white">
        <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
          <Text className="text-3xl mb-3">!</Text>
          <Text className="text-red-600 text-xl font-bold mb-2 text-center">
            Failed to load vendors
          </Text>
          <Text className="text-gray-600 mb-6 text-center text-sm">
            {typeof (error as any)?.message === "string"
              ? (error as any).message
              : "Please check your connection and try again."}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-indigo-600 px-8 py-3 rounded-xl"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showForm) {
    return (
      <VendorForm
        onSubmit={handleCreate}
        onCancel={() => setShowForm(false)}
        submitting={submitting}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">Vendors</Text>
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            className="w-11 h-11 bg-indigo-600 rounded-full items-center justify-center shadow-md"
            activeOpacity={0.85}
          >
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2.5">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search vendors..."
            className="flex-1 ml-2 text-gray-800 text-base"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-4 text-gray-500">Loading vendors...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
          renderItem={({ item }) => (
            <VendorCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/vendor/[id]",
                  params: {
                    id: String(item.id),
                    name: item.name,
                    is_active: String(item.is_active),
                  },
                })
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center mt-20">
              <Building2 size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                {searchQuery ? "No vendors match your search" : "No vendors yet"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  onPress={() => setShowForm(true)}
                  className="mt-4 bg-indigo-600 px-6 py-2.5 rounded-xl"
                >
                  <Text className="text-white font-semibold">
                    Create First Vendor
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}
