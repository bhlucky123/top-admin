import { Clipboard, Minus, Plus } from "lucide-react-native";
import { useRef, useState } from "react";
import * as RNClipboard from "react-native";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PrizeKey =
  | "first_prize"
  | "second_prize"
  | "third_prize"
  | "fourth_prize"
  | "fifth_prize";

const PRIZE_LABELS: Record<PrizeKey, string> = {
  first_prize: "First Prize",
  second_prize: "Second Prize",
  third_prize: "Third Prize",
  fourth_prize: "Fourth Prize",
  fifth_prize: "Fifth Prize",
};

const PRIZE_COLOURS = [
  "bg-red-200/60",
  "bg-blue-200/60",
  "bg-amber-200/60",
  "bg-green-200/60",
  "bg-fuchsia-200/60",
  "bg-cyan-200/60",
];

type KeralaField =
  | "kl_first_prize_numbers"
  | "kl_second_prize_numbers"
  | "kl_third_prize_numbers"
  | "kl_fourth_prize_numbers"
  | "kl_fifth_prize_numbers"
  | "kl_sixth_prize_numbers";

const KERALA_FIELDS: { key: KeralaField; label: string }[] = [
  { key: "kl_first_prize_numbers", label: "1st Prize Numbers" },
  { key: "kl_second_prize_numbers", label: "2nd Prize Numbers" },
  { key: "kl_third_prize_numbers", label: "3rd Prize Numbers" },
  { key: "kl_fourth_prize_numbers", label: "4th Prize Numbers" },
  { key: "kl_fifth_prize_numbers", label: "5th Prize Numbers" },
  { key: "kl_sixth_prize_numbers", label: "6th Prize Numbers" },
];

type Props = {
  onSubmit: (data: any) => void;
  initialData?: any;
  loading: boolean;
  drawType?: "default" | "kerala" | "tamil_nadu";
};

