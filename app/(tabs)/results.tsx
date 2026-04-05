import DrawResultForm from "@/components/draw-result-form";
import useDraw, { Draw, DrawType } from "@/hooks/use-draw";
import api from "@/utils/axios";
import { formatDateDDMMYYYY } from "@/utils/date";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Calendar,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Share2,
  X,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";

const PRIZE_COLOURS = [
  "bg-red-200/60",
  "bg-blue-200/60",
  "bg-amber-200/60",
  "bg-green-200/60",
  "bg-fuchsia-200/60",
];

export type DrawResult = {
  id: number;
  draw: string;
  draw_session: number;
  vendor: number | null;
  vendor_name: string | null;
  published_at: string;
  first_prize: string;
  second_prize: string;
  third_prize: string;
  fourth_prize: string;
  fifth_prize: string;
  draw_time: string;
  complementary_prizes: string[];
  kl_first_prize_numbers?: string[];
  kl_second_prize_numbers?: string[];
  kl_third_prize_numbers?: string[];
  kl_fourth_prize_numbers?: string[];
  kl_fifth_prize_numbers?: string[];
  kl_sixth_prize_numbers?: string[];
};

function isValidNumber(str: string, digits: number) {
  return new RegExp(`^\\d{${digits}}$`).test(str);
}

const KERALA_PRIZE_FIELDS = [
  { key: "kl_first_prize_numbers", label: "1st Prize" },
  { key: "kl_second_prize_numbers", label: "2nd Prize" },
  { key: "kl_third_prize_numbers", label: "3rd Prize" },
  { key: "kl_fourth_prize_numbers", label: "4th Prize" },
  { key: "kl_fifth_prize_numbers", label: "5th Prize" },
  { key: "kl_sixth_prize_numbers", label: "6th Prize" },
] as const;

function validateDrawResultFields(
  data: any,
  drawType?: string
) {
  if (drawType === "kerala") {
    // Kerala: validate each kl_ array field - numbers must be exactly 4 digits
    let hasAny = false;
    for (const { key, label } of KERALA_PRIZE_FIELDS) {
      const numbers: string[] = data[key] || [];
      if (numbers.length > 0) hasAny = true;
      for (let i = 0; i < numbers.length; i++) {
        if (!isValidNumber(numbers[i], 4)) {
          return `${label} #${i + 1} must be exactly 4 digits.`;
        }
      }
    }
    if (!hasAny) {
      return "Please enter at least one winning number.";
    }
    return null;
  }

  if (drawType === "tamil_nadu") {
    if (!data.first_prize || !isValidNumber(data.first_prize, 3)) {
      return "Please enter a valid 3-digit number for First Prize.";
    }
    return null;
  }

  // Default
  const mainPrizes = [
    data.first_prize,
    data.second_prize,
    data.third_prize,
    data.fourth_prize,
    data.fifth_prize,
  ];
  const mainPrizeEntered = mainPrizes.some(
    (prize: string) => !!prize && String(prize).trim() !== ""
  );
  const complementaryEntered =
    Array.isArray(data.complementary_prizes) &&
    data.complementary_prizes.some(
      (val: string) => !!val && String(val).trim() !== ""
    );

  if (!mainPrizeEntered && !complementaryEntered) {
    return "Please enter at least one main prize or one complementary prize.";
  }

  if (mainPrizeEntered) {
    const labels = ["First", "Second", "Third", "Fourth", "Fifth"];
    for (let i = 0; i < mainPrizes.length; i++) {
      if (!mainPrizes[i] || !isValidNumber(mainPrizes[i]!, 3)) {
        return `Please enter a valid 3-digit number for ${labels[i]} Prize.`;
      }
    }
  }

  if (complementaryEntered) {
    if (
      !Array.isArray(data.complementary_prizes) ||
      data.complementary_prizes.length === 0
    ) {
      return "Please enter all complementary prizes.";
    }
    for (let i = 0; i < data.complementary_prizes.length; i++) {
      const val = data.complementary_prizes[i];
      if (!val || !isValidNumber(val, 3)) {
        return `Complementary Prize ${i + 1} must be a valid 3-digit number.`;
      }
    }
  }

  return null;
}

