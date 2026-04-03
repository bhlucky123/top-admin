import api from "@/utils/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Save } from "lucide-react-native";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PrizeConfig {
  id: number;
  is_active: boolean;
  default_dealer_commission: number;
  single_digit_prize: number;
  double_digit_prize: number;
  box_direct: number;
  box_indirect: number;
  super_first_prize: number;
  super_second_prize: number;
  super_third_prize: number;
  super_fourth_prize: number;
  super_fifth_prize: number;
  super_complementary_prize: number;
}

const FIELDS: { key: keyof PrizeConfig; label: string }[] = [
  { key: "default_dealer_commission", label: "Default Dealer Commission" },
  { key: "single_digit_prize", label: "Single Digit Prize" },
  { key: "double_digit_prize", label: "Double Digit Prize" },
  { key: "box_direct", label: "Box Direct" },
  { key: "box_indirect", label: "Box Indirect" },
  { key: "super_first_prize", label: "Super First Prize" },
  { key: "super_second_prize", label: "Super Second Prize" },
  { key: "super_third_prize", label: "Super Third Prize" },
  { key: "super_fourth_prize", label: "Super Fourth Prize" },
  { key: "super_fifth_prize", label: "Super Fifth Prize" },
  { key: "super_complementary_prize", label: "Super Complementary Prize" },
];

export default function VendorConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendorId = Number(id);
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading,
    isError,
    refetch,
  } = useQuery<PrizeConfig>({
    queryKey: ["vendor-config", vendorId],
    queryFn: () =>
      api
        .get(`/administrator/prize-configuration/${vendorId}/`)
        .then((r) => r.data),
    retry: false,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      const formData: Record<string, string> = {};
      FIELDS.forEach(({ key }) => {
        formData[key] = config[key]?.toString() || "0";
      });
      setForm(formData);
      setIsActive(config.is_active);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      api
        .patch(`/administrator/prize-configuration/${vendorId}/`, data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-config", vendorId] });
      Alert.alert("Success", "Prize configuration updated successfully.");
    },
    onError: (err: any) => {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : "Failed to update configuration.";
      Alert.alert("Error", msg);
    },
  });

  const handleSave = () => {
    const data: any = { is_active: isActive };
    for (const { key } of FIELDS) {
      const value = form[key];
      if (!value && value !== "0") {
        Alert.alert("Validation", `${key} is required`);
        return;
      }
      data[key] = Number(value);
    }
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-500">Loading configuration...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center px-8 bg-white">
        <Text className="text-red-600 text-xl font-bold mb-4">
          Failed to load configuration
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="bg-indigo-600 px-8 py-3 rounded-xl"
        >
          <Text className="text-white font-bold text-base">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* App Status Toggle */}
          <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
            <TouchableOpacity
              onPress={() => setIsActive(!isActive)}
              className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                isActive
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
              activeOpacity={0.8}
            >
              <View>
                <Text className="text-gray-800 font-semibold">
                  Application Status
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  {isActive
                    ? "Vendor app is active"
                    : "Vendor app is inactive"}
                </Text>
              </View>
              <View
                className={`w-14 h-7 rounded-full p-1 ${
                  isActive ? "bg-green-500" : "bg-red-400"
                }`}
              >
                <View
                  className={`w-5 h-5 bg-white rounded-full ${
                    isActive ? "ml-7" : "ml-0"
                  }`}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Prize Fields */}
          <View className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">
              Prize Configuration
            </Text>

            {FIELDS.map(({ key, label }) => {
              const isFocused = focusedField === key;
              const value = form[key] || "";
              const hasValue = !!value && value !== "0";

              return (
                <View key={key} className="mb-4">
                  <Text className="text-gray-600 font-medium text-sm mb-1.5 ml-0.5">
                    {label}
                  </Text>
                  <TextInput
                    className={`border-2 rounded-xl px-4 py-3 bg-white text-gray-800 font-medium ${
                      isFocused
                        ? "border-indigo-400 bg-indigo-50"
                        : hasValue
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                    value={value}
                    onChangeText={(t) =>
                      setForm((prev) => ({ ...prev, [key]: t }))
                    }
                    onFocus={() => setFocusedField(key)}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    placeholder="0"
                  />
                </View>
              );
            })}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            className={`bg-indigo-600 py-4 rounded-xl shadow-lg mt-6 flex-row items-center justify-center ${
              updateMutation.isPending ? "opacity-60" : ""
            }`}
            onPress={handleSave}
            disabled={updateMutation.isPending}
            activeOpacity={0.9}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text className="text-white font-bold text-lg ml-2">
                  Save Configuration
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
