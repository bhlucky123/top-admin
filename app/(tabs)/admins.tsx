import useStaff, { Admin } from "@/hooks/use-staff";
import { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Eye,
  EyeOff,
  MoveLeft,
  Plus,
  Search,
  Users,
} from "lucide-react-native";
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

// --- Admin Form ---
function AdminForm({
  onSubmit,
  defaultValues,
  onCancel,
  submitting,
  vendors,
}: {
  onSubmit: (data: any) => void;
  defaultValues?: Partial<Admin>;
  onCancel: () => void;
  submitting: boolean;
  vendors: Vendor[];
}) {
  const [form, setForm] = useState({
    username: defaultValues?.username || "",
    password: "",
    is_active: defaultValues?.is_active ?? true,
    vendor: defaultValues?.vendor?.toString() || "",
    is_main_vendor: defaultValues?.is_main_vendor ?? false,
    calculate_str: defaultValues?.calculate_str || "",
    secret_pin: defaultValues?.secret_pin?.toString() || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = !!defaultValues?.id;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.username.trim()) newErrors.username = "Username is required";
    else if (/\s/.test(form.username)) newErrors.username = "No spaces allowed";
    if (!isEdit && !form.password.trim()) newErrors.password = "Password is required";
    if (!form.vendor) newErrors.vendor = "Vendor is required";
    if (!form.calculate_str.trim()) newErrors.calculate_str = "Required";
    if (!form.secret_pin.trim()) newErrors.secret_pin = "Required";
    else if (isNaN(Number(form.secret_pin))) newErrors.secret_pin = "Must be a number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data: any = {
      username: form.username,
      is_active: form.is_active,
      vendor: Number(form.vendor),
      is_main_vendor: form.is_main_vendor,
      calculate_str: form.calculate_str,
      secret_pin: Number(form.secret_pin),
    };
    if (form.password.trim()) data.password = form.password;
    onSubmit(data);
  };

  const inputFields = [
    { key: "username", label: "Username", keyboard: "default" as const },
    { key: "password", label: "Password", keyboard: "default" as const, optional: isEdit },
    { key: "calculate_str", label: "Calculate String", keyboard: "default" as const },
    { key: "secret_pin", label: "Secret PIN", keyboard: "numeric" as const },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View className="bg-white shadow-sm border-b border-gray-100">
        <View className="flex-row items-center justify-between px-6 pt-14 pb-4">
          <TouchableOpacity
            onPress={onCancel}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <MoveLeft size={22} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">
            {isEdit ? "Edit Admin" : "New Admin"}
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Vendor Selector */}
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-2 ml-1">
              Vendor <Text className="text-red-500">*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-1"
            >
              {vendors.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => handleChange("vendor", v.id.toString())}
                  className={`mr-2 px-4 py-3 rounded-xl border-2 ${
                    form.vendor === v.id.toString()
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-semibold text-sm ${
                      form.vendor === v.id.toString()
                        ? "text-indigo-700"
                        : "text-gray-600"
                    }`}
                  >
                    {v.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {errors.vendor && (
              <Text className="text-red-500 text-sm mt-1 ml-1 font-medium">
                {errors.vendor}
              </Text>
            )}
          </View>

          {/* Text Fields */}
          {inputFields.map(({ key, label, keyboard, optional }) => {
            const isFocused = focusedField === key;
            const hasError = !!errors[key];
            const value = form[key as keyof typeof form] as string;
            const hasValue = !!value;
            const isPassword = key === "password";

            return (
              <View key={key} className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2 ml-1">
                  {label}
                  {!optional && <Text className="text-red-500"> *</Text>}
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder={
                      optional
                        ? `${label} (optional)`
                        : `Enter ${label.toLowerCase()}`
                    }
                    className={`border-2 rounded-xl px-4 py-3.5 bg-white text-gray-800 font-medium ${
                      isPassword ? "pr-12" : ""
                    } ${
                      hasError
                        ? "border-red-300 bg-red-50"
                        : isFocused
                        ? "border-indigo-400 bg-indigo-50"
                        : hasValue
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                    value={value}
                    onChangeText={(t) => handleChange(key, t)}
                    onFocus={() => setFocusedField(key)}
                    onBlur={() => setFocusedField(null)}
                    keyboardType={keyboard}
                    secureTextEntry={isPassword && !showPassword}
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                    maxLength={key === "secret_pin" ? 4 : undefined}
                  />
                  {isPassword && (
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: 14,
                        top: "50%",
                        marginTop: -12,
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showPassword ? (
                        <Eye size={20} color="#6b7280" />
                      ) : (
                        <EyeOff size={20} color="#6b7280" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                {hasError && (
                  <Text className="text-red-500 text-sm mt-1 ml-1 font-medium">
                    {errors[key]}
                  </Text>
                )}
              </View>
            );
          })}

          {/* Main Vendor Toggle */}
          <View className="mb-5">
            <TouchableOpacity
              onPress={() => handleChange("is_main_vendor", !form.is_main_vendor)}
              className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                form.is_main_vendor
                  ? "bg-indigo-50 border-indigo-300"
                  : "bg-gray-50 border-gray-200"
              }`}
              activeOpacity={0.8}
            >
              <Text className="text-gray-700 font-medium">Main Vendor Admin</Text>
              <View
                className={`w-12 h-6 rounded-full p-1 ${
                  form.is_main_vendor ? "bg-indigo-500" : "bg-gray-400"
                }`}
              >
                <View
                  className={`w-4 h-4 bg-white rounded-full ${
                    form.is_main_vendor ? "ml-6" : "ml-0"
                  }`}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Active Toggle */}
          <View className="mb-8">
            <TouchableOpacity
              onPress={() => handleChange("is_active", !form.is_active)}
              className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                form.is_active
                  ? "bg-green-50 border-green-300"
                  : "bg-gray-50 border-gray-200"
              }`}
              activeOpacity={0.8}
            >
              <Text className="text-gray-700 font-medium">Active Account</Text>
              <View
                className={`w-12 h-6 rounded-full p-1 ${
                  form.is_active ? "bg-green-500" : "bg-gray-400"
                }`}
              >
                <View
                  className={`w-4 h-4 bg-white rounded-full ${
                    form.is_active ? "ml-6" : "ml-0"
                  }`}
                />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={`bg-indigo-600 py-4 rounded-xl shadow-lg mb-8 ${
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
                ? "Update Admin"
                : "Create Admin"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- Admin Card ---
function AdminCard({
  item,
  vendors,
  onEdit,
  onDelete,
}: {
  item: Admin;
  vendors: Vendor[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const vendorName = vendors.find((v) => v.id === item.vendor)?.name || "Unknown";

  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <View className={`h-1 ${item.is_active ? "bg-green-500" : "bg-gray-400"}`} />
      <View className="p-5">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mr-3">
              <Users size={18} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-800">
                {item.username}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Building2 size={12} color="#6B7280" />
                <Text className="text-gray-500 text-xs ml-1">{vendorName}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onEdit}
              className="px-3 py-1.5 bg-gray-100 rounded-lg"
            >
              <Text className="text-gray-700 text-sm font-medium">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              className="px-3 py-1.5 bg-red-50 rounded-lg"
            >
              <Text className="text-red-600 text-sm font-medium">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row gap-2 mt-1">
          {item.is_main_vendor && (
            <View className="bg-indigo-50 px-2.5 py-1 rounded-md">
              <Text className="text-indigo-600 text-xs font-semibold">
                Main Admin
              </Text>
            </View>
          )}
          <View
            className={`px-2.5 py-1 rounded-md ${
              item.is_active ? "bg-green-50" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                item.is_active ? "text-green-600" : "text-gray-500"
              }`}
            >
              {item.is_active ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function AdminsScreen() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Admin | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data: admins = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<Admin[]>({
    queryKey: ["admins"],
    queryFn: () => api.get("/administrator/administrator/").then((r) => r.data),
    retry: false,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/administrator/vendors/").then((r) => r.data),
  });

  const { createAdmin, editAdmin, deleteAdmin } = useStaff();

  const filtered = admins.filter((a) =>
    a.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (data: any) => {
    setSubmitting(true);
    createAdmin(data, {
      onSuccess: () => {
        refetch();
        setShowForm(false);
        setSubmitting(false);
      },
      onError: (err: any) => {
        setSubmitting(false);
        let msg = "Failed to create admin.";
        if (err?.message) {
          if (typeof err.message === "string") msg = err.message;
          else if (err.message.username?.[0]) msg = err.message.username[0];
          else if (err.message.non_field_errors?.[0]) msg = err.message.non_field_errors[0];
          else {
            const firstKey = Object.keys(err.message)[0];
            if (firstKey && Array.isArray(err.message[firstKey]))
              msg = err.message[firstKey][0];
          }
        }
        Alert.alert("Error", msg);
      },
    });
  };

  const handleEdit = (data: any) => {
    if (!editData) return;
    setSubmitting(true);
    editAdmin(
      { ...data, id: editData.id },
      {
        onSuccess: () => {
          refetch();
          setShowForm(false);
          setEditData(null);
          setSubmitting(false);
        },
        onError: (err: any) => {
          setSubmitting(false);
          let msg = "Failed to update admin.";
          if (typeof err?.message === "string") msg = err.message;
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const handleDelete = (admin: Admin) => {
    Alert.alert("Delete Admin", `Delete "${admin.username}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteAdmin({ id: admin.id }, { onSuccess: () => refetch() }),
      },
    ]);
  };

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center px-8 bg-white">
        <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
          <Text className="text-red-600 text-xl font-bold mb-4">
            Failed to load administrators
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-indigo-600 px-8 py-3 rounded-xl"
          >
            <Text className="text-white font-bold text-base">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showForm) {
    return (
      <AdminForm
        onSubmit={editData ? handleEdit : handleCreate}
        defaultValues={editData || {}}
        onCancel={() => {
          setShowForm(false);
          setEditData(null);
        }}
        submitting={submitting}
        vendors={vendors}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">
            Administrators
          </Text>
          <TouchableOpacity
            onPress={() => {
              setEditData(null);
              setShowForm(true);
            }}
            className="w-11 h-11 bg-indigo-600 rounded-full items-center justify-center shadow-md"
          >
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2.5">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search administrators..."
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
          <Text className="mt-4 text-gray-500">Loading administrators...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
          renderItem={({ item }) => (
            <AdminCard
              item={item}
              vendors={vendors}
              onEdit={() => {
                setEditData(item);
                setShowForm(true);
              }}
              onDelete={() => handleDelete(item)}
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
              <Users size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                {searchQuery
                  ? "No administrators match your search"
                  : "No administrators yet"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