const DrawResultForm = ({
  onSubmit,
  initialData,
  loading,
  drawType = "default",
}: Props) => {
  const isTamilNadu = drawType === "tamil_nadu";
  const isKerala = drawType === "kerala";
  const maxDigits = isKerala ? 4 : 3;

  // Default/TN form state
  const [form, setForm] = useState({
    first_prize: initialData?.first_prize || "",
    second_prize: initialData?.second_prize || "",
    third_prize: initialData?.third_prize || "",
    fourth_prize: initialData?.fourth_prize || "",
    fifth_prize: initialData?.fifth_prize || "",
    complementary_prizes: (() => {
      let prizes = initialData?.complementary_prizes ?? [];
      if (!Array.isArray(prizes)) prizes = [];
      if (prizes.length < 30) {
        return [...prizes, ...Array(30 - prizes.length).fill("")];
      } else if (prizes.length > 30) {
        return prizes.slice(0, 30);
      }
      return prizes;
    })(),
  });

  // Kerala form state - 6 dynamic arrays
  const [keralaForm, setKeralaForm] = useState<Record<KeralaField, string[]>>(
    () => {
      const state: Record<string, string[]> = {};
      for (const { key } of KERALA_FIELDS) {
        const existing = initialData?.[key];
        state[key] =
          Array.isArray(existing) && existing.length > 0
            ? [...existing]
            : [""];
      }
      return state as Record<KeralaField, string[]>;
    }
  );

  const mainPrizeRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const complementaryRefs = Array.from({ length: 30 }, () =>
    useRef<TextInput>(null)
  );

  const handleInput = (key: PrizeKey, value: string, idx: number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (value.length === maxDigits && idx < mainPrizeRefs.length - 1) {
      setTimeout(() => {
        mainPrizeRefs[idx + 1].current?.focus();
      }, 10);
    }
  };

  const handleComplementaryChange = (index: number, value: string) => {
    const updated = [...form.complementary_prizes];
    updated[index] = value;
    setForm((prev) => ({ ...prev, complementary_prizes: updated }));
    if (value.length === maxDigits && index < complementaryRefs.length - 1) {
      setTimeout(() => {
        complementaryRefs[index + 1].current?.focus();
      }, 10);
    }
  };

  const handlePasteComplementary = async () => {
    try {
      // @ts-ignore
      const clipboardContent = await RNClipboard.Clipboard.getString();
      let prizes = clipboardContent
        .replace(/[^0-9\s,]/g, "")
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((x: string) => x.trim())
        .filter((x: string) => x.length > 0);

      let expanded: string[] = [];
      for (const p of prizes) {
        if (p.length === maxDigits) {
          expanded.push(p);
        } else if (p.length > maxDigits) {
          for (let i = 0; i < p.length; i += maxDigits) {
            const chunk = p.slice(i, i + maxDigits);
            if (chunk.length === maxDigits) expanded.push(chunk);
          }
        }
      }

      expanded.sort((a, b) => parseInt(a) - parseInt(b));
      expanded = expanded.slice(0, 30);

      if (expanded.length < 30) {
        Alert.alert(
          "Not enough prizes",
          `Found only ${expanded.length} prizes in clipboard. 30 required.`
        );
        while (expanded.length < 30) expanded.push("");
      }

      setForm((prev) => ({ ...prev, complementary_prizes: expanded }));

      setTimeout(() => {
        const firstEmpty = expanded.findIndex((v) => !v);
        if (firstEmpty !== -1) {
          complementaryRefs[firstEmpty].current?.focus();
        }
      }, 100);
    } catch (err) {
      Alert.alert("Paste Error", "Failed to read from clipboard.");
    }
  };

  // Kerala handlers
  const handleKeralaChange = (
    field: KeralaField,
    index: number,
    value: string
  ) => {
    setKeralaForm((prev) => {
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  const addKeralaRow = (field: KeralaField) => {
    setKeralaForm((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeKeralaRow = (field: KeralaField, index: number) => {
    setKeralaForm((prev) => {
      const updated = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: updated.length > 0 ? updated : [""] };
    });
  };

  const handleSubmit = () => {
    if (loading) return;
    if (isKerala) {
      // Build Kerala payload - filter out empty strings
      const payload: Record<string, string[]> = {};
      for (const { key } of KERALA_FIELDS) {
        payload[key] = keralaForm[key].filter(
          (v) => v.trim().length > 0
        );
      }
      onSubmit(payload);
    } else {
      onSubmit(form);
    }
  };

  // --- Kerala form ---
  if (isKerala) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#f9fafb" }}
        keyboardVerticalOffset={80}
      >
        <View className="flex-1 bg-gray-50">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {KERALA_FIELDS.map(({ key, label }, groupIdx) => (
              <View key={key} className="mx-4 mt-5">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View
                      className={`w-6 h-6 rounded-md items-center justify-center mr-2 ${PRIZE_COLOURS[groupIdx]}`}
                    >
                      <Text className="text-[10px] font-bold text-gray-700">
                        {groupIdx + 1}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-gray-800">
                      {label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => addKeralaRow(key)}
                    className="flex-row items-center bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Plus size={14} color="#4F46E5" />
                    <Text className="ml-1 text-indigo-600 text-xs font-semibold">
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  {keralaForm[key].map((value, idx) => (
                    <View
                      key={`${key}-${idx}`}
                      className={`flex-row items-center px-3 py-2 ${
                        idx < keralaForm[key].length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >
                      <Text className="text-xs text-gray-400 font-medium w-6">
                        {idx + 1}.
                      </Text>
                      <TextInput
                        className="flex-1 text-center text-[14px] font-mono font-bold text-gray-900 bg-gray-50 rounded-md border border-gray-200 px-3 py-1.5 mx-2"
                        keyboardType="numeric"
                        placeholder="e.g. 1234"
                        value={value}
                        onChangeText={(text) =>
                          handleKeralaChange(key, idx, text)
                        }
                        maxLength={4}
                        placeholderTextColor="#9ca3af"
                      />
                      <TouchableOpacity
                        onPress={() => removeKeralaRow(key, idx)}
                        className="w-7 h-7 rounded-md bg-red-50 items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Minus size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Submit button */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "white",
              paddingHorizontal: 16,
              paddingBottom: 34,
              paddingTop: 8,
              borderTopWidth: 1,
              borderColor: "#e5e7eb",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 8,
            }}
          >
            <TouchableOpacity
              className="bg-indigo-600 px-4 py-3 rounded-xl items-center justify-center shadow-lg"
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text className="text-white font-bold text-center text-base tracking-wide">
                {loading ? "Submitting..." : "Publish Result"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Default / Tamil Nadu form ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      keyboardVerticalOffset={80}
    >
      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Prize table style inputs */}
          <View className="mx-4 mt-6 border border-gray-300 rounded-lg overflow-hidden">
            {(Object.keys(PRIZE_LABELS) as PrizeKey[])
              .filter((_, idx) => !isTamilNadu || idx === 0)
              .map((key, idx) => (
                <View
                  key={key}
                  className={`flex-row items-center ${PRIZE_COLOURS[idx]} border-b border-gray-300`}
                >
                  <Text className="w-10 text-center py-1.5 text-[11px] font-medium border-r border-gray-300 bg-white/20">
                    {idx + 1}
                  </Text>
                  <Text className="flex-1 py-1.5 text-[12px] font-bold text-center text-gray-800">
                    {PRIZE_LABELS[key]}
                  </Text>
                  <View className="w-24 border-l border-gray-300 px-2 py-1.5">
                    <TextInput
                      ref={mainPrizeRefs[idx]}
                      className="text-center text-[13px] font-mono font-bold text-gray-900 bg-white rounded-md border border-gray-300 px-2 py-1"
                      keyboardType="numeric"
                      placeholder="e.g. 123"
                      value={
                        typeof form[key] === "string" ? form[key] : ""
                      }
                      onChangeText={(text) => handleInput(key, text, idx)}
                      maxLength={3}
                      returnKeyType={
                        idx < mainPrizeRefs.length - 1 ? "next" : "done"
                      }
                      blurOnSubmit={idx === mainPrizeRefs.length - 1}
                      onSubmitEditing={() => {
                        if (idx < mainPrizeRefs.length - 1) {
                          mainPrizeRefs[idx + 1].current?.focus();
                        }
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              ))}
          </View>

          {/* Complementary grid - hidden for Tamil Nadu */}
          {!isTamilNadu && (
            <>
              <View className="mx-4 flex-row items-center mt-8 mb-2">
                <Text className="flex-1 text-base font-semibold text-gray-700 tracking-wide">
                  Complementary Prizes
                </Text>
                <TouchableOpacity
                  onPress={handlePasteComplementary}
                  className="ml-2 flex-row items-center bg-green-100 border border-green-400 px-3 py-1.5 rounded-lg"
                  activeOpacity={0.8}
                >
                  <Clipboard color="#16a34a" size={18} />
                  <Text className="ml-1 text-green-700 text-xs font-semibold">
                    Paste
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="mx-4 border border-gray-300 rounded-lg overflow-hidden mb-10">
                <View className="flex-row border-b border-gray-200">
                  {Array.from({ length: 3 }).map((_, colIdx) => (
                    <View key={`col-${colIdx}`} className="flex-1">
                      {Array.from({
                        length: Math.ceil(
                          form.complementary_prizes.length / 3
                        ),
                      }).map((_, rowIdx) => {
                        const idx =
                          rowIdx +
                          colIdx *
                            Math.ceil(
                              form.complementary_prizes.length / 3
                            );
                        const val =
                          form.complementary_prizes[idx] || "";
                        return (
                          <View
                            key={`prize-${colIdx}-${rowIdx}`}
                            className={`border-b border-gray-200 ${
                              colIdx < 2
                                ? "border-r border-gray-200"
                                : ""
                            } px-2 py-2 bg-white`}
                            style={{ minWidth: 0 }}
                          >
                            {idx <
                            form.complementary_prizes.length ? (
                              <TextInput
                                ref={complementaryRefs[idx]}
                                className="text-center text-[13px] font-mono font-bold text-gray-900 bg-gray-50 rounded-md border border-gray-300 px-2 py-1"
                                keyboardType="numeric"
                                placeholder={`Prize ${idx + 1}`}
                                value={val}
                                onChangeText={(text) =>
                                  handleComplementaryChange(idx, text)
                                }
                                maxLength={3}
                                returnKeyType={
                                  idx < complementaryRefs.length - 1
                                    ? "next"
                                    : "done"
                                }
                                blurOnSubmit={
                                  idx ===
                                  complementaryRefs.length - 1
                                }
                                onSubmitEditing={() => {
                                  if (
                                    idx <
                                    complementaryRefs.length - 1
                                  ) {
                                    complementaryRefs[
                                      idx + 1
                                    ].current?.focus();
                                  }
                                }}
                                placeholderTextColor="#9ca3af"
                              />
                            ) : (
                              <View />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
        {/* Submit button */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "white",
            paddingHorizontal: 16,
            paddingBottom: 34,
            paddingTop: 8,
            borderTopWidth: 1,
            borderColor: "#e5e7eb",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 8,
          }}
        >
          <TouchableOpacity
            className="bg-indigo-600 px-4 py-3 rounded-xl items-center justify-center shadow-lg"
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text className="text-white font-bold text-center text-base tracking-wide">
              {loading ? "Submitting..." : "Publish Result"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default DrawResultForm;
