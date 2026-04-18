import useVendor, { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Activity, Building2, ChevronRight, MoveLeft, Plus, Search } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type VendorFormData = {
  name: string;
  monitoring_single_digit_count: number;
  monitoring_double_digit_count: number;
  monitoring_triple_digit_super_count: number;
  monitoring_triple_digit_box_count: number;
};

// --- Vendor Form ---
function VendorForm({
  onSubmit,
  defaultValues,
  onCancel,
  submitting,
}: {
  onSubmit: (data: VendorFormData) => void;
  defaultValues?: Partial<Vendor>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(defaultValues?.name || "");
  const [single, setSingle] = useState(
    String(defaultValues?.monitoring_single_digit_count ?? "")
  );
  const [double, setDouble] = useState(
    String(defaultValues?.monitoring_double_digit_count ?? "")
  );
  const [superCount, setSuperCount] = useState(
    String(defaultValues?.monitoring_triple_digit_super_count ?? "")
  );
  const [box, setBox] = useState(
    String(defaultValues?.monitoring_triple_digit_box_count ?? "")
  );
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  const validate = () => {
    const e: { [k: string]: string } = {};
    if (!name.trim()) e.name = "Vendor name is required";
    ([
      { key: "single", value: single },
      { key: "double", value: double },
      { key: "super", value: superCount },
      { key: "box", value: box },
    ] as const).forEach(({ key, value }) => {
      if (value === "") return; // allow blank → treated as 0
      if (isNaN(Number(value)) || Number(value) < 0) {
        e[key] = "Enter a valid count";
      }
    });
    setErrors(e);
    setTimeout(() => setErrors({}), 3000);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      monitoring_single_digit_count: Number(single || 0),
      monitoring_double_digit_count: Number(double || 0),
      monitoring_triple_digit_super_count: Number(superCount || 0),
      monitoring_triple_digit_box_count: Number(box || 0),
    });
  };

  const isEdit = !!defaultValues?.id;

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View className="bg-white shadow-sm border-b border-gray-100">
        <View className="flex-row items-center justify-between px-6 pt-14 pb-4">
          <TouchableOpacity
            onPress={onCancel}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <MoveLeft size={22} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">
            {isEdit ? "Edit Vendor" : "New Vendor"}
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-2 ml-1">
              Vendor Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className={`border-2 rounded-xl px-4 py-4 bg-white text-gray-800 font-medium ${
                errors.name
                  ? "border-red-300 bg-red-50"
                  : name.trim()
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200"
              }`}
              placeholder="Enter vendor name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
            />
            {errors.name && (
              <Text className="text-red-500 text-sm mt-1 ml-1 font-medium">
                {errors.name}
              </Text>
            )}
          </View>

          {/* Monitoring Thresholds */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3 ml-1">
              <Activity size={16} color="#4F46E5" />
              <Text className="text-gray-700 font-semibold ml-2">
                Monitoring Thresholds
              </Text>
            </View>
            <Text className="text-gray-500 text-xs mb-3 ml-1">
              Leave blank to keep at 0. Used to flag vendors whose bookings
              exceed these counts.
            </Text>

            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {(
                [
                  {
                    key: "single",
                    label: "Single Digit",
                    value: single,
                    set: setSingle,
                  },
                  {
                    key: "double",
                    label: "Double Digit",
                    value: double,
                    set: setDouble,
                  },
                  {
                    key: "super",
                    label: "Triple Super",
                    value: superCount,
                    set: setSuperCount,
                  },
                  {
                    key: "box",
                    label: "Triple Box",
                    value: box,
                    set: setBox,
                  },
                ] as const
              ).map((f) => (
                <View
                  key={f.key}
                  style={{ width: "47%", flexGrow: 1 }}
                >
                  <Text className="text-gray-500 text-xs font-semibold mb-1.5 ml-1">
                    {f.label}
                  </Text>
                  <TextInput
                    className={`border-2 rounded-xl px-4 py-3 bg-white text-gray-800 font-medium ${
                      errors[f.key] ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={f.value}
                    onChangeText={(t) => f.set(t.replace(/[^0-9]/g, ""))}
                  />
                  {errors[f.key] && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {errors[f.key]}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            className={`bg-indigo-600 py-4 rounded-xl shadow-lg ${
              submitting ? "opacity-60" : ""
            }`}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.9}
          >
            <Text className="text-white text-center font-bold text-lg">
              {submitting
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                ? "Update Vendor"
                : "Create Vendor"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- Vendor Card ---
function VendorCard({
  item,
  onEdit,
  onToggleActive,
  onPress,
}: {
  item: Vendor;
  onEdit: () => void;
  onToggleActive: () => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white mx-4 mb-3 rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
      activeOpacity={0.7}
    >
      <View className={`h-1 ${item.is_active ? "bg-indigo-500" : "bg-gray-300"}`} />
      <View className="p-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${item.is_active ? "bg-indigo-50" : "bg-gray-100"}`}>
              <Building2 size={18} color={item.is_active ? "#4F46E5" : "#9CA3AF"} />
            </View>
            <View>
              <Text className={`text-lg font-bold ${item.is_active ? "text-gray-800" : "text-gray-400"}`}>
                {item.name}
              </Text>
              <View className={`mt-1 self-start px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-50" : "bg-red-50"}`}>
                <Text className={`text-xs font-semibold ${item.is_active ? "text-green-600" : "text-red-500"}`}>
                  {item.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={onEdit}
              className="px-3 py-1.5 bg-gray-100 rounded-lg"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 text-sm font-medium">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onToggleActive}
              className={`px-3 py-1.5 rounded-lg ${item.is_active ? "bg-red-50" : "bg-green-50"}`}
              activeOpacity={0.7}
            >
              <Text className={`text-sm font-medium ${item.is_active ? "text-red-600" : "text-green-600"}`}>
                {item.is_active ? "Deactivate" : "Activate"}
              </Text>
            </TouchableOpacity>
            <ChevronRight size={18} color="#9CA3AF" />
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
  const [editData, setEditData] = useState<Vendor | null>(null);
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

  const { createVendor, editVendor, toggleActive } = useVendor();

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
          (typeof err?.message === "string" ? err.message : "Failed to create vendor.");
        Alert.alert("Error", msg);
      },
    });
  };

  const handleEdit = (data: VendorFormData) => {
    if (!editData) return;
    setSubmitting(true);
    editVendor(
      { id: editData.id, ...data },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData<Vendor[]>(["vendors"], (old) =>
            old?.map((v) => (v.id === updated.id ? updated : v)) || []
          );
          setShowForm(false);
          setEditData(null);
          setSubmitting(false);
        },
        onError: (err: any) => {
          setSubmitting(false);
          const msg =
            err?.message?.name?.[0] ||
            (typeof err?.message === "string" ? err.message : "Failed to update vendor.");
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const handleToggleActive = (vendor: Vendor) => {
    const action = vendor.is_active ? "Deactivate" : "Activate";
    Alert.alert(
      `${action} Vendor`,
      `Are you sure you want to ${action.toLowerCase()} "${vendor.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          style: vendor.is_active ? "destructive" : "default",
          onPress: () => {
            toggleActive(
              { id: vendor.id, is_active: !vendor.is_active },
              {
                onSuccess: (updated) => {
                  queryClient.setQueryData<Vendor[]>(["vendors"], (old) =>
                    old?.map((v) => (v.id === updated.id ? updated : v)) || []
                  );
                },
                onError: (err: any) => {
                  const msg =
                    typeof err?.message === "string" ? err.message : `Failed to ${action.toLowerCase()} vendor.`;
                  Alert.alert("Error", msg);
                },
              }
            );
          },
        },
      ]
    );
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
        onSubmit={editData ? handleEdit : handleCreate}
        defaultValues={editData || {}}
        onCancel={() => {
          setShowForm(false);
          setEditData(null);
        }}
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
            onPress={() => {
              setEditData(null);
              setShowForm(true);
            }}
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
              onEdit={() => {
                setEditData(item);
                setShowForm(true);
              }}
              onToggleActive={() => handleToggleActive(item)}
              onPress={() =>
                router.push({
                  pathname: "/vendor/[id]",
                  params: { id: String(item.id), name: item.name, is_active: String(item.is_active) },
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
