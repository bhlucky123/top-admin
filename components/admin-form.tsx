import KeyboardAvoider from "@/components/keyboard-avoider";
import { Admin } from "@/hooks/use-staff";
import { Eye, EyeOff, MoveLeft } from "lucide-react-native";
import { useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export type AdminFormPayload = {
  username: string;
  password?: string;
  is_active: boolean;
  vendor: number;
  is_main_vendor: boolean;
  calculate_str: string;
  secret_pin: number;
};

/**
 * Admin create/edit form. Always scoped to a single vendor via ``vendorId``
 * (the vendor picker is hidden — this form is only surfaced from a vendor
 * detail screen).
 */
export default function AdminForm({
  onSubmit,
  defaultValues,
  onCancel,
  submitting,
  vendorId,
  vendorName,
}: {
  onSubmit: (data: AdminFormPayload) => void;
  defaultValues?: Partial<Admin>;
  onCancel: () => void;
  submitting: boolean;
  vendorId: number;
  vendorName?: string;
}) {
  const [form, setForm] = useState({
    username: defaultValues?.username || "",
    password: "",
    is_active: defaultValues?.is_active ?? true,
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
    if (!isEdit && !form.password.trim())
      newErrors.password = "Password is required";
    if (!form.calculate_str.trim()) newErrors.calculate_str = "Required";
    if (!form.secret_pin.trim()) newErrors.secret_pin = "Required";
    else if (isNaN(Number(form.secret_pin)))
      newErrors.secret_pin = "Must be a number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data: AdminFormPayload = {
      username: form.username,
      is_active: form.is_active,
      vendor: vendorId,
      is_main_vendor: form.is_main_vendor,
      calculate_str: form.calculate_str,
      secret_pin: Number(form.secret_pin),
    };
    if (form.password.trim()) data.password = form.password;
    onSubmit(data);
  };

  const inputFields = [
    { key: "username", label: "Username", keyboard: "default" as const },
    {
      key: "password",
      label: "Password",
      keyboard: "default" as const,
      optional: isEdit,
    },
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

      <KeyboardAvoider className="flex-1">
        <ScrollView
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Vendor label (read-only — scoped by parent) */}
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-2 ml-1">Vendor</Text>
            <View className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <Text className="text-indigo-800 font-semibold">
                {vendorName || `Vendor #${vendorId}`}
              </Text>
            </View>
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
              <View className="flex-1 pr-3">
                <Text className="text-gray-700 font-semibold">Main Admin</Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  Only one admin per vendor can be main. Promoting demotes any
                  existing one.
                </Text>
              </View>
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
      </KeyboardAvoider>
    </View>
  );
}
