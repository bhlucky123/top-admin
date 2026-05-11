import KeyboardAvoider from "@/components/keyboard-avoider";
import api from "@/utils/axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MoveLeft, Save, Shield, Ticket } from "lucide-react-native";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface SubTypeLimits {
  single_digit_a: number;
  single_digit_b: number;
  single_digit_c: number;
  double_digit_ab: number;
  double_digit_bc: number;
  double_digit_ac: number;
  triple_digit_super: number;
  triple_digit_box: number;
}

type FieldGroup = {
  title: string;
  fields: { key: keyof SubTypeLimits; label: string }[];
};

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Single Digit",
    fields: [
      { key: "single_digit_a", label: "A" },
      { key: "single_digit_b", label: "B" },
      { key: "single_digit_c", label: "C" },
    ],
  },
  {
    title: "Double Digit",
    fields: [
      { key: "double_digit_ab", label: "AB" },
      { key: "double_digit_bc", label: "BC" },
      { key: "double_digit_ac", label: "AC" },
    ],
  },
  {
    title: "Triple Digit",
    fields: [
      { key: "triple_digit_super", label: "SUPER" },
      { key: "triple_digit_box", label: "BOX" },
    ],
  },
];

const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

export default function DrawSubTypeLimitsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const drawId = String(id);
  const drawName = name || `Draw #${drawId}`;

  const {
    data: config,
    isLoading,
    isError,
    refetch,
  } = useQuery<SubTypeLimits>({
    queryKey: ["draw-subtype-limits", drawId],
    queryFn: () =>
      api.get(`/draw/${drawId}/subtype-limits/`).then((r) => r.data),
    retry: false,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      const formData: Record<string, string> = {};
      ALL_FIELDS.forEach(({ key }) => {
        formData[key] = config[key]?.toString() || "0";
      });
      setForm(formData);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SubTypeLimits>) =>
      api.put(`/draw/${drawId}/subtype-limits/`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["draw-subtype-limits", drawId],
      });
      Alert.alert("Success", "Sub-type limits updated.");
    },
    onError: (err: any) => {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : "Failed to update limits.";
      Alert.alert("Error", msg);
    },
  });

  const handleSave = () => {
    const data: any = {};
    for (const { key } of ALL_FIELDS) {
      data[key] = Number(form[key] || 0);
    }
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-500">Loading limits...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center px-8 bg-white">
        <Text className="text-red-600 text-xl font-bold mb-4">
          Failed to load limits
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
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <MoveLeft size={22} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">
            Sub-Type Limits
          </Text>
          <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center">
            <Shield size={18} color="#4F46E5" />
          </View>
        </View>

        <View className="flex-row items-center mt-4">
          <View className="w-9 h-9 rounded-lg bg-indigo-50 items-center justify-center mr-3">
            <Ticket size={16} color="#4F46E5" />
          </View>
          <Text
            className="text-gray-800 font-bold text-base flex-1"
            numberOfLines={1}
          >
            {drawName}
          </Text>
        </View>
      </View>

      <KeyboardAvoider className="flex-1">
        <ScrollView
          className="flex-1 px-5 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {/* Info */}
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <Text className="text-amber-800 text-xs leading-5">
              Set the maximum total booking count per sub-type per draw session
              across all vendors. 0 = unlimited.
            </Text>
          </View>

          {FIELD_GROUPS.map((group) => (
            <View
              key={group.title}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
            >
              <Text className="text-lg font-bold text-gray-800 mb-4">
                {group.title}
              </Text>

              {group.fields.map(({ key, label }) => {
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
          ))}

          {/* Save Button */}
          <TouchableOpacity
            className={`bg-indigo-600 py-4 rounded-xl shadow-lg mt-2 flex-row items-center justify-center ${
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
                  Save Limits
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoider>
    </View>
  );
}
