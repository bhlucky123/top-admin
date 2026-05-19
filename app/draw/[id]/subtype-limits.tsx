import api from "@/utils/axios";
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

type SubTypeValue = "A" | "B" | "C" | "AB" | "BC" | "AC" | "SUPER" | "BOX";
type NumberType = "single_digit" | "double_digit" | "triple_digit";
type LimitType = "single_number" | "range";

type GlobalSubtypeLimit = {
  id: number;
  draw: number;
  sub_type: SubTypeValue;
  number: string | null;
  count: number;
  number_type: NumberType;
  limit_type: LimitType;
  range_start: string | null;
  range_end: string | null;
};

const SUBTYPE_OPTIONS: { value: SubTypeValue; label: string; numberType: NumberType }[] = [
  { value: "A", label: "A", numberType: "single_digit" },
  { value: "B", label: "B", numberType: "single_digit" },
  { value: "C", label: "C", numberType: "single_digit" },
  { value: "AB", label: "AB", numberType: "double_digit" },
  { value: "BC", label: "BC", numberType: "double_digit" },
  { value: "AC", label: "AC", numberType: "double_digit" },
  { value: "SUPER", label: "SUPER", numberType: "triple_digit" },
  { value: "BOX", label: "BOX", numberType: "triple_digit" },
];

const SUBTYPE_GROUPS = [
  { title: "Single Digit", subtypes: ["A", "B", "C"] },
  { title: "Double Digit", subtypes: ["AB", "BC", "AC"] },
  { title: "Triple Digit", subtypes: ["SUPER", "BOX"] },
];

const FILTER_SUBTYPES: { value: SubTypeValue | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "AB", label: "AB" },
  { value: "BC", label: "BC" },
  { value: "AC", label: "AC" },
  { value: "SUPER", label: "SUP" },
  { value: "BOX", label: "BOX" },
];

const getDigitsForNumberType = (nt: NumberType) =>
  nt === "single_digit" ? 1 : nt === "double_digit" ? 2 : 3;

const getNumberTypeForSubtype = (st: SubTypeValue): NumberType =>
  SUBTYPE_OPTIONS.find((o) => o.value === st)?.numberType ?? "single_digit";

