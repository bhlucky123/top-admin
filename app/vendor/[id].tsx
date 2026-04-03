import useVendorDraw, { VendorDraw } from "@/hooks/use-vendor-draw";
import { Admin } from "@/hooks/use-staff";
import api from "@/utils/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Building2,
  Check,
  ChevronRight,
  Settings,
  Ticket,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function VendorDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const vendorId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDrawPicker, setShowDrawPicker] = useState(false);

  // Fetch vendor's assigned draws
  const {
    data: vendorDraws = [],
    isLoading: vdLoading,
    refetch: refetchVD,
    isFetching: vdFetching,
  } = useQuery<VendorDraw[]>({
    queryKey: ["vendor-draws", vendorId],
    queryFn: () =>
      api
        .get(`/administrator/vendor-draws/?vendor=${vendorId}`)
        .then((r) => r.data),
  });

  // Fetch all draws (for assignment picker)
  const { data: allDraws = [] } = useQuery<any[]>({
    queryKey: ["draws"],
    queryFn: () => api.get("/draw/").then((r) => r.data),
  });

  // Fetch vendor's admins
  const {
    data: admins = [],
    isLoading: adminsLoading,
    refetch: refetchAdmins,
  } = useQuery<Admin[]>({
    queryKey: ["vendor-admins", vendorId],
    queryFn: () =>
      api.get("/administrator/administrator/").then((r) =>
        r.data.filter((a: Admin) => a.vendor === vendorId)
      ),
  });

  // Fetch vendor's prize config
  const {
    data: prizeConfig,
    isLoading: configLoading,
  } = useQuery<any>({
    queryKey: ["vendor-config", vendorId],
    queryFn: () =>
      api.get(`/administrator/prize-configuration/${vendorId}/`).then((r) => r.data),
    retry: false,
  });

  const { assignDraw, unassignDraw, isAssigning } = useVendorDraw();

  // Available draws (not yet assigned)
  const assignedDrawIds = vendorDraws.map((vd) => vd.draw);
  const availableDraws = allDraws.filter((d) => !assignedDrawIds.includes(d.id));

  const handleAssign = (drawId: number) => {
    assignDraw(
      { vendor: vendorId, draw: drawId },
      {
        onSuccess: () => {
          refetchVD();
          setShowDrawPicker(false);
        },
        onError: (err: any) => {
          const msg = typeof err?.message === "string" ? err.message : "Failed to assign draw.";
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const handleUnassign = (vd: VendorDraw) => {
    Alert.alert(
      "Remove Draw",
      `Remove "${vd.draw_name}" from this vendor?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            unassignDraw({ id: vd.id }, { onSuccess: () => refetchVD() }),
        },
      ]
    );
  };

  const onRefresh = () => {
    refetchVD();
    refetchAdmins();
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vdFetching}
            onRefresh={onRefresh}
            colors={["#4F46E5"]}
            tintColor="#4F46E5"
          />
        }
      >
        {/* Vendor Header Card */}
        <View className="mx-5 mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <View className="h-2 bg-indigo-500" />
          <View className="p-5 flex-row items-center">
            <View className="w-14 h-14 rounded-2xl bg-indigo-50 items-center justify-center mr-4">
              <Building2 size={28} color="#4F46E5" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                {name || `Vendor #${id}`}
              </Text>
              <Text className="text-gray-400 text-sm mt-0.5">
                Vendor ID: {id}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row mx-5 mt-4 gap-3">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/vendor-config/[id]",
                params: { id: String(vendorId) },
              })
            }
            className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center shadow-sm"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center mb-2">
              <Settings size={18} color="#059669" />
            </View>
            <Text className="text-gray-800 font-semibold text-sm">
              Prize Config
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDrawPicker(true)}
            className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center shadow-sm"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mb-2">
              <Ticket size={18} color="#2563EB" />
            </View>
            <Text className="text-gray-800 font-semibold text-sm">
              Assign Draw
            </Text>
          </TouchableOpacity>
        </View>

        {/* Assigned Draws Section */}
        <View className="mx-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">
              Assigned Draws
            </Text>
            <View className="bg-indigo-50 px-2.5 py-1 rounded-md">
              <Text className="text-indigo-600 text-xs font-bold">
                {vendorDraws.length}
              </Text>
            </View>
          </View>

          {vdLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : vendorDraws.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Ticket size={32} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2 text-sm">
                No draws assigned
              </Text>
              <TouchableOpacity
                onPress={() => setShowDrawPicker(true)}
                className="mt-3 bg-indigo-600 px-5 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold text-sm">
                  Assign a Draw
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {vendorDraws.map((vd, index) => (
                <View
                  key={vd.id}
                  className={`flex-row items-center justify-between px-5 py-4 ${
                    index < vendorDraws.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-9 h-9 rounded-lg bg-blue-50 items-center justify-center mr-3">
                      <Ticket size={16} color="#2563EB" />
                    </View>
                    <Text className="text-gray-800 font-semibold text-sm">
                      {vd.draw_name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleUnassign(vd)}
                    className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Administrators Section */}
        <View className="mx-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">
              Administrators
            </Text>
            <View className="bg-amber-50 px-2.5 py-1 rounded-md">
              <Text className="text-amber-600 text-xs font-bold">
                {admins.length}
              </Text>
            </View>
          </View>

          {adminsLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="small" color="#D97706" />
            </View>
          ) : admins.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Users size={32} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2 text-sm">
                No administrators
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {admins.map((admin, index) => (
                <View
                  key={admin.id}
                  className={`flex-row items-center px-5 py-4 ${
                    index < admins.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="w-9 h-9 rounded-lg bg-amber-50 items-center justify-center mr-3">
                    <Users size={16} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-800 font-semibold text-sm">
                      {admin.username}
                    </Text>
                    <View className="flex-row gap-2 mt-1">
                      {admin.is_main_vendor && (
                        <Text className="text-indigo-500 text-xs font-medium">
                          Main Admin
                        </Text>
                      )}
                      <Text
                        className={`text-xs font-medium ${
                          admin.is_active
                            ? "text-green-500"
                            : "text-gray-400"
                        }`}
                      >
                        {admin.is_active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Prize Config Summary */}
        {prizeConfig && (
          <View className="mx-5 mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-gray-800">
                Prize Config
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/vendor-config/[id]",
                    params: { id: String(vendorId) },
                  })
                }
              >
                <Text className="text-indigo-600 text-sm font-semibold">
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <View className="flex-row flex-wrap gap-3">
                {[
                  { label: "Commission", value: prizeConfig.default_dealer_commission },
                  { label: "Single Digit", value: prizeConfig.single_digit_prize },
                  { label: "Double Digit", value: prizeConfig.double_digit_prize },
                  { label: "Box Direct", value: prizeConfig.box_direct },
                ].map((item) => (
                  <View
                    key={item.label}
                    className="bg-gray-50 px-3 py-2 rounded-lg"
                    style={{ width: "47%" }}
                  >
                    <Text className="text-gray-400 text-xs">{item.label}</Text>
                    <Text className="text-gray-800 font-bold text-sm">
                      {item.value ?? "N/A"}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="flex-row items-center mt-3">
                <View
                  className={`w-2.5 h-2.5 rounded-full mr-2 ${
                    prizeConfig.is_active ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <Text className="text-gray-500 text-xs">
                  App Status:{" "}
                  {prizeConfig.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Draw Assignment Modal */}
      <Modal
        visible={showDrawPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDrawPicker(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <Text className="text-lg font-bold text-gray-900">
                Assign Draw
              </Text>
              <TouchableOpacity
                onPress={() => setShowDrawPicker(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {availableDraws.length === 0 ? (
              <View className="p-8 items-center">
                <Ticket size={40} color="#D1D5DB" />
                <Text className="text-gray-400 mt-3 text-sm text-center">
                  All draws have been assigned to this vendor
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableDraws}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleAssign(item.id)}
                    disabled={isAssigning}
                    className="flex-row items-center justify-between px-6 py-4 border-b border-gray-50"
                    activeOpacity={0.6}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                        style={{
                          backgroundColor: item.color_theme
                            ? `${item.color_theme}15`
                            : "#EEF2FF",
                        }}
                      >
                        <Ticket
                          size={16}
                          color={item.color_theme || "#4F46E5"}
                        />
                      </View>
                      <View>
                        <Text className="text-gray-800 font-semibold text-sm">
                          {item.name}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-0.5">
                          Draw: {item.draw_time}
                        </Text>
                      </View>
                    </View>
                    <View className="w-8 h-8 rounded-lg bg-indigo-50 items-center justify-center">
                      <Check size={16} color="#4F46E5" />
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
