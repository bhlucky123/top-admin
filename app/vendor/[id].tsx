import AdminForm, { AdminFormPayload } from "@/components/admin-form";
import VendorForm, { VendorFormData } from "@/components/vendor-form";
import useStaff, { Admin } from "@/hooks/use-staff";
import useVendorDraw, { VendorDraw } from "@/hooks/use-vendor-draw";
import useVendorFeature, { VendorFeature } from "@/hooks/use-vendor-feature";
import useVendor, { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Building2,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  Settings,
  Shield,
  Star,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VendorDetailScreen() {
  const { id, name, is_active: isActiveParam } = useLocalSearchParams<{ id: string; name: string; is_active: string }>();
  const vendorId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showDrawPicker, setShowDrawPicker] = useState(false);
  const [showFeaturePicker, setShowFeaturePicker] = useState(false);
  const [showVendorEdit, setShowVendorEdit] = useState(false);
  const [adminEditorData, setAdminEditorData] = useState<Admin | null>(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

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

  const { assignFeatures, isAssigningFeatures } = useVendorFeature();
  const { assignDraw, unassignDraw, isAssigning } = useVendorDraw();
  const { toggleActive, isToggling, editVendor } = useVendor();
  const {
    createAdmin,
    editAdmin,
    deleteAdmin,
    setMainVendor,
    isSettingMainVendor,
  } = useStaff();

  const vendorNameForHeader =
    vendorDetail?.name || name || `Vendor #${id}`;

  const handleEditVendor = (data: VendorFormData) => {
    setVendorSubmitting(true);
    editVendor(
      { id: vendorId, ...data },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(["vendor", vendorId], updated);
          queryClient.setQueryData<Vendor[]>(["vendors"], (old) =>
            old?.map((v) => (v.id === updated.id ? updated : v)) || []
          );
          setShowVendorEdit(false);
          setVendorSubmitting(false);
        },
        onError: (err: any) => {
          setVendorSubmitting(false);
          const msg =
            err?.message?.name?.[0] ||
            (typeof err?.message === "string"
              ? err.message
              : "Failed to update vendor.");
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const handleCreateAdmin = (data: AdminFormPayload) => {
    setAdminSubmitting(true);
    createAdmin(data as any, {
      onSuccess: () => {
        refetchAdmins();
        setShowAdminForm(false);
        setAdminEditorData(null);
        setAdminSubmitting(false);
      },
      onError: (err: any) => {
        setAdminSubmitting(false);
        const msg =
          err?.message?.username?.[0] ||
          err?.message?.detail ||
          (typeof err?.message === "string"
            ? err.message
            : "Failed to create admin.");
        Alert.alert("Error", msg);
      },
    });
  };

  const handleEditAdmin = (data: AdminFormPayload) => {
    if (!adminEditorData) return;
    setAdminSubmitting(true);
    editAdmin(
      { id: adminEditorData.id, ...data },
      {
        onSuccess: () => {
          refetchAdmins();
          setShowAdminForm(false);
          setAdminEditorData(null);
          setAdminSubmitting(false);
        },
        onError: (err: any) => {
          setAdminSubmitting(false);
          const msg =
            err?.message?.username?.[0] ||
            err?.message?.detail ||
            (typeof err?.message === "string"
              ? err.message
              : "Failed to update admin.");
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const handleDeleteAdmin = (admin: Admin) => {
    Alert.alert(
      "Delete Admin",
      `Delete "${admin.username}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteAdmin(
              { id: admin.id },
              {
                onSuccess: () => refetchAdmins(),
                onError: (err: any) => {
                  const msg =
                    typeof err?.message === "string"
                      ? err.message
                      : "Failed to delete admin.";
                  Alert.alert("Error", msg);
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleSetMainAdmin = (admin: Admin) => {
    // Tapping the star promotes this admin and demotes the previous one.
    // If the admin is already main, do nothing.
    if (admin.is_main_vendor) return;
    setMainVendor(
      { id: admin.id, is_main_vendor: true },
      {
        onSuccess: () => refetchAdmins(),
        onError: (err: any) => {
          const msg =
            typeof err?.message === "string"
              ? err.message
              : "Failed to set main admin.";
          Alert.alert("Error", msg);
        },
      }
    );
  };

  // Prefer the freshly-fetched vendor for is_active so the button reflects
  // the current server state after toggling. Falls back to the param.
  const isActive =
    typeof vendorDetail?.is_active === "boolean"
      ? vendorDetail.is_active
      : isActiveParam === "true";

  const handleToggleActive = () => {
    const action = isActive ? "Deactivate" : "Activate";
    Alert.alert(
      `${action} Vendor`,
      `Are you sure you want to ${action.toLowerCase()} "${
        name || `Vendor #${id}`
      }"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          style: isActive ? "destructive" : "default",
          onPress: () => {
            toggleActive(
              { id: vendorId, is_active: !isActive },
              {
                onSuccess: (updated) => {
                  queryClient.setQueryData(["vendor", vendorId], updated);
                  queryClient.setQueryData<Vendor[]>(["vendors"], (old) =>
                    old?.map((v) => (v.id === updated.id ? updated : v)) || []
                  );
                },
                onError: (err: any) => {
                  const msg =
                    typeof err?.message === "string"
                      ? err.message
                      : `Failed to ${action.toLowerCase()} vendor.`;
                  Alert.alert("Error", msg);
                },
              }
            );
          },
        },
      ]
    );
  };

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
    queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
  };

  // --- Inline forms (full-screen) ---
  if (showVendorEdit) {
    return (
      <VendorForm
        onSubmit={handleEditVendor}
        defaultValues={vendorDetail || { id: vendorId, name: name as string }}
        onCancel={() => setShowVendorEdit(false)}
        submitting={vendorSubmitting}
      />
    );
  }

  if (showAdminForm) {
    return (
      <AdminForm
        onSubmit={adminEditorData ? handleEditAdmin : handleCreateAdmin}
        defaultValues={adminEditorData || undefined}
        onCancel={() => {
          setShowAdminForm(false);
          setAdminEditorData(null);
        }}
        submitting={adminSubmitting}
        vendorId={vendorId}
        vendorName={vendorNameForHeader}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
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
          <View className={`h-2 ${isActive ? "bg-indigo-500" : "bg-gray-300"}`} />
          <View className="p-5">
            <View className="flex-row items-center">
              <View
                className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${
                  isActive ? "bg-indigo-50" : "bg-gray-100"
                }`}
              >
                <Building2
                  size={28}
                  color={isActive ? "#4F46E5" : "#9CA3AF"}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-xl font-bold ${
                    isActive ? "text-gray-900" : "text-gray-500"
                  }`}
                  numberOfLines={1}
                >
                  {vendorNameForHeader}
                </Text>
                <View className="flex-row items-center mt-1 gap-2">
                  <Text className="text-gray-400 text-sm">ID: {id}</Text>
                  <View
                    className={`flex-row items-center px-2 py-0.5 rounded-full ${
                      isActive ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <View
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        isActive ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        isActive ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowVendorEdit(true)}
                className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Pencil size={16} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Activate / Deactivate */}
            <TouchableOpacity
              onPress={handleToggleActive}
              disabled={isToggling}
              activeOpacity={0.85}
              className={`mt-4 flex-row items-center justify-center py-3 rounded-xl border ${
                isActive
                  ? "bg-red-50 border-red-100"
                  : "bg-green-50 border-green-100"
              }`}
              style={isToggling ? { opacity: 0.6 } : undefined}
            >
              {isToggling ? (
                <ActivityIndicator
                  size="small"
                  color={isActive ? "#B91C1C" : "#047857"}
                />
              ) : (
                <>
                  <Power
                    size={16}
                    color={isActive ? "#B91C1C" : "#047857"}
                  />
                  <Text
                    className={`ml-2 font-bold text-sm ${
                      isActive ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {isActive ? "Deactivate Vendor" : "Activate Vendor"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
            <View className="flex-row items-center gap-2">
              <View className="bg-amber-50 px-2.5 py-1 rounded-md">
                <Text className="text-amber-600 text-xs font-bold">
                  {admins.length}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAdminEditorData(null);
                  setShowAdminForm(true);
                }}
                className="w-8 h-8 rounded-lg bg-indigo-600 items-center justify-center"
                activeOpacity={0.8}
              >
                <Plus size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-gray-400 text-xs mb-2">
            Tap the star to mark as main admin (only one per vendor).
          </Text>

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
              <TouchableOpacity
                onPress={() => {
                  setAdminEditorData(null);
                  setShowAdminForm(true);
                }}
                className="mt-3 bg-indigo-600 px-5 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold text-sm">
                  Add Admin
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {admins.map((admin, index) => {
                const isMain = !!admin.is_main_vendor;
                return (
                  <View
                    key={admin.id}
                    className={`flex-row items-center px-5 py-4 ${
                      index < admins.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <TouchableOpacity
                      onPress={() => handleSetMainAdmin(admin)}
                      disabled={isMain || isSettingMainVendor}
                      activeOpacity={0.7}
                      hitSlop={8}
                      className={`w-9 h-9 rounded-lg items-center justify-center mr-3 ${
                        isMain ? "bg-indigo-100" : "bg-gray-50"
                      }`}
                    >
                      <Star
                        size={16}
                        color={isMain ? "#4F46E5" : "#9CA3AF"}
                        fill={isMain ? "#4F46E5" : "transparent"}
                      />
                    </TouchableOpacity>
                    <View className="flex-1 mr-2">
                      <Text
                        className="text-gray-800 font-semibold text-sm"
                        numberOfLines={1}
                      >
                        {admin.username}
                      </Text>
                      <View className="flex-row gap-2 mt-1">
                        {isMain && (
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
                    <TouchableOpacity
                      onPress={() => {
                        setAdminEditorData(admin);
                        setShowAdminForm(true);
                      }}
                      className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-2"
                      activeOpacity={0.7}
                      hitSlop={6}
                    >
                      <Pencil size={13} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteAdmin(admin)}
                      className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center"
                      activeOpacity={0.7}
                      hitSlop={6}
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}
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
            <Text className="text-gray-500 text-xs font-semibold mb-2">
              Single Digit
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-4">
              {[
                {
                  label: "A",
                  value: vendorDetail?.monitoring_single_digit_a_count,
                },
                {
                  label: "B",
                  value: vendorDetail?.monitoring_single_digit_b_count,
                },
                {
                  label: "C",
                  value: vendorDetail?.monitoring_single_digit_c_count,
                },
              ].map((item) => (
                <View
                  key={`single-${item.label}`}
                  className="bg-gray-50 px-3 py-2 rounded-lg"
                  style={{ width: "30%" }}
                >
                  <Text className="text-gray-400 text-xs">{item.label}</Text>
                  <Text className="text-gray-800 font-bold text-sm">
                    {item.value ?? 0}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="text-gray-500 text-xs font-semibold mb-2">
              Double Digit
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-4">
              {[
                {
                  label: "AB",
                  value: vendorDetail?.monitoring_double_digit_ab_count,
                },
                {
                  label: "BC",
                  value: vendorDetail?.monitoring_double_digit_bc_count,
                },
                {
                  label: "AC",
                  value: vendorDetail?.monitoring_double_digit_ac_count,
                },
              ].map((item) => (
                <View
                  key={`double-${item.label}`}
                  className="bg-gray-50 px-3 py-2 rounded-lg"
                  style={{ width: "30%" }}
                >
                  <Text className="text-gray-400 text-xs">{item.label}</Text>
                  <Text className="text-gray-800 font-bold text-sm">
                    {item.value ?? 0}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="text-gray-500 text-xs font-semibold mb-2">
              Triple Digit
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {[
                {
                  label: "Super",
                  value: vendorDetail?.monitoring_triple_digit_super_count,
                },
                {
                  label: "Box",
                  value: vendorDetail?.monitoring_triple_digit_box_count,
                },
              ].map((item) => (
                <View
                  key={`triple-${item.label}`}
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
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
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
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
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