const API_BASE = "/draw/global-subtype-limit";

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
          className={`px-4 py-2.5 rounded-lg items-center ${active ? "bg-indigo-600" : "bg-white border border-gray-200"}`}
        >
          <Text className={`text-sm font-bold ${active ? "text-white" : "text-gray-600"}`}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const SubtypeSelector = ({
  selected,
  onSelect,
  disabled,
}: {
  selected: SubTypeValue;
  onSelect: (v: SubTypeValue) => void;
  disabled?: boolean;
}) => (
  <View className="gap-2">
    {SUBTYPE_GROUPS.map((group) => (
      <View key={group.title}>
        <Text className="text-xs font-semibold text-gray-400 mb-1 ml-0.5">
          {group.title}
        </Text>
        <View className="flex-row gap-2">
          {group.subtypes.map((st) => {
            const active = selected === st;
            return (
              <TouchableOpacity
                key={st}
                onPress={() => onSelect(st as SubTypeValue)}
                disabled={disabled}
                activeOpacity={0.7}
                className={`flex-1 py-2.5 rounded-lg items-center ${active ? "bg-indigo-600" : "bg-white border border-gray-200"}`}
              >
                <Text className={`text-sm font-bold ${active ? "text-white" : "text-gray-600"}`}>
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ))}
  </View>
);

const LimitRow = memo(
  ({
    item,
    updateMutation,
    onDeletePress,
  }: {
    item: GlobalSubtypeLimit;
    updateMutation: any;
    onDeletePress: (item: GlobalSubtypeLimit) => void;
  }) => {
    const [editCount, setEditCount] = useState(item.count.toString());
    const [isEditing, setIsEditing] = useState(false);

    const displayNumber =
      item.limit_type === "range"
        ? `${item.range_start}-${item.range_end}`
        : item.number;

    const typeLabel =
      { single_digit: "1D", double_digit: "2D", triple_digit: "3D" }[item.number_type] ?? "";

    return (
      <View
        className="flex-row items-center border-b border-gray-100 bg-white px-3 py-3"
        style={{ minHeight: 52 }}
      >
        <View style={{ width: "20%" }}>
          <Text className="text-sm font-bold text-indigo-600">{item.sub_type}</Text>
        </View>
        <View style={{ width: "25%" }}>
          <Text className="text-base font-bold text-gray-900">{displayNumber}</Text>
        </View>
        <View style={{ width: "10%" }}>
          <Text className="text-sm font-semibold text-gray-500">{typeLabel}</Text>
        </View>
        <View style={{ width: "18%" }}>
          {isEditing ? (
            <TextInput
              className="text-center text-sm font-bold bg-blue-50 rounded-lg px-2 py-2 border border-blue-200"
              style={{ color: "#1D4ED8" }}
              value={editCount}
              onChangeText={setEditCount}
              keyboardType="number-pad"
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <Text className="text-base font-bold text-green-600 text-center">
              {item.count}
            </Text>
          )}
        </View>
        <View style={{ width: "27%" }} className="flex-row justify-end gap-2">
          {isEditing ? (
            <>
              <TouchableOpacity
                className="bg-green-500 px-3 py-2 rounded-lg"
                onPress={() => {
                  const countNum = parseInt(editCount, 10);
                  if (isNaN(countNum) || countNum < 0) {
                    Dialog.show({
                      type: ALERT_TYPE.WARNING,
                      title: "Invalid",
                      textBody: "Please enter a valid count.",
                      button: "OK",
                    });
                    return;
                  }
                  updateMutation.mutate({ id: item.id, count: countNum });
                  setIsEditing(false);
                }}
                activeOpacity={0.7}
              >
                <Text className="text-white font-bold text-sm">OK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-200 px-3 py-2 rounded-lg"
                onPress={() => {
                  setEditCount(item.count.toString());
                  setIsEditing(false);
                }}
                activeOpacity={0.7}
              >
                <Text className="text-gray-500 font-bold text-sm">X</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                className="bg-gray-100 px-3 py-2 rounded-lg"
                onPress={() => setIsEditing(true)}
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
            </>
          )}
        </View>
      </View>
    );
  }
);

export default function DrawSubTypeLimitsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const drawId = Number(id);
  const drawName = name || `Draw #${id}`;

  const [subType, setSubType] = useState<SubTypeValue>("A");
  const [limitType, setLimitType] = useState<LimitType>("single_number");
  const [newNumber, setNewNumber] = useState("");
  const [newRangeStart, setNewRangeStart] = useState("");
  const [newRangeEnd, setNewRangeEnd] = useState("");
  const [newCount, setNewCount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorFields, setErrorFields] = useState<
    ("number" | "rangeStart" | "rangeEnd" | "count")[]
  >([]);
  const [filterSubType, setFilterSubType] = useState<SubTypeValue | "all">("all");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteItem, setDeleteItem] = useState<GlobalSubtypeLimit | null>(null);

  const numberType = getNumberTypeForSubtype(subType);
  const maxDigits = getDigitsForNumberType(numberType);

  const clearValidation = () => {
    setValidationError(null);
    setErrorFields([]);
  };

  const queryKey = [API_BASE, drawId, filterSubType];

  const {
    data: limits,
    isLoading,
    isFetching,
    error,
  } = useQuery<GlobalSubtypeLimit[]>({
    queryKey,
    queryFn: async () => {
      let url = `${API_BASE}/?draw__id=${drawId}`;
      if (filterSubType !== "all") url += `&sub_type=${filterSubType}`;
      return api.get<GlobalSubtypeLimit[]>(url).then((r) => r.data);
    },
    enabled: !!drawId,
    placeholderData: (prev) => prev,
  });

  const addMutation = useMutation({
    mutationFn: (payload: Omit<GlobalSubtypeLimit, "id">) =>
      api.post(`${API_BASE}/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, drawId] });
      setNewNumber("");
      setNewRangeStart("");
      setNewRangeEnd("");
      setNewCount("");
      setIsSubmitting(false);
      clearValidation();
      ToastAndroid.show("Limit added.", ToastAndroid.SHORT);
    },
    onError: (err: any) => {
      setIsSubmitting(false);
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
    mutationFn: (payload: { id: number; count: number }) =>
      api.patch(`${API_BASE}/${payload.id}/`, { count: payload.count }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, drawId] });
      ToastAndroid.show("Limit updated.", ToastAndroid.SHORT);
    },
    onError: (err: any) => {
      Dialog.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: err?.response?.data?.detail || "Failed to update limit.",
        button: "OK",
      });
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

  const handleDeletePress = useCallback((item: GlobalSubtypeLimit) => {
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
        sub_type: subType,
        number: trimmed,
        count: countNum,
        number_type: numberType,
        limit_type: "single_number",
        range_start: null,
        range_end: null,
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
        sub_type: subType,
        number: null,
        count: countNum,
        number_type: numberType,
        limit_type: "range",
        range_start: trimStart,
        range_end: trimEnd,
      });
    }
  };

  const borderColor = (hasError: boolean) => (hasError ? "#EF4444" : "#E5E7EB");

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
          <Text className="text-xl font-bold text-gray-800">Sub-Type Limits</Text>
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
          {/* Sub-type selector */}
          <View className="mb-3">
            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">
              Sub-Type
            </Text>
            <SubtypeSelector
              selected={subType}
              onSelect={(v) => {
                clearValidation();
                setSubType(v);
                setNewNumber("");
                setNewRangeStart("");
                setNewRangeEnd("");
              }}
              disabled={isSubmitting}
            />
          </View>

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
        <View className="mb-3">
          <View className="flex-row flex-wrap gap-2">
            {FILTER_SUBTYPES.map((f) => {
              const active = filterSubType === f.value;
              return (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => setFilterSubType(f.value as any)}
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

        {/* Table header */}
        <View className="flex-row items-center bg-gray-50 px-3 py-3 border-b border-gray-200 rounded-t-lg">
          <View style={{ width: "20%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase">Type</Text>
          </View>
          <View style={{ width: "25%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase">Number</Text>
          </View>
          <View style={{ width: "10%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase">Dig</Text>
          </View>
          <View style={{ width: "18%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase text-center">
              Count
            </Text>
          </View>
          <View style={{ width: "27%" }}>
            <Text className="text-xs font-bold text-gray-500 uppercase text-right">
              Actions
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: GlobalSubtypeLimit }) => (
      <View className="mx-4">
        <LimitRow
          item={item}
          updateMutation={updateMutation}
          onDeletePress={handleDeletePress}
        />
      </View>
    ),
    [updateMutation, handleDeletePress]
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
              Delete{" "}
              <Text className="font-bold text-gray-800">
                {deleteItem?.sub_type}
              </Text>{" "}
              limit for{" "}
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
