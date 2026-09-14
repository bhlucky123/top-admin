import KeyboardAvoider from "@/components/keyboard-avoider";
import useVendor, { Vendor } from "@/hooks/use-vendor";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

const fields = [
  ["monitoring_single_digit_a_count", "Single A"],
  ["monitoring_single_digit_b_count", "Single B"],
  ["monitoring_single_digit_c_count", "Single C"],
  ["monitoring_double_digit_ab_count", "Double AB"],
  ["monitoring_double_digit_bc_count", "Double BC"],
  ["monitoring_double_digit_ac_count", "Double AC"],
  ["monitoring_triple_digit_super_count", "Super"],
  ["monitoring_triple_digit_box_count", "Box"],
] as const;
type ThresholdKey = (typeof fields)[number][0];

export default function AllVendorThresholds({ onClose }: { onClose: () => void }) {
  const [inputs, setInputs] = useState<Partial<Record<ThresholdKey, string>>>({});
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { setAllVendorThresholds, isSettingThresholds } = useVendor();

  const save = () => {
    const payload: Partial<Record<ThresholdKey, number>> = {};
    for (const [key] of fields) {
      const value = inputs[key]?.trim();
      if (!value) continue;
      const count = Number(value);
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(count) || count > 2147483647) {
        setError("Enter whole counts between 0 and 2147483647.");
        return;
      }
      payload[key] = count;
    }
    if (!Object.keys(payload).length) {
      setError("Enter at least one threshold.");
      return;
    }
    setError("");
    setAllVendorThresholds(payload, {
      onSuccess: ({ updated_count }) => {
        queryClient.setQueryData<Vendor[]>(["vendors"], (old) =>
          old?.map((vendor) => ({ ...vendor, ...payload }))
        );
        queryClient.invalidateQueries({ queryKey: ["vendors"] });
        queryClient.invalidateQueries({ queryKey: ["vendor"] });
        queryClient.invalidateQueries({ queryKey: ["monitoring-vendors"] });
        queryClient.invalidateQueries({ queryKey: ["extra-counts"] });
        onClose();
        Alert.alert("Thresholds updated", `Applied to ${updated_count} vendors.`);
      },
      onError: (err: any) => {
        setError(typeof err?.message === "string" ? err.message : "Failed to update thresholds. Please try again.");
      },
    });
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={() => !isSettingThresholds && onClose()}>
      <KeyboardAvoider className="flex-1">
        <View className="flex-1 justify-center bg-black/50 px-5 py-12">
          <View className="rounded-2xl bg-white p-5" style={{ maxHeight: "100%" }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="text-xl font-bold text-gray-900">Set thresholds for all vendors</Text>
              <Text className="mt-3 text-sm text-gray-600">
                Applies to every existing vendor, including inactive vendors, regardless of your search.
                Each vendor is monitored separately and keeps its monitoring On/Off setting.
              </Text>
              <Text className="mt-2 mb-4 text-sm text-gray-600">
                Leave a field blank to keep its current value for each vendor. Enter 0 to flag every booking in that category.
                You can still edit individual vendors afterward. New vendors keep their usual defaults.
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {fields.map(([key, label]) => (
                  <View key={key} className="mb-3" style={{ width: "48%" }}>
                    <Text className="mb-1 font-semibold text-gray-700">{label}</Text>
                    <TextInput
                      accessibilityLabel={`${label} threshold`}
                      className="rounded-xl border border-gray-200 px-3 py-3 text-gray-900"
                      keyboardType="number-pad"
                      placeholder="Keep current"
                      placeholderTextColor="#9CA3AF"
                      value={inputs[key] ?? ""}
                      onChangeText={(value) => setInputs((old) => ({ ...old, [key]: value }))}
                      editable={!isSettingThresholds}
                    />
                  </View>
                ))}
              </View>
              {!!error && <Text accessibilityRole="alert" className="mb-3 text-red-600">{error}</Text>}
              <TouchableOpacity onPress={save} disabled={isSettingThresholds} className={`rounded-xl bg-indigo-600 py-4 ${isSettingThresholds ? "opacity-60" : ""}`}>
                <Text className="text-center font-bold text-white">{isSettingThresholds ? "Applying..." : "Apply to all vendors"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} disabled={isSettingThresholds} className="mt-2 py-3">
                <Text className="text-center font-semibold text-gray-600">Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}