function canEditResult(published_at: string | undefined | null) {
  if (!published_at) return false;
  const publishedDate = new Date(published_at);
  const now = new Date();
  return (
    publishedDate.getFullYear() === now.getFullYear() &&
    publishedDate.getMonth() === now.getMonth() &&
    publishedDate.getDate() === now.getDate()
  );
}

function formatDrawTime(time: string | undefined | null): string {
  if (!time) return "";
  const match = time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  }
  return time;
}

function formatDateServer(date: Date | null): string | null {
  if (!date) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getPublisherLabel(result: DrawResult) {
  if (result.vendor === null) return "Published by Admin";
  return `Published by ${result.vendor_name}`;
}

export default function ResultsScreen() {
  const {
    createDrawResult,
    updateDrawResult,
    createDrawResultIsPending,
    updateDrawResultIsPending,
  } = useDraw();

  const [selectedDraw, setSelectedDraw] = useState<
    (Draw & { id: number }) | null
  >(null);
  const [showDrawPicker, setShowDrawPicker] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [formData, setFormData] = useState<Partial<DrawResult> | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);

  const resultViewRef = useRef<any>(null);

  const drawType: DrawType = (selectedDraw?.type as DrawType) || "default";
  const isTamilNadu = drawType === "tamil_nadu";
  const filterDateString = formatDateServer(filterDate);

  // Fetch all draws
  const { data: allDraws = [] } = useQuery<(Draw & { id: number })[]>({
    queryKey: ["draws"],
    queryFn: () => api.get("/draw/").then((r) => r.data),
  });

  // Fetch results for selected draw + date
  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useQuery<DrawResult[] | { skipped: boolean } | null>({
    queryKey: [
      "draw-result",
      selectedDraw?.id,
      filterDateString,
    ],
    queryFn: async () => {
      const res = await api.get(
        `/draw-result/result/?draw_session__draw__id=${selectedDraw?.id}&draw_session__session_date=${filterDateString ?? ""}`
      );
      return res.data;
    },
    enabled: !!selectedDraw?.id,
  });

  const isSkipped =
    !!rawData &&
    typeof rawData === "object" &&
    !Array.isArray(rawData) &&
    (rawData as any).skipped === true;

  // Super admin sees array of results
  const results: DrawResult[] =
    !isSkipped && Array.isArray(rawData) ? rawData : [];
  const data = results[0]; // Primary result for actions

  const skipDrawSessionMutation = useMutation({
    mutationFn: (payload: { draw_id: number; session_date: string }) =>
      api.post("/draw-result/skip-draw-session/", payload),
    onError: (error: any) => {
      let errorMessage = "Failed to skip draw session.";
      if (error?.message?.message) errorMessage = error.message.message;
      else if (error?.detail) errorMessage = error.detail;
      else if (typeof error?.message === "string")
        errorMessage = error.message;
      Alert.alert("Error", errorMessage);
    },
  });

  const handleShare = async () => {
    if (!data || !resultViewRef.current) return;
    try {
      const uri = await captureRef(resultViewRef, {
        format: "png",
        quality: 1,
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "Sharing is not available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch (e) {
      Alert.alert("Error", "Failed to share the result.");
    }
  };

  const handleFormSubmit = async (resultData: any) => {
    setFormError(null);
    const validationError = validateDrawResultFields(resultData, drawType);
    if (validationError) {
      setFormError(validationError);
      Alert.alert("Validation Error", validationError);
      return;
    }

    setLoading(true);

    // Kerala: submit kl_ fields directly
    if (drawType === "kerala") {
      try {
        if (data && data.id) {
          await updateDrawResult.mutateAsync({ id: data.id, ...resultData });
        } else {
          await createDrawResult.mutateAsync({
            ...resultData,
            draw_session: selectedDraw!.id,
          });
        }
        setMode("view");
        setFormData(null);
        refetch();
      } catch (err: any) {
        const msg =
          typeof err === "string" ? err : err?.message || "Failed to save result.";
        Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
        setTimeout(() => setFormError(""), 3000);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isTamilNadu) {
      const submitData = { first_prize: resultData.first_prize };
      try {
        if (data && data.id) {
          await updateDrawResult.mutateAsync({ id: data.id, ...submitData });
        } else {
          await createDrawResult.mutateAsync({
            ...submitData,
            draw_session: selectedDraw!.id,
          });
        }
        setMode("view");
        setFormData(null);
        refetch();
      } catch (err: any) {
        const msg =
          typeof err === "string" ? err : err?.message || "Failed to save result.";
        setFormError(msg);
        Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
        setTimeout(() => setFormError(""), 3000);
      } finally {
        setLoading(false);
      }
      return;
    }

    let submitData = { ...resultData };
    if (
      Array.isArray(submitData.complementary_prizes) &&
      submitData.complementary_prizes.every((item: any) => item === "")
    ) {
      delete submitData.complementary_prizes;
    }

    try {
      if (data && data.id) {
        await updateDrawResult.mutateAsync({ id: data.id, ...submitData });
      } else {
        await createDrawResult.mutateAsync({
          ...submitData,
          draw_session: selectedDraw!.id,
        });
      }
      setMode("view");
      setFormData(null);
      refetch();
    } catch (err: any) {
      if (
        Array.isArray(err) &&
        err[0] === "No draw session found for today."
      ) {
        Alert.alert(
          "No Draw Session",
          "No draw session found for the selected date."
        );
      } else {
        const msg =
          typeof err === "string" ? err : err?.message || "Failed to save result.";
        Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      setTimeout(() => setFormError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipResult = async () => {
    if (!selectedDraw?.id || !filterDateString) return;
    setSkipLoading(true);
    Alert.alert(
      "Skip Result",
      "Are you sure you want to skip the result for this draw and date? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setSkipLoading(false),
        },
        {
          text: "Skip",
          style: "destructive",
          onPress: async () => {
            try {
              await skipDrawSessionMutation.mutateAsync({
                draw_id: selectedDraw.id,
                session_date: filterDateString,
              });
              refetch();
              Alert.alert("Skipped", "Result has been marked as skipped.");
            } finally {
              setSkipLoading(false);
            }
          },
        },
      ]
    );
  };

  // --- No draw selected ---
  if (!selectedDraw) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white border-b border-gray-200 px-6 pt-16 pb-5">
          <Text className="text-2xl font-bold text-gray-900">Results</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <AlertCircle size={48} color="#a1a1aa" />
          <Text className="mt-3 text-lg text-gray-500 font-semibold text-center">
            Select a draw to view or publish results
          </Text>
          <TouchableOpacity
            onPress={() => setShowDrawPicker(true)}
            className="mt-6 bg-indigo-600 px-8 py-3 rounded-xl"
          >
            <Text className="text-white font-bold text-base">Select Draw</Text>
          </TouchableOpacity>
        </View>

        {/* Draw Picker Modal */}
        <DrawPickerModal
          visible={showDrawPicker}
          draws={allDraws}
          onSelect={(draw) => {
            setSelectedDraw(draw);
            setShowDrawPicker(false);
          }}
          onClose={() => setShowDrawPicker(false)}
        />
      </View>
    );
  }

  // --- Skipped state ---
  if (isSkipped) {
    return (
      <ScrollView className="flex-1 bg-gray-50">
        <ResultHeader
          selectedDraw={selectedDraw}
          filterDate={filterDate}
          onDatePress={() => setShowDatePicker(true)}
          onDrawPress={() => setShowDrawPicker(true)}
        />
        <View className="flex-1 items-center justify-center bg-gray-50 py-16">
          <Ban size={48} color="#9ca3af" />
          <Text className="mt-4 text-lg font-semibold text-gray-700 text-center">
            This result has been skipped for the selected date.
          </Text>
        </View>
        {showDatePicker && (
          <DateTimePicker
            mode="date"
            value={filterDate}
            onChange={(_e, d) => {
              if (d) setFilterDate(d);
              setShowDatePicker(false);
            }}
          />
        )}
        <DrawPickerModal
          visible={showDrawPicker}
          draws={allDraws}
          onSelect={(draw) => {
            setSelectedDraw(draw);
            setShowDrawPicker(false);
          }}
          onClose={() => setShowDrawPicker(false)}
        />
      </ScrollView>
    );
  }

  // --- Edit mode ---
  if (mode === "edit") {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="flex-row items-center bg-indigo-700 px-4 pt-14 pb-3 justify-between">
          <Text className="text-lg font-bold text-white">
            {data && data.id ? "Edit Result" : "Publish Result"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setMode("view");
              setFormData(null);
              setFormError(null);
            }}
          >
            <X size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <DrawResultForm
          initialData={formData || undefined}
          onSubmit={handleFormSubmit}
          loading={loading}
          drawType={drawType}
        />
      </View>
    );
  }

  // --- View mode ---
  const canAdd = !data && !isSkipped;
  const canEditIcon = data && canEditResult(data.published_at) && !isSkipped;
  const canSkip =
    !data && !isLoading && !!selectedDraw?.id && !!filterDateString && !isSkipped;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <SafeAreaView edges={["bottom"]}>
        <ResultHeader
          selectedDraw={selectedDraw}
          filterDate={filterDate}
          onDatePress={() => setShowDatePicker(true)}
          onDrawPress={() => setShowDrawPicker(true)}
        />

        {/* Action buttons */}
        <View className="px-4 flex-row justify-end gap-2 mt-2">
          {canAdd && (
            <TouchableOpacity
              onPress={() => {
                setFormData({ complementary_prizes: [] });
                setMode("edit");
                setFormError(null);
              }}
              className="w-12 h-12 rounded-full bg-indigo-600 items-center justify-center shadow-lg"
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {canEditIcon && (
            <TouchableOpacity
              onPress={() => {
                setFormData(data || { complementary_prizes: [] });
                setMode("edit");
                setFormError(null);
              }}
              className="w-12 h-12 rounded-full bg-yellow-500 items-center justify-center shadow-lg"
            >
              <Pencil size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Loading */}
        {isLoading && (
          <View className="items-center justify-center py-8">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="mt-2 text-base text-gray-500">Loading...</Text>
          </View>
        )}

        {/* No result */}
        {!isLoading && !data && (
          <View className="items-center justify-center py-8">
            <AlertTriangle size={40} color="#f59e42" />
            <Text className="mt-2 text-base font-semibold text-yellow-700">
              No result published yet for this draw
            </Text>
            {canSkip && (
              <TouchableOpacity
                onPress={handleSkipResult}
                className="mt-4 bg-gray-400 px-6 py-3 rounded-full"
                disabled={skipLoading}
                style={{ opacity: skipLoading ? 0.6 : 1 }}
              >
                {skipLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Skip this result
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results list - super admin sees all */}
        {!isLoading &&
          results.map((result, index) => (
            <ViewShot
              key={result.id}
              ref={index === 0 ? resultViewRef : undefined}
              options={{ format: "png", quality: 1 }}
            >
              <View className="bg-white mx-4 mt-4 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Publisher label */}
                <View
                  className={`px-4 py-2 ${
                    result.vendor === null ? "bg-indigo-50" : "bg-amber-50"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      result.vendor === null
                        ? "text-indigo-600"
                        : "text-amber-600"
                    }`}
                  >
                    {getPublisherLabel(result)}
                  </Text>
                </View>

                {/* Draw time row */}
                <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-2">
                  <View className="flex-row items-center">
                    <Clock size={18} color="#2563eb" />
                    <Text className="ml-2 text-sm font-semibold text-gray-700">
                      Draw Time:
                    </Text>
                    <Text className="ml-2 text-lg font-extrabold text-gray-900">
                      {formatDrawTime(result.draw_time)}
                    </Text>
                  </View>
                  {index === 0 && (
                    <TouchableOpacity
                      onPress={handleShare}
                      className="flex-row items-center bg-indigo-600 rounded-lg px-3 py-1.5 gap-1"
                    >
                      <Share2 size={14} color="#fff" />
                      <Text className="text-white font-semibold text-xs">
                        Share
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Prize rows - Kerala */}
                {drawType === "kerala" && (
                  <View>
                    {KERALA_PRIZE_FIELDS.map(({ key, label }, idx) => {
                      const numbers =
                        (result as any)[key] as string[] | undefined;
                      return (
                        <View
                          key={key}
                          className={`${PRIZE_COLOURS[idx]} border-b border-gray-200`}
                        >
                          <View className="flex-row items-center px-3 py-2 border-b border-gray-100">
                            <Text className="w-8 text-[11px] font-medium text-gray-600">
                              {idx + 1}.
                            </Text>
                            <Text className="text-[13px] font-bold text-gray-800">
                              {label}
                            </Text>
                          </View>
                          <View className="flex-row flex-wrap px-3 py-2 gap-2">
                            {numbers && numbers.length > 0 ? (
                              numbers.map((num, nIdx) => (
                                <View
                                  key={`${key}-${nIdx}`}
                                  className="bg-white border border-gray-200 rounded-md px-3 py-1"
                                >
                                  <Text className="text-[15px] font-mono font-bold text-gray-900">
                                    {num}
                                  </Text>
                                </View>
                              ))
                            ) : (
                              <Text className="text-gray-400 text-xs italic">
                                No numbers
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Prize rows - Default / Tamil Nadu */}
                {drawType !== "kerala" &&
                  (isTamilNadu
                    ? [{ label: "First Prize", value: result.first_prize }]
                    : [
                        { label: "First Prize", value: result.first_prize },
                        { label: "Second Prize", value: result.second_prize },
                        { label: "Third Prize", value: result.third_prize },
                        { label: "Fourth Prize", value: result.fourth_prize },
                        { label: "Fifth Prize", value: result.fifth_prize },
                      ]
                  ).map((row, idx) => (
                    <View
                      key={row.label}
                      className={`flex-row ${PRIZE_COLOURS[idx]} border-b border-gray-200`}
                    >
                      <Text className="w-10 text-center py-2 text-[11px] font-medium border-r border-gray-200 bg-white/20">
                        {idx + 1}
                      </Text>
                      <Text className="flex-1 py-2 text-[15px] font-bold text-center text-gray-800">
                        {row.label}
                      </Text>
                      <Text className="w-20 py-2 text-[16px] font-mono font-bold text-center border-l border-gray-200">
                        {row.value}
                      </Text>
                    </View>
                  ))}

                {/* Complementary grid - Default only */}
                {drawType === "default" &&
                  result.complementary_prizes?.length > 0 && (
                    <View className="border-t border-gray-200">
                      <Text className="text-center text-xs font-semibold text-gray-500 py-1.5">
                        Complementary Prizes
                      </Text>
                      <View className="flex-row">
                        {Array.from({ length: 3 }).map((_, colIdx) => (
                          <View key={`col-${colIdx}`} className="flex-1">
                            {Array.from({
                              length: Math.ceil(
                                result.complementary_prizes.length / 3
                              ),
                            }).map((_, rowIdx) => {
                              const idx =
                                rowIdx +
                                colIdx *
                                  Math.ceil(
                                    result.complementary_prizes.length / 3
                                  );
                              const prize =
                                result.complementary_prizes[idx];
                              return (
                                <Text
                                  key={`cp-${colIdx}-${rowIdx}`}
                                  className={`py-1.5 text-center text-[14px] font-mono font-bold border-b border-gray-100 ${
                                    colIdx < 2
                                      ? "border-r border-gray-100"
                                      : ""
                                  }`}
                                >
                                  {prize || ""}
                                </Text>
                              );
                            })}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
              </View>
            </ViewShot>
          ))}

        <View className="h-8" />
      </SafeAreaView>

      {/* Date picker */}
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={filterDate}
          onChange={(_e, d) => {
            if (d) setFilterDate(d);
            setShowDatePicker(false);
          }}
        />
      )}

      {/* Draw picker */}
      <DrawPickerModal
        visible={showDrawPicker}
        draws={allDraws}
        onSelect={(draw) => {
          setSelectedDraw(draw);
          setShowDrawPicker(false);
        }}
        onClose={() => setShowDrawPicker(false)}
      />
    </ScrollView>
  );
}

// --- Header component ---
function ResultHeader({
  selectedDraw,
  filterDate,
  onDatePress,
  onDrawPress,
}: {
  selectedDraw: Draw & { id: number };
  filterDate: Date;
  onDatePress: () => void;
  onDrawPress: () => void;
}) {
  const typeLabel =
    selectedDraw.type === "kerala"
      ? "Kerala"
      : selectedDraw.type === "tamil_nadu"
      ? "Tamil Nadu"
      : "";

  return (
    <View className="bg-white border-b border-gray-200 px-4 pt-16 pb-4">
      <Text className="text-2xl font-bold text-gray-900 mb-3">Results</Text>

      <View className="flex-row gap-3">
        {/* Draw selector */}
        <TouchableOpacity
          onPress={onDrawPress}
          className="flex-1 flex-row items-center justify-between border border-gray-300 rounded-xl px-4 py-2.5 bg-white"
        >
          <View className="flex-1 mr-2">
            <Text
              className="text-sm font-semibold text-gray-800"
              numberOfLines={1}
            >
              {selectedDraw.name}
            </Text>
            {typeLabel ? (
              <Text className="text-xs text-indigo-500 font-medium">
                {typeLabel}
              </Text>
            ) : null}
          </View>
          <ChevronDown size={18} color="#6B7280" />
        </TouchableOpacity>

        {/* Date selector */}
        <TouchableOpacity
          onPress={onDatePress}
          className="flex-row items-center border border-gray-300 rounded-xl px-4 py-2.5 bg-white"
        >
          <Text className="text-sm font-medium text-gray-800 mr-2">
            {formatDateDDMMYYYY(filterDate)}
          </Text>
          <Calendar size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Draw Picker Modal ---
function DrawPickerModal({
  visible,
  draws,
  onSelect,
  onClose,
}: {
  visible: boolean;
  draws: (Draw & { id: number })[];
  onSelect: (draw: Draw & { id: number }) => void;
  onClose: () => void;
}) {
  const formatType = (type?: string) => {
    if (type === "kerala") return "Kerala";
    if (type === "tamil_nadu") return "Tamil Nadu";
    return "";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[70%]">
          <View className="flex-row items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">
              Select Draw
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={draws}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onSelect(item)}
                className="flex-row items-center px-6 py-4 border-b border-gray-50"
                activeOpacity={0.6}
              >
                <View
                  className="w-3 h-3 rounded-full mr-3"
                  style={{
                    backgroundColor:
                      item.color_theme || "#6366f1",
                  }}
                />
                <View className="flex-1">
                  <Text className="text-gray-800 font-semibold text-sm">
                    {item.name}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    Draw: {item.draw_time}
                    {formatType(item.type)
                      ? ` - ${formatType(item.type)}`
                      : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="p-8 items-center">
                <Text className="text-gray-400 text-sm">
                  No draws available
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}
