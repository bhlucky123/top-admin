import KeyboardAvoider from "@/components/keyboard-avoider";
import { Vendor } from "@/hooks/use-vendor";
import { Activity, MoveLeft } from "lucide-react-native";
import { useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type VendorFormData = {
  name: string;
  monitoring_enabled: boolean;
  monitoring_single_digit_a_count: number;
  monitoring_single_digit_b_count: number;
  monitoring_single_digit_c_count: number;
  monitoring_double_digit_ab_count: number;
  monitoring_double_digit_bc_count: number;
  monitoring_double_digit_ac_count: number;
  monitoring_triple_digit_super_count: number;
  monitoring_triple_digit_box_count: number;
};

export default function VendorForm({
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
  const [monitoringEnabled, setMonitoringEnabled] = useState<boolean>(
    defaultValues?.monitoring_enabled ?? true
  );
  const [singleA, setSingleA] = useState(
    String(defaultValues?.monitoring_single_digit_a_count ?? "")
  );
  const [singleB, setSingleB] = useState(
    String(defaultValues?.monitoring_single_digit_b_count ?? "")
  );
  const [singleC, setSingleC] = useState(
    String(defaultValues?.monitoring_single_digit_c_count ?? "")
  );
  const [doubleAB, setDoubleAB] = useState(
    String(defaultValues?.monitoring_double_digit_ab_count ?? "")
  );
  const [doubleBC, setDoubleBC] = useState(
    String(defaultValues?.monitoring_double_digit_bc_count ?? "")
  );
  const [doubleAC, setDoubleAC] = useState(
    String(defaultValues?.monitoring_double_digit_ac_count ?? "")
  );
  const [superCount, setSuperCount] = useState(
    String(defaultValues?.monitoring_triple_digit_super_count ?? "")
  );
  const [box, setBox] = useState(
    String(defaultValues?.monitoring_triple_digit_box_count ?? "")
  );
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const insets = useSafeAreaInsets();

  const validate = () => {
    const e: { [k: string]: string } = {};
    if (!name.trim()) e.name = "Vendor name is required";
    (
      [
        { key: "singleA", value: singleA },
        { key: "singleB", value: singleB },
        { key: "singleC", value: singleC },
        { key: "doubleAB", value: doubleAB },
        { key: "doubleBC", value: doubleBC },
        { key: "doubleAC", value: doubleAC },
        { key: "super", value: superCount },
        { key: "box", value: box },
      ] as const
    ).forEach(({ key, value }) => {
      if (value === "") return;
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
      monitoring_enabled: monitoringEnabled,
      monitoring_single_digit_a_count: Number(singleA || 0),
      monitoring_single_digit_b_count: Number(singleB || 0),
      monitoring_single_digit_c_count: Number(singleC || 0),
      monitoring_double_digit_ab_count: Number(doubleAB || 0),
      monitoring_double_digit_bc_count: Number(doubleBC || 0),
      monitoring_double_digit_ac_count: Number(doubleAC || 0),
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

      <KeyboardAvoider className="flex-1">
        <ScrollView
          className="flex-1 px-6 pt-8"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-2 ml-1">
              Vendor Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className={`border-2 rounded-xl px-4 py-4 bg-white text-gray-800 font-medium ${errors.name
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

          <View className="mb-6">
            <TouchableOpacity
              onPress={() => setMonitoringEnabled((v) => !v)}
              activeOpacity={0.8}
              className={`flex-row items-center justify-between px-4 py-4 rounded-xl border-2 ${monitoringEnabled
                ? "bg-green-50 border-green-300"
                : "bg-gray-50 border-gray-200"
                }`}
            >
              <View className="flex-row items-center flex-1 pr-3">
                <Activity
                  size={18}
                  color={monitoringEnabled ? "#059669" : "#9CA3AF"}
                />
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-semibold ${monitoringEnabled ? "text-green-700" : "text-gray-600"
                      }`}
                  >
                    Extra-Count Monitoring
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {monitoringEnabled
                      ? "Extras will be marked for this vendor."
                      : "No extras will be recorded for this vendor."}
                  </Text>
                </View>
              </View>
              <View
                className={`w-12 h-6 rounded-full p-0.5 ${monitoringEnabled ? "bg-green-500" : "bg-gray-400"
                  }`}
              >
                <View
                  className={`w-5 h-5 bg-white rounded-full ${monitoringEnabled ? "ml-auto" : ""
                    }`}
                />
              </View>
            </TouchableOpacity>
          </View>

          <View
            className="mb-6"
            style={{ opacity: monitoringEnabled ? 1 : 0.5 }}
          >
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

            <Text className="text-gray-600 text-xs font-semibold mt-1 mb-2 ml-1">
              Single Digit (per sub_type)
            </Text>
            <View className="flex-row flex-wrap mb-4" style={{ gap: 12 }}>
              {(
                [
                  { key: "singleA", label: "A", value: singleA, set: setSingleA },
                  { key: "singleB", label: "B", value: singleB, set: setSingleB },
                  { key: "singleC", label: "C", value: singleC, set: setSingleC },
                ] as const
              ).map((f) => (
                <View key={f.key} style={{ width: "30%", flexGrow: 1 }}>
                  <Text className="text-gray-500 text-xs font-semibold mb-1.5 ml-1">
                    {f.label}
                  </Text>
                  <TextInput
                    className={`border-2 rounded-xl px-4 py-3 bg-white text-gray-800 font-medium ${errors[f.key]
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
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

            <Text className="text-gray-600 text-xs font-semibold mb-2 ml-1">
              Double Digit (per sub_type)
            </Text>
            <View className="flex-row flex-wrap mb-4" style={{ gap: 12 }}>
              {(
                [
                  { key: "doubleAB", label: "AB", value: doubleAB, set: setDoubleAB },
                  { key: "doubleBC", label: "BC", value: doubleBC, set: setDoubleBC },
                  { key: "doubleAC", label: "AC", value: doubleAC, set: setDoubleAC },
                ] as const
              ).map((f) => (
                <View key={f.key} style={{ width: "30%", flexGrow: 1 }}>
                  <Text className="text-gray-500 text-xs font-semibold mb-1.5 ml-1">
                    {f.label}
                  </Text>
                  <TextInput
                    className={`border-2 rounded-xl px-4 py-3 bg-white text-gray-800 font-medium ${errors[f.key]
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
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

            <Text className="text-gray-600 text-xs font-semibold mb-2 ml-1">
              Triple Digit
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {(
                [
                  { key: "super", label: "Super", value: superCount, set: setSuperCount },
                  { key: "box", label: "Box", value: box, set: setBox },
                ] as const
              ).map((f) => (
                <View key={f.key} style={{ width: "47%", flexGrow: 1 }}>
                  <Text className="text-gray-500 text-xs font-semibold mb-1.5 ml-1">
                    {f.label}
                  </Text>
                  <TextInput
                    className={`border-2 rounded-xl px-4 py-3 bg-white text-gray-800 font-medium ${errors[f.key]
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
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
            className={`bg-indigo-600 py-4 rounded-xl shadow-lg ${submitting ? "opacity-60" : ""
              } mb-20  `}
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
      </KeyboardAvoider>
    </View>
  );
}
