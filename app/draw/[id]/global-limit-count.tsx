import api from "@/utils/axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MoveLeft, Shield, Ticket } from "lucide-react-native";
import { memo, useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { ALERT_TYPE, Dialog } from "react-native-alert-notification";

type NumberType = "single_digit" | "double_digit" | "triple_digit" | "four_digit";
type LimitType = "single_number" | "range";
type DrawType = "default" | "kerala" | "tamil_nadu";

type GlobalLimitCount = {
  id: number;
  draw: number;
  number: string | null;
  count: number;
  number_type: NumberType;
  limit_type: LimitType;
  range_start: string | null;
  range_end: string | null;
  config_level: string;
  dealer: number | null;
  vendor: number | null;
  window_start_time?: string | null;
  window_end_time?: string | null;
  is_active_now?: boolean;
};

const formatTime = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatWindowTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return new Date(1970, 0, 1, h, m).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const parseWindowTime = (time?: string | null) => {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

const windowLabel = (item: { window_start_time?: string | null; window_end_time?: string | null }) => {
  if (!item.window_start_time && !item.window_end_time) return "All day";
  const start = item.window_start_time ? formatWindowTime(item.window_start_time) : "00:00";
  const end = item.window_end_time ? formatWindowTime(item.window_end_time) : "end of day";
  return `${start} – ${end}`;
};

const DRAW_TYPE_NUMBER_TYPES: Record<DrawType, { value: NumberType; label: string }[]> = {
  default: [
    { value: "single_digit", label: "1 Digit" },
    { value: "double_digit", label: "2 Digit" },
    { value: "triple_digit", label: "3 Digit" },
  ],
  kerala: [
    { value: "four_digit", label: "4 Digit" },
  ],
  tamil_nadu: [
    { value: "triple_digit", label: "3 Digit" },
  ],
};

const getDigitsForNumberType = (nt: NumberType) => {
  switch (nt) {
    case "single_digit": return 1;
    case "double_digit": return 2;
    case "triple_digit": return 3;
    case "four_digit": return 4;
    default: return 1;
  }
};

const TYPE_LABEL: Record<string, string> = {
  single_digit: "1D",
  double_digit: "2D",
  triple_digit: "3D",
  four_digit: "4D",
};

const API_BASE = "/draw/limit-number-count";

const PillTabs = ({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}) => (
  <View className="flex-row flex-wrap gap-2">
    {options.map((opt) => {
      const active = selected === opt.value;
      return (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          disabled={disabled}
          activeOpacity={0.7}
          className={`flex-1 py-2.5 rounded-lg items-center ${active ? "bg-indigo-600" : "bg-white border border-gray-200"}`}
        >
          <Text className={`text-sm font-bold ${active ? "text-white" : "text-gray-600"}`}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const LimitRow = memo(
  ({
    item,
    onEditPress,
    onDeletePress,
  }: {
    item: GlobalLimitCount;
    onEditPress: (item: GlobalLimitCount) => void;
    onDeletePress: (item: GlobalLimitCount) => void;
  }) => {
    const displayNumber =
      item.limit_type === "range"
        ? `${item.range_start}-${item.range_end}`
        : item.number;

    const typeLabel = TYPE_LABEL[item.number_type] ?? "";

    return (
      <View
        className="border-b border-gray-100 bg-white px-3 py-3"
        style={{ minHeight: 52 }}
      >
      <View className="flex-row items-center">
        <View style={{ width: "30%" }}>
          <Text className="text-base font-bold text-gray-900">{displayNumber}</Text>
        </View>
        <View style={{ width: "15%" }}>
          <Text className="text-sm font-semibold text-gray-500">{typeLabel}</Text>
        </View>
        <View style={{ width: "20%" }}>
          <Text className="text-base font-bold text-green-600 text-center">
            {item.count}
          </Text>
        </View>
        <View style={{ width: "35%" }} className="flex-row justify-end gap-2">
          <TouchableOpacity
            className="bg-gray-100 px-3 py-2 rounded-lg"
            onPress={() => onEditPress(item)}
            activeOpacity={0.7}
          >
            <Text className="text-gray-700 font-semibold text-sm">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-50 px-2.5 py-2 rounded-lg"
            onPress={() => onDeletePress(item)}
            activeOpacity={0.7}
          >
            <Text className="text-red-500 font-bold text-base leading-none">
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex-row items-center mt-1">
        <View
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            item.is_active_now ? "bg-green-500" : "bg-gray-300"
          }`}
        />
        <Text className="text-xs text-gray-500">{windowLabel(item)}</Text>
      </View>
      </View>
    );
  }
);

export default function GlobalLimitCountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { id, name, type } = useLocalSearchParams<{ id: string; name?: string; type?: string }>();
  const drawId = Number(id);
  const drawName = name || `Draw #${id}`;
  const drawType = (type as DrawType) || "default";

  const numberTypeOptions = DRAW_TYPE_NUMBER_TYPES[drawType] || DRAW_TYPE_NUMBER_TYPES.default;
  const [numberType, setNumberType] = useState<NumberType>(numberTypeOptions[0].value);
  const [limitType, setLimitType] = useState<LimitType>("single_number");
  const [newNumber, setNewNumber] = useState("");
  const [newRangeStart, setNewRangeStart] = useState("");
  const [newRangeEnd, setNewRangeEnd] = useState("");
  const [newCount, setNewCount] = useState("");
  const [windowStart, setWindowStart] = useState<Date | null>(null);
  const [windowEnd, setWindowEnd] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<null | "start" | "end">(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorFields, setErrorFields] = useState<
    ("number" | "rangeStart" | "rangeEnd" | "count" | "window")[]
  >([]);
  const [filterNumberType, setFilterNumberType] = useState<NumberType | "all">("all");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteItem, setDeleteItem] = useState<GlobalLimitCount | null>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<GlobalLimitCount | null>(null);
  const [editCount, setEditCount] = useState("");
  const [editWindowStart, setEditWindowStart] = useState<Date | null>(null);
  const [editWindowEnd, setEditWindowEnd] = useState<Date | null>(null);
  const [editTimePicker, setEditTimePicker] = useState<null | "start" | "end">(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editErrorFields, setEditErrorFields] = useState<("count" | "window")[]>([]);

  const maxDigits = getDigitsForNumberType(numberType);

  const clearValidation = () => {
    setValidationError(null);
    setErrorFields([]);
  };

  const queryKey = [API_BASE, drawId, filterNumberType];

  const {
    data: limits,
    isLoading,
    isFetching,
    error,
  } = useQuery<GlobalLimitCount[]>({
    queryKey,
    queryFn: async () => {
      let url = `${API_BASE}/?draw__id=${drawId}&config_level=global`;
      if (filterNumberType !== "all") url += `&number_type=${filterNumberType}`;
      return api.get<GlobalLimitCount[]>(url).then((r) => r.data);
    },
    enabled: !!drawId,
    placeholderData: (prev) => prev,
  });

  const addMutation = useMutation({
    mutationFn: (payload: Omit<GlobalLimitCount, "id">) =>
      api.post(`${API_BASE}/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, drawId] });
      setNewNumber("");
      setNewRangeStart("");
      setNewRangeEnd("");
      setNewCount("");
      setWindowStart(null);
      setWindowEnd(null);
      setIsSubmitting(false);
      clearValidation();
      ToastAndroid.show("Limit added.", ToastAndroid.SHORT);
    },
    onError: (err: any) => {
      setIsSubmitting(false);
      const windowErr =
        err?.message?.window_end_time?.[0] ||
        err?.response?.data?.window_end_time?.[0] ||
        err?.message?.window_start_time?.[0] ||
        err?.response?.data?.window_start_time?.[0];
      if (windowErr) {
        setErrorFields(["window"]);
        setValidationError(windowErr);
        return;
      }
      const errorMsg =
        err?.message?.__all__?.[0] ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.message?.non_field_errors?.[0] ||
        err?.message?.error ||
        (typeof err?.message === "string" ? err.message : null) ||
        "Failed to add limit.";
      Dialog.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: errorMsg,
        button: "OK",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      count: number;
      window_start_time: string | null;
      window_end_time: string | null;
    }) =>
      api.patch(`${API_BASE}/${payload.id}/`, {
        count: payload.count,
        window_start_time: payload.window_start_time,
        window_end_time: payload.window_end_time,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, drawId] });
      closeEditModal();
      ToastAndroid.show("Limit updated.", ToastAndroid.SHORT);
    },
    onError: (err: any) => {
      // Keep the modal open so the values can be corrected in place.
      const windowErr =
        err?.message?.window_end_time?.[0] ||
        err?.response?.data?.window_end_time?.[0] ||
        err?.message?.window_start_time?.[0] ||
        err?.response?.data?.window_start_time?.[0];
      if (windowErr) {
        setEditErrorFields(["window"]);
        setEditError(windowErr);
        return;
      }
      setEditErrorFields([]);
      setEditError(
        err?.message?.__all__?.[0] ||
          err?.message?.non_field_errors?.[0] ||
          err?.message?.count?.[0] ||
          err?.message?.error ||
          err?.message?.detail ||
          err?.response?.data?.detail ||
          (typeof err?.message === "string" ? err.message : null) ||
          "Failed to update limit."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => api.delete(`${API_BASE}/${itemId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, drawId] });
      ToastAndroid.show("Limit deleted.", ToastAndroid.SHORT);
    },
    onError: (err: any) => {
      Dialog.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: err?.response?.data?.detail || "Failed to delete limit.",
        button: "OK",
      });
    },
  });

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    setEditItem(null);
    setEditTimePicker(null);
    setEditError(null);
    setEditErrorFields([]);
  }, []);

  const handleEditPress = useCallback((item: GlobalLimitCount) => {
    setEditItem(item);
    setEditCount(item.count.toString());
    setEditWindowStart(parseWindowTime(item.window_start_time));
    setEditWindowEnd(parseWindowTime(item.window_end_time));
    setEditError(null);
    setEditErrorFields([]);
    setEditModalVisible(true);
  }, []);

  const handleEditSave = () => {
    if (!editItem) return;
    const countNum = parseInt(editCount, 10);
    if (!editCount.trim() || isNaN(countNum) || countNum < 0) {
      setEditError("Please enter a valid count.");
      setEditErrorFields(["count"]);
      return;
    }
    if (editWindowStart && editWindowEnd && formatTime(editWindowEnd) <= formatTime(editWindowStart)) {
      setEditError("Window end time must be after window start time.");
      setEditErrorFields(["window"]);
      return;
    }
    setEditError(null);
    setEditErrorFields([]);
    updateMutation.mutate({
      id: editItem.id,
      count: countNum,
      window_start_time: editWindowStart ? formatTime(editWindowStart) : null,
      window_end_time: editWindowEnd ? formatTime(editWindowEnd) : null,
    });
  };

  const handleDeletePress = useCallback((item: GlobalLimitCount) => {
    setDeleteItem(item);
    setDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteItem) {
      deleteMutation.mutate(deleteItem.id);
      setDeleteModalVisible(false);
      setDeleteItem(null);
    }
  }, [deleteItem, deleteMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalVisible(false);
    setDeleteItem(null);
  }, []);

  const onSetNewNumber = (text: string) => {
    clearValidation();
    setNewNumber(text.replace(/\D/g, "").slice(0, maxDigits));
  };
  const onSetNewRangeStart = (text: string) => {
    clearValidation();
    setNewRangeStart(text.replace(/\D/g, "").slice(0, maxDigits));
  };
  const onSetNewRangeEnd = (text: string) => {
    clearValidation();
    setNewRangeEnd(text.replace(/\D/g, "").slice(0, maxDigits));
  };
  const onSetNewCount = (text: string) => {
    clearValidation();
    setNewCount(text.replace(/\D/g, ""));
  };

  const handleAdd = () => {
    clearValidation();
    const countNum = parseInt(newCount, 10);

    if (limitType === "single_number" && !newNumber.trim()) {
      setValidationError("Number is required.");
      setErrorFields(["number"]);
      return;
    }
    if (limitType === "range" && !newRangeStart.trim()) {
      setValidationError("Range start is required.");
      setErrorFields(["rangeStart"]);
      return;
    }
    if (limitType === "range" && !newRangeEnd.trim()) {
      setValidationError("Range end is required.");
      setErrorFields(["rangeEnd"]);
      return;
    }
    if (isNaN(countNum) || countNum < 0 || !newCount.trim()) {
      setValidationError("Count is required.");
      setErrorFields(["count"]);
      return;
    }
    if (windowStart && windowEnd && formatTime(windowEnd) <= formatTime(windowStart)) {
      setValidationError("Window end time must be after window start time.");
      setErrorFields(["window"]);
      return;
    }

    const windowFields = {
      window_start_time: windowStart ? formatTime(windowStart) : null,
      window_end_time: windowEnd ? formatTime(windowEnd) : null,
    };

    if (limitType === "single_number") {
      const trimmed = newNumber.trim();
      if (!/^\d+$/.test(trimmed) || trimmed.length !== maxDigits) {
        setValidationError(`Enter a ${maxDigits}-digit number.`);
        setErrorFields(["number"]);
        return;
      }
      setIsSubmitting(true);
      addMutation.mutate({
        draw: drawId,
        number: trimmed,
        count: countNum,
        number_type: numberType,
        limit_type: "single_number",
        range_start: null,
        range_end: null,
        ...windowFields,
      });
    } else {
      const trimStart = newRangeStart.trim();
      const trimEnd = newRangeEnd.trim();
      if (
        !/^\d+$/.test(trimStart) ||
        !/^\d+$/.test(trimEnd) ||
        trimStart.length !== maxDigits ||
        trimEnd.length !== maxDigits
      ) {
        setValidationError(`Enter valid ${maxDigits}-digit range values.`);
        setErrorFields(["rangeStart", "rangeEnd"]);
        return;
      }
      if (parseInt(trimStart, 10) >= parseInt(trimEnd, 10)) {
        setValidationError("Range start must be less than range end.");
        setErrorFields(["rangeStart", "rangeEnd"]);
        return;
      }
      setIsSubmitting(true);
      addMutation.mutate({
        draw: drawId,
        number: null,
        count: countNum,
        number_type: numberType,
        limit_type: "range",
        range_start: trimStart,
        range_end: trimEnd,
        ...windowFields,
      });
    }
  };

  const borderColor = (hasError: boolean) => (hasError ? "#EF4444" : "#E5E7EB");

  const filterOptions: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    ...numberTypeOptions,
  ];

  const renderHeader = () => (
    <View>
      {/* Header bar */}
      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <MoveLeft size={22} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Global Limit Count</Text>
          <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center">
            <Shield size={18} color="#4F46E5" />
          </View>
        </View>
        <View className="flex-row items-center mt-4">
          <View className="w-9 h-9 rounded-lg bg-indigo-50 items-center justify-center mr-3">
            <Ticket size={16} color="#4F46E5" />
          </View>
          <Text className="text-gray-800 font-bold text-base flex-1" numberOfLines={1}>
            {drawName}
          </Text>
        </View>
      </View>

      {/* Add form */}
      <View className="mx-4 mt-4">
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
          {/* Number type selector */}
          {numberTypeOptions.length > 1 && (
            <View className="mb-3">
              <Text className="text-xs font-bold text-gray-500 uppercase mb-2">
                Number Type
              </Text>
              <PillTabs
                options={numberTypeOptions}
                selected={numberType}
                onSelect={(v) => {
                  clearValidation();
                  setNumberType(v as NumberType);
                  setNewNumber("");
                  setNewRangeStart("");
                  setNewRangeEnd("");
                }}
                disabled={isSubmitting}
              />
            </View>
          )}

          {/* Limit type */}
          <View className="mb-3">
            <PillTabs
              options={[
                { value: "single_number", label: "Number" },
                { value: "range", label: "Range" },
              ]}
              selected={limitType}
              onSelect={(v) => {
                clearValidation();
                setLimitType(v as LimitType);
                setNewNumber("");
                setNewRangeStart("");
                setNewRangeEnd("");
              }}
              disabled={isSubmitting}
            />
          </View>

          {/* Inputs */}
          <View className="flex-row items-end gap-2 mb-3">
            {limitType === "single_number" ? (
              <TextInput
                className="flex-1 bg-white rounded-lg px-3 py-3 text-base text-gray-900"
                style={{
                  borderWidth: 1,
                  borderColor: borderColor(errorFields.includes("number")),
                }}
                placeholder="Number"
                value={newNumber}
                onChangeText={onSetNewNumber}
                keyboardType="number-pad"
                editable={!isSubmitting}
                placeholderTextColor="#9CA3AF"
                maxLength={maxDigits}
              />
            ) : (
              <>
                <TextInput
                  className="flex-1 bg-white rounded-lg px-3 py-3 text-base text-gray-900"
                  style={{
                    borderWidth: 1,
                    borderColor: borderColor(errorFields.includes("rangeStart")),
                  }}
                  placeholder="Start"
                  value={newRangeStart}
                  onChangeText={onSetNewRangeStart}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  placeholderTextColor="#9CA3AF"
                  maxLength={maxDigits}
                />
                <TextInput
                  className="flex-1 bg-white rounded-lg px-3 py-3 text-base text-gray-900"
                  style={{
                    borderWidth: 1,
                    borderColor: borderColor(errorFields.includes("rangeEnd")),
                  }}
                  placeholder="End"
                  value={newRangeEnd}
                  onChangeText={onSetNewRangeEnd}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  placeholderTextColor="#9CA3AF"
                  maxLength={maxDigits}
                />
              </>
            )}
            <TextInput
              className="bg-white rounded-lg px-3 py-3 text-base text-gray-900"
              style={{
                borderWidth: 1,
                borderColor: borderColor(errorFields.includes("count")),
                width: 80,
              }}
              placeholder="Count"
              value={newCount}
              onChangeText={onSetNewCount}
              keyboardType="number-pad"
              editable={!isSubmitting}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Time window (optional) */}
          <View className="mb-3">
            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">
              Time Window (optional)
            </Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-white rounded-lg px-3 py-3"
                style={{
                  borderWidth: 1,
                  borderColor: borderColor(errorFields.includes("window")),
                }}
                onPress={() => setShowTimePicker("start")}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text className="text-sm text-gray-700">
                  {windowStart
                    ? windowStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                    : "Start"}
                </Text>
              </TouchableOpacity>
              <Text className="text-gray-400 text-xs">to</Text>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-white rounded-lg px-3 py-3"
                style={{
                  borderWidth: 1,
                  borderColor: borderColor(errorFields.includes("window")),
                }}
                onPress={() => setShowTimePicker("end")}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text className="text-sm text-gray-700">
                  {windowEnd
                    ? windowEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                    : "End"}
                </Text>
              </TouchableOpacity>
              {(windowStart || windowEnd) && (
                <TouchableOpacity
                  onPress={() => {
                    setWindowStart(null);
                    setWindowEnd(null);
                    clearValidation();
                  }}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text className="text-red-500 text-xs font-bold">Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-xs text-gray-400 mt-1">
              Leave blank for a limit that applies all day.
            </Text>
          </View>

          {validationError && (
            <Text className="text-red-500 text-sm mb-2">{validationError}</Text>
          )}

          <TouchableOpacity
            className={`bg-indigo-600 rounded-lg py-3.5 items-center justify-center ${isSubmitting ? "opacity-50" : ""}`}
            onPress={handleAdd}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold text-base">Add Limit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter */}
        {filterOptions.length > 2 && (
          <View className="mb-3">
            <View className="flex-row flex-wrap gap-2">
              {filterOptions.map((f) => {
                const active = filterNumberType === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    onPress={() => setFilterNumberType(f.value as any)}
                    activeOpacity={0.7}
                    className={`px-3 py-2 rounded-lg ${active ? "bg-indigo-600" : "bg-white border border-gray-200"}`}
                  >
                    <Text
                      className={`text-xs font-bold ${active ? "text-white" : "text-gray-600"}`}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {isFetching && (
              <View className="items-center mt-2">
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            )}
          </View>
        )}

        {/* Table header */}
        <View className="flex-row items-center bg-gray-50 px-3 py-3 border-b border-gray-200 rounded-t-lg">
          <View style={{ width: "30%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase">Number</Text>
          </View>
          <View style={{ width: "15%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase">Type</Text>
          </View>
          <View style={{ width: "20%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase text-center">
              Count
            </Text>
          </View>
          <View style={{ width: "35%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase text-right">
              Actions
            </Text>
          </View>
        </View>
      </View>

      {showTimePicker && (
        <DateTimePicker
          mode="time"
          value={(showTimePicker === "start" ? windowStart : windowEnd) || new Date()}
          display={Platform.OS === "android" ? "default" : "spinner"}
          onChange={(event, date) => {
            if (date) {
              if (showTimePicker === "start") setWindowStart(date);
              else setWindowEnd(date);
            }
            setShowTimePicker(null);
          }}
        />
      )}
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: GlobalLimitCount }) => (
      <View className="mx-4">
        <LimitRow
          item={item}
          onEditPress={handleEditPress}
          onDeletePress={handleDeletePress}
        />
      </View>
    ),
    [handleEditPress, handleDeletePress]
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-500">Loading limits...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-8 bg-white">
        <Text className="text-red-600 text-xl font-bold mb-4">
          Failed to load limits
        </Text>
        <TouchableOpacity
          onPress={() =>
            queryClient.invalidateQueries({ queryKey: [API_BASE, drawId] })
          }
          className="bg-indigo-600 px-8 py-3 rounded-xl"
        >
          <Text className="text-white font-bold text-base">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <FlatList
        data={limits || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={
          <View className="items-center py-8 mx-4 bg-white rounded-b-lg">
            <Text className="text-gray-400 text-xs">No limits found.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Edit modal -- count and time window */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/40 px-5"
          onPress={closeEditModal}
        >
          <Pressable
            className="bg-white w-full rounded-2xl p-6"
            style={{ maxWidth: 380 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-gray-900 text-center mb-1">
              Edit Limit
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-5">
              {editItem?.limit_type === "range"
                ? `${editItem?.range_start ?? ""} - ${editItem?.range_end ?? ""}`
                : editItem?.number ?? ""}
              {editItem?.number_type
                ? ` · ${TYPE_LABEL[editItem.number_type] ?? ""}`
                : ""}
            </Text>

            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">
              Count
            </Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-3 text-base text-gray-900 mb-4"
              style={{
                borderWidth: 1,
                borderColor: borderColor(editErrorFields.includes("count")),
              }}
              placeholder="Count"
              value={editCount}
              onChangeText={(text) => {
                setEditError(null);
                setEditErrorFields([]);
                setEditCount(text.replace(/\D/g, ""));
              }}
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
              editable={!updateMutation.isPending}
            />

            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">
              Time Window
            </Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-white rounded-lg px-3 py-3"
                style={{
                  borderWidth: 1,
                  borderColor: borderColor(editErrorFields.includes("window")),
                }}
                onPress={() => setEditTimePicker("start")}
                disabled={updateMutation.isPending}
                activeOpacity={0.7}
              >
                <Text className="text-sm text-gray-700">
                  {editWindowStart
                    ? editWindowStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                    : "Start"}
                </Text>
              </TouchableOpacity>
              <Text className="text-gray-400 text-xs">to</Text>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-white rounded-lg px-3 py-3"
                style={{
                  borderWidth: 1,
                  borderColor: borderColor(editErrorFields.includes("window")),
                }}
                onPress={() => setEditTimePicker("end")}
                disabled={updateMutation.isPending}
                activeOpacity={0.7}
              >
                <Text className="text-sm text-gray-700">
                  {editWindowEnd
                    ? editWindowEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                    : "End"}
                </Text>
              </TouchableOpacity>
              {(editWindowStart || editWindowEnd) && (
                <TouchableOpacity
                  onPress={() => {
                    setEditWindowStart(null);
                    setEditWindowEnd(null);
                    setEditError(null);
                    setEditErrorFields([]);
                  }}
                  disabled={updateMutation.isPending}
                  activeOpacity={0.7}
                >
                  <Text className="text-red-500 text-xs font-bold">Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-xs text-gray-400 mt-1 mb-4">
              Leave blank for a limit that applies all day.
            </Text>

            {editError && (
              <Text className="text-red-500 text-sm mb-3">{editError}</Text>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={closeEditModal}
                className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                activeOpacity={0.8}
              >
                <Text className="text-gray-600 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditSave}
                className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                activeOpacity={0.8}
                disabled={updateMutation.isPending}
                style={{ opacity: updateMutation.isPending ? 0.6 : 1 }}
              >
                <Text className="text-white font-bold text-sm">
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            {editTimePicker && (
              <DateTimePicker
                mode="time"
                value={(editTimePicker === "start" ? editWindowStart : editWindowEnd) || new Date()}
                display={Platform.OS === "android" ? "default" : "spinner"}
                onChange={(event, date) => {
                  if (date) {
                    setEditError(null);
                    setEditErrorFields([]);
                    if (editTimePicker === "start") setEditWindowStart(date);
                    else setEditWindowEnd(date);
                  }
                  setEditTimePicker(null);
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/40 px-5"
          onPress={handleDeleteCancel}
        >
          <Pressable
            className="bg-white w-full rounded-2xl p-6"
            style={{ maxWidth: 360 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-gray-900 text-center mb-2">
              Delete Limit
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-5">
              Delete limit for{" "}
              <Text className="font-bold text-gray-800">
                {deleteItem?.limit_type === "range"
                  ? `${deleteItem?.range_start ?? ""} - ${deleteItem?.range_end ?? ""}`
                  : deleteItem?.number ?? ""}
              </Text>
              ? This cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleDeleteCancel}
                className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                activeOpacity={0.8}
              >
                <Text className="text-gray-600 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                className="flex-1 bg-red-500 py-3 rounded-xl items-center"
                activeOpacity={0.8}
                disabled={deleteMutation.isPending}
                style={{ opacity: deleteMutation.isPending ? 0.6 : 1 }}
              >
                <Text className="text-white font-bold text-sm">
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
