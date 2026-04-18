import useVendorDraw, { VendorDraw } from "@/hooks/use-vendor-draw";
import useVendorFeature, { VendorFeature } from "@/hooks/use-vendor-feature";
import { Admin } from "@/hooks/use-staff";
import { Vendor } from "@/hooks/use-vendor";
import {
  MonitoringExtraCount,
  MonitoringType,
  SUB_TYPE_LABELS,
  TYPE_LABELS,
} from "@/hooks/use-monitoring-extra-count";
import api from "@/utils/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  AlertTriangle,
  Building2,
  Check,
  ChevronRight,
  Settings,
  Shield,
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
  const { id, name, is_active: isActiveParam } = useLocalSearchParams<{ id: string; name: string; is_active: string }>();
  const vendorId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDrawPicker, setShowDrawPicker] = useState(false);
  const [showFeaturePicker, setShowFeaturePicker] = useState(false);

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

  // Fetch vendor's assigned features
  const {
    data: vendorFeatures = [],
    isLoading: featuresLoading,
    refetch: refetchFeatures,
  } = useQuery<VendorFeature[]>({
    queryKey: ["vendor-features", vendorId],
    queryFn: () =>
      api
        .get(`/administrator/vendors/${vendorId}/features/`)
        .then((r) => r.data),
  });

  // Fetch all available features
  const { data: allFeatures = [] } = useQuery<VendorFeature[]>({
    queryKey: ["all-features"],
    queryFn: () =>
      api.get("/administrator/vendor-features/").then((r) => r.data),
  });

  // Fetch this vendor (for monitoring thresholds)
  const { data: vendorDetail } = useQuery<Vendor>({
    queryKey: ["vendor", vendorId],
    queryFn: () =>
      api.get(`/administrator/vendors/${vendorId}/`).then((r) => r.data),
  });

  // Extra-count filter state
  const [extraType, setExtraType] = useState<MonitoringType | null>(null);

  const {
    data: extraCounts = [],
    isLoading: extrasLoading,
    refetch: refetchExtras,
  } = useQuery<MonitoringExtraCount[]>({
    queryKey: ["vendor-extras", vendorId, extraType],
    queryFn: () => {
      const params: Record<string, any> = { vendor__id: vendorId };
      if (extraType) params.type = extraType;
      return api
        .get("/draw-monitoring/extra-count/", { params })
        .then((r) => r.data);
    },
    retry: false,
  });

  const { assignFeatures, isAssigningFeatures } = useVendorFeature();
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

  // Toggle a feature on/off for this vendor
  const assignedFeatureIds = vendorFeatures.map((f) => f.id);
  const handleToggleFeature = (featureId: number) => {
    const newIds = assignedFeatureIds.includes(featureId)
      ? assignedFeatureIds.filter((id) => id !== featureId)
      : [...assignedFeatureIds, featureId];
    assignFeatures(
      { vendorId, feature_ids: newIds },
      {
        onSuccess: () => {
          refetchFeatures();
          setShowFeaturePicker(false);
        },
        onError: (err: any) => {
          const msg =
            typeof err?.message === "string"
              ? err.message
              : "Failed to update features.";
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const onRefresh = () => {
    refetchVD();
    refetchAdmins();
    refetchFeatures();
    refetchExtras();
    queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
  };

  const TYPES: MonitoringType[] = [
    "single_digit",
    "double_digit",
    "triple_digit",
  ];

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
              <View className="flex-row items-center mt-1 gap-2">
                <Text className="text-gray-400 text-sm">
                  Vendor ID: {id}
                </Text>
                <View className={`px-2 py-0.5 rounded-full ${isActiveParam === "true" ? "bg-green-50" : "bg-red-50"}`}>
                  <Text className={`text-xs font-semibold ${isActiveParam === "true" ? "text-green-600" : "text-red-500"}`}>
                    {isActiveParam === "true" ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
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

        {/* Features Section */}
        <View className="mx-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">Features</Text>
            <View className="flex-row items-center gap-2">
              <View className="bg-purple-50 px-2.5 py-1 rounded-md">
                <Text className="text-purple-600 text-xs font-bold">
                  {vendorFeatures.length}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowFeaturePicker(true)}>
                <Text className="text-indigo-600 text-sm font-semibold">
                  Manage
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {featuresLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="small" color="#7C3AED" />
            </View>
          ) : vendorFeatures.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Shield size={32} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2 text-sm">
                No features assigned
              </Text>
              <TouchableOpacity
                onPress={() => setShowFeaturePicker(true)}
                className="mt-3 bg-indigo-600 px-5 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold text-sm">
                  Assign Features
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {vendorFeatures.map((feature, index) => (
                <View
                  key={feature.id}
                  className={`flex-row items-center px-5 py-4 ${
                    index < vendorFeatures.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="w-9 h-9 rounded-lg bg-purple-50 items-center justify-center mr-3">
                    <Shield size={16} color="#7C3AED" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-800 font-semibold text-sm">
                      {feature.name}
                    </Text>
                    {feature.description ? (
                      <Text className="text-gray-400 text-xs mt-0.5">
                        {feature.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Monitoring Thresholds */}
        <View className="mx-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">
              Monitoring Thresholds
            </Text>
          </View>
          <View className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <View className="flex-row flex-wrap gap-3">
              {[
                {
                  label: "Single Digit",
                  value: vendorDetail?.monitoring_single_digit_count,
                },
                {
                  label: "Double Digit",
                  value: vendorDetail?.monitoring_double_digit_count,
                },
                {
                  label: "Triple Super",
                  value: vendorDetail?.monitoring_triple_digit_super_count,
                },
                {
                  label: "Triple Box",
                  value: vendorDetail?.monitoring_triple_digit_box_count,
                },
              ].map((item) => (
                <View
                  key={item.label}
                  className="bg-gray-50 px-3 py-2 rounded-lg"
                  style={{ width: "47%" }}
                >
                  <Text className="text-gray-400 text-xs">{item.label}</Text>
                  <Text className="text-gray-800 font-bold text-sm">
                    {item.value ?? 0}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Extra Counts */}
        <View className="mx-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">
              Extra Counts
            </Text>
            <View className="bg-indigo-50 px-2.5 py-1 rounded-md">
              <Text className="text-indigo-600 text-xs font-bold">
                {extraCounts.length}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2 mb-3">
            <TouchableOpacity
              onPress={() => setExtraType(null)}
              className={`px-3 py-1.5 rounded-lg border ${
                !extraType
                  ? "bg-indigo-50 border-indigo-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  !extraType ? "text-indigo-700" : "text-gray-600"
                }`}
              >
                All
              </Text>
            </TouchableOpacity>
            {TYPES.map((t) => {
              const active = extraType === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setExtraType(t)}
                  className={`px-3 py-1.5 rounded-lg border ${
                    active
                      ? "bg-indigo-50 border-indigo-300"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? "text-indigo-700" : "text-gray-600"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {extrasLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="small" color="#4F46E5" />
            </View>
          ) : extraCounts.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Activity size={32} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2 text-sm">
                No extra-count records
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {extraCounts.map((ec, index) => (
                <View
                  key={ec.id}
                  className={`px-5 py-4 ${
                    index < extraCounts.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                        style={{ backgroundColor: "#FEE2E2" }}
                      >
                        <AlertTriangle size={16} color="#DC2626" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-semibold text-sm">
                          {ec.draw_name || `Draw #${ec.draw_session}`}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-0.5">
                          {ec.session_date}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row gap-1.5">
                      <View
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: "#EEF2FF" }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: "#4338CA" }}
                        >
                          {TYPE_LABELS[ec.type]}
                        </Text>
                      </View>
                      <View
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: "#FEE2E2" }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: "#B91C1C" }}
                        >
                          {SUB_TYPE_LABELS[ec.sub_type]}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                    <View className="flex-row items-center">
                      <Text className="text-gray-400 text-xs mr-2">Number</Text>
                      <Text className="text-gray-900 font-bold text-base tracking-wider">
                        {ec.number}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-gray-400 text-xs">Extra</Text>
                      <Text className="text-red-600 font-bold text-base">
                        ×{ec.count}
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
                  { label: "KL 1st Prize", value: prizeConfig.kl_first_prize },
                  { label: "KL 2nd Prize", value: prizeConfig.kl_second_prize },
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

      {/* Feature Assignment Modal */}
      <Modal
        visible={showFeaturePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeaturePicker(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <Text className="text-lg font-bold text-gray-900">
                Manage Features
              </Text>
              <TouchableOpacity
                onPress={() => setShowFeaturePicker(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {allFeatures.length === 0 ? (
              <View className="p-8 items-center">
                <Shield size={40} color="#D1D5DB" />
                <Text className="text-gray-400 mt-3 text-sm text-center">
                  No features available
                </Text>
              </View>
            ) : (
              <FlatList
                data={allFeatures}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => {
                  const isAssigned = assignedFeatureIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      onPress={() => handleToggleFeature(item.id)}
                      disabled={isAssigningFeatures}
                      className="flex-row items-center justify-between px-6 py-4 border-b border-gray-50"
                      activeOpacity={0.6}
                    >
                      <View className="flex-row items-center flex-1">
                        <View
                          className={`w-9 h-9 rounded-lg items-center justify-center mr-3 ${
                            isAssigned ? "bg-purple-100" : "bg-gray-100"
                          }`}
                        >
                          <Shield
                            size={16}
                            color={isAssigned ? "#7C3AED" : "#9CA3AF"}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-gray-800 font-semibold text-sm">
                            {item.name}
                          </Text>
                          {item.description ? (
                            <Text className="text-gray-400 text-xs mt-0.5">
                              {item.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View
                        className={`w-8 h-8 rounded-lg items-center justify-center ${
                          isAssigned ? "bg-purple-100" : "bg-gray-100"
                        }`}
                      >
                        {isAssigned ? (
                          <Check size={16} color="#7C3AED" />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

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
