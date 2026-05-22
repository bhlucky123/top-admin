import KeyboardAvoider from "@/components/keyboard-avoider";
import { MonitoringTransferLog } from "@/hooks/use-monitoring-actions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MonitoringSubType,
  MonitoringType,
  SUB_TYPE_LABELS,
  SUB_TYPES_BY_TYPE,
  TYPE_LABELS,
  TYPE_SHORT_LABELS,
} from "@/hooks/use-monitoring-extra-count";
import { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { AntDesign } from "@expo/vector-icons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Building2,
  ChevronDown,
  History,
  MoveLeft,
  Search,
  Ticket,
  Undo2,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type RecallLog = {
  id: number;
  from_vendor: number;
  to_vendor: number;
  from_vendor_name?: string;
  to_vendor_name?: string;
  draw_name?: string;
  session_date?: string;
  number: string;
  recalled_count: number;
  original_transferred_count: number;
  type: MonitoringType;
  sub_type: MonitoringSubType;
  recalled_at: string;
  triggered_by_booking_id?: number;
};

type Tab = "transfers" | "recalls";

const COL_FLEX = {
  from: 3,
  to: 3,
  number: 2,
  count: 2,
};

function PickerModal<T extends { id: number; name: string }>({
  visible,
  title,
  clearLabel,
  searchPlaceholder,
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  clearLabel: string;
  searchPlaceholder: string;
  items: T[];
  selectedId: number | null;
  onSelect: (item: T | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoider style={pickerStyles.modalBackdrop}>
        <View
          style={[
            pickerStyles.modalSheet,
            { paddingBottom: 24 + insets.bottom },
          ]}
        >
          <View style={pickerStyles.modalHeader}>
            <Text style={pickerStyles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={pickerStyles.modalClose}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={pickerStyles.searchRow}>
            <Search size={16} color="#9CA3AF" />
            <TextInput
              placeholder={searchPlaceholder}
              value={search}
              onChangeText={setSearch}
              style={pickerStyles.searchInput}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <TouchableOpacity
            style={pickerStyles.clearRow}
            onPress={() => {
              onSelect(null);
              onClose();
            }}
          >
            <Text style={pickerStyles.clearText}>
              {clearLabel}
            </Text>
          </TouchableOpacity>
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id.toString()}
            style={{ maxHeight: 380 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = selectedId === item.id;
              return (
                <TouchableOpacity
                  style={[
                    pickerStyles.pickerRow,
                    active && pickerStyles.pickerRowActive,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.pickerRowText,
                      active && pickerStyles.pickerRowTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {active && <AntDesign name="check" size={18} color="#4F46E5" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={pickerStyles.emptyPicker}>No matches</Text>
            }
          />
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function FilterRow({
  icon,
  label,
  value,
  active,
  onPress,
  accentBg,
  accentBorder,
  accentText,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
  accentBg?: string;
  accentBorder?: string;
  accentText?: string;
}) {
  const bg = accentBg || "bg-indigo-50";
  const border = accentBorder || "border-indigo-200";
  const text = accentText || "text-indigo-700";
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${
        active ? `${bg} ${border}` : "bg-gray-50 border-gray-200"
      }`}
    >
      <View className="flex-row items-center">
        {icon}
        <Text className="ml-2 text-xs font-semibold text-gray-500">
          {label}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Text
          className={`text-sm font-medium ${active ? text : "text-gray-800"}`}
          numberOfLines={1}
        >
          {value}
        </Text>
        <ChevronDown size={14} color="#6366F1" style={{ marginLeft: 6 }} />
      </View>
    </TouchableOpacity>
  );
}

function TransferTableHeader() {
  return (
    <View style={transferTableStyles.headerRow}>
      <Text style={[transferTableStyles.headerCell, { flex: COL_FLEX.from }]}>
        From
      </Text>
      <Text style={[transferTableStyles.headerCell, { flex: COL_FLEX.to }]}>
        To
      </Text>
      <Text
        style={[
          transferTableStyles.headerCell,
          { flex: COL_FLEX.number, textAlign: "center" },
        ]}
      >
        Number
      </Text>
      <Text
        style={[
          transferTableStyles.headerCell,
          { flex: COL_FLEX.count, textAlign: "right" },
        ]}
      >
        Count
      </Text>
    </View>
  );
}

function TransferTableRow({
  item,
  even,
}: {
  item: MonitoringTransferLog;
  even: boolean;
}) {
  return (
    <View
      style={[
        transferTableStyles.row,
        { backgroundColor: even ? "#ffffff" : "#f8fafc" },
      ]}
    >
      <View style={[transferTableStyles.cellBox, { flex: COL_FLEX.from }]}>
        <Text style={transferTableStyles.cellText} numberOfLines={1}>
          {item.from_vendor_name || `#${item.from_vendor}`}
        </Text>
        <Text style={transferTableStyles.cellSub} numberOfLines={1}>
          {TYPE_LABELS[item.type]} · {SUB_TYPE_LABELS[item.sub_type]}
        </Text>
      </View>
      <View style={[transferTableStyles.cellBox, { flex: COL_FLEX.to }]}>
        <Text style={transferTableStyles.cellText} numberOfLines={1}>
          {item.to_vendor_name || `#${item.to_vendor}`}
        </Text>
        <Text style={transferTableStyles.cellSub} numberOfLines={1}>
          {item.session_date}
        </Text>
      </View>
      <Text
        style={[
          transferTableStyles.cellText,
          transferTableStyles.cellBold,
          { flex: COL_FLEX.number, textAlign: "center", paddingHorizontal: 8, paddingVertical: 10 },
        ]}
        numberOfLines={1}
      >
        {item.number}
      </Text>
      <Text
        style={[
          transferTableStyles.cellText,
          transferTableStyles.cellCount,
          { flex: COL_FLEX.count, paddingHorizontal: 8, paddingVertical: 10 },
        ]}
      >
        {item.count}
      </Text>
    </View>
  );
}

function RecallTableHeader() {
  return (
    <View style={recallTableStyles.headerRow}>
      <Text style={[recallTableStyles.headerCell, { flex: COL_FLEX.from }]}>
        From
      </Text>
      <Text style={[recallTableStyles.headerCell, { flex: COL_FLEX.to }]}>
        Recalled From
      </Text>
      <Text
        style={[
          recallTableStyles.headerCell,
          { flex: COL_FLEX.number, textAlign: "center" },
        ]}
      >
        Number
      </Text>
      <Text
        style={[
          recallTableStyles.headerCell,
          { flex: COL_FLEX.count, textAlign: "right" },
        ]}
      >
        Recalled
      </Text>
    </View>
  );
}

function RecallTableRow({ item, even }: { item: RecallLog; even: boolean }) {
  return (
    <View
      style={[
        recallTableStyles.row,
        { backgroundColor: even ? "#ffffff" : "#fff7ed" },
      ]}
    >
      <View style={[recallTableStyles.cellBox, { flex: COL_FLEX.from }]}>
        <Text style={recallTableStyles.cellText} numberOfLines={1}>
          {item.from_vendor_name || `#${item.from_vendor}`}
        </Text>
        <Text style={recallTableStyles.cellSub} numberOfLines={1}>
          {TYPE_LABELS[item.type]} · {SUB_TYPE_LABELS[item.sub_type]}
        </Text>
      </View>
      <View style={[recallTableStyles.cellBox, { flex: COL_FLEX.to }]}>
        <Text style={recallTableStyles.cellText} numberOfLines={1}>
          {item.to_vendor_name || `#${item.to_vendor}`}
        </Text>
        <Text style={recallTableStyles.cellSub} numberOfLines={1}>
          {item.session_date}
        </Text>
      </View>
      <Text
        style={[
          recallTableStyles.cellText,
          recallTableStyles.cellBold,
          {
            flex: COL_FLEX.number,
            textAlign: "center",
            paddingHorizontal: 8,
            paddingVertical: 10,
          },
        ]}
        numberOfLines={1}
      >
        {item.number}
      </Text>
      <Text
        style={[
          recallTableStyles.cellText,
          recallTableStyles.cellCount,
          { flex: COL_FLEX.count, paddingHorizontal: 8, paddingVertical: 10 },
        ]}
      >
        {item.recalled_count}
      </Text>
    </View>
  );
}

export default function TransferLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ drawId?: string; drawName?: string }>();
  const drawId = params.drawId ? Number(params.drawId) : null;
  const drawNameFromParams = params.drawName || "";

  const [tab, setTab] = useState<Tab>("transfers");
  const [fromVendorId, setFromVendorId] = useState<number | null>(null);
  const [toVendorId, setToVendorId] = useState<number | null>(null);
  const [todayOnly, setTodayOnly] = useState(true);
  const [showFromVendorPicker, setShowFromVendorPicker] = useState(false);
  const [showToVendorPicker, setShowToVendorPicker] = useState(false);

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["monitoring-vendors"],
    queryFn: () =>
      api
        .get("/draw-monitoring/extra-count/source-vendors/")
        .then((r) => r.data),
    retry: false,
  });

  const dateParam = useMemo(() => {
    if (!todayOnly) return undefined;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [todayOnly]);

  // ─── Transfer query ───
  const PAGE_SIZE = 50;

  type TransferPage = {
    results: MonitoringTransferLog[];
    count: number;
    next: string | null;
    previous: string | null;
  };

  const transferQueryKey = useMemo(
    () => ["transfer-log", drawId, fromVendorId, toVendorId, todayOnly],
    [drawId, fromVendorId, toVendorId, todayOnly]
  );

  const {
    data: transferData,
    isLoading: loadingTransfers,
    isFetching: fetchingTransfers,
    isFetchingNextPage: fetchingNextTransfers,
    hasNextPage: hasNextTransfers,
    fetchNextPage: fetchNextTransferPage,
    isError: transferError,
    refetch: refetchTransfers,
  } = useInfiniteQuery<TransferPage, any>({
    queryKey: transferQueryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => {
      const q: Record<string, any> = {
        limit: PAGE_SIZE,
        offset: pageParam,
      };
      if (drawId) q.draw_session__draw__id = drawId;
      if (fromVendorId) q.from_vendor__id = fromVendorId;
      if (toVendorId) q.to_vendor__id = toVendorId;
      if (dateParam) q.draw_session__session_date = dateParam;
      return api
        .get("/draw-monitoring/transfer-log/", { params: q })
        .then((r) => {
          const d = r.data;
          if (Array.isArray(d)) {
            return {
              results: d,
              count: d.length,
              next: null,
              previous: null,
            } as TransferPage;
          }
          return d as TransferPage;
        });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.next) return undefined;
      const loaded = allPages.reduce(
        (acc, p) => acc + (p.results?.length ?? 0),
        0
      );
      return loaded;
    },
    retry: false,
  });

  const transferItems: MonitoringTransferLog[] = useMemo(() => {
    if (!transferData) return [];
    return transferData.pages.flatMap((p) => p.results ?? []);
  }, [transferData]);

  const totalTransferAvailable = transferData?.pages?.[0]?.count ?? transferItems.length;

  let totalTransferCount = 0;
  for (const i of transferItems) totalTransferCount += i?.count ?? 0;

  const transferTypeCounts = useMemo(() => {
    const map: Record<MonitoringType, number> = {
      single_digit: 0,
      double_digit: 0,
      triple_digit: 0,
    };
    for (const i of transferItems) map[i.type] = (map[i.type] || 0) + i.count;
    return map;
  }, [transferItems]);

  const transferSubTypeCounts = useMemo(() => {
    const map: Partial<Record<MonitoringSubType, number>> = {};
    for (const i of transferItems)
      map[i.sub_type] = (map[i.sub_type] || 0) + i.count;
    return map;
  }, [transferItems]);

  // ─── Recall query ───

  type RecallPage = {
    results: RecallLog[];
    count: number;
    next: string | null;
    previous: string | null;
  };

  const recallQueryKey = useMemo(
    () => ["recall-log", drawId, fromVendorId, toVendorId, todayOnly],
    [drawId, fromVendorId, toVendorId, todayOnly]
  );

  const {
    data: recallData,
    isLoading: loadingRecalls,
    isFetching: fetchingRecalls,
    isFetchingNextPage: fetchingNextRecalls,
    hasNextPage: hasNextRecalls,
    fetchNextPage: fetchNextRecallPage,
    isError: recallError,
    refetch: refetchRecalls,
  } = useInfiniteQuery<RecallPage, any>({
    queryKey: recallQueryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => {
      const q: Record<string, any> = {
        limit: PAGE_SIZE,
        offset: pageParam,
      };
      if (drawId) q.draw_session__draw__id = drawId;
      if (fromVendorId) q.from_vendor__id = fromVendorId;
      if (toVendorId) q.to_vendor__id = toVendorId;
      if (dateParam) q.draw_session__session_date = dateParam;
      return api
        .get("/draw-monitoring/recall-log/", { params: q })
        .then((r) => {
          const d = r.data;
          if (Array.isArray(d)) {
            return {
              results: d,
              count: d.length,
              next: null,
              previous: null,
            } as RecallPage;
          }
          return d as RecallPage;
        });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.next) return undefined;
      const loaded = allPages.reduce(
        (acc, p) => acc + (p.results?.length ?? 0),
        0
      );
      return loaded;
    },
    retry: false,
  });

  const recallItems: RecallLog[] = useMemo(() => {
    if (!recallData) return [];
    return recallData.pages.flatMap((p) => p.results ?? []);
  }, [recallData]);

  const totalRecallAvailable = recallData?.pages?.[0]?.count ?? recallItems.length;

  let totalRecallCount = 0;
  for (const i of recallItems) totalRecallCount += i?.recalled_count ?? 0;

  const recallTypeCounts = useMemo(() => {
    const map: Record<MonitoringType, number> = {
      single_digit: 0,
      double_digit: 0,
      triple_digit: 0,
    };
    for (const i of recallItems) map[i.type] = (map[i.type] || 0) + i.recalled_count;
    return map;
  }, [recallItems]);

  const recallSubTypeCounts = useMemo(() => {
    const map: Partial<Record<MonitoringSubType, number>> = {};
    for (const i of recallItems)
      map[i.sub_type] = (map[i.sub_type] || 0) + i.recalled_count;
    return map;
  }, [recallItems]);

  // ─── Derived state based on active tab ───

  const isLoading = tab === "transfers" ? loadingTransfers : loadingRecalls;
  const isFetching = tab === "transfers" ? fetchingTransfers : fetchingRecalls;
  const isFetchingNextPage = tab === "transfers" ? fetchingNextTransfers : fetchingNextRecalls;
  const hasNextPage = tab === "transfers" ? hasNextTransfers : hasNextRecalls;
  const isError = tab === "transfers" ? transferError : recallError;
  const refetch = tab === "transfers" ? refetchTransfers : refetchRecalls;
  const items = tab === "transfers" ? transferItems : recallItems;
  const totalAvailable = tab === "transfers" ? totalTransferAvailable : totalRecallAvailable;
  const totalCount = tab === "transfers" ? totalTransferCount : totalRecallCount;
  const typeCounts = tab === "transfers" ? transferTypeCounts : recallTypeCounts;
  const subTypeCounts = tab === "transfers" ? transferSubTypeCounts : recallSubTypeCounts;

  const fetchNextPage = tab === "transfers" ? fetchNextTransferPage : fetchNextRecallPage;

  const drawName = drawNameFromParams || (drawId ? `Draw #${drawId}` : "");
  const fromVendorName = vendors.find((v) => v.id === fromVendorId)?.name;
  const toVendorName = vendors.find((v) => v.id === toVendorId)?.name;
  const hasFilters = !!fromVendorId || !!toVendorId || !todayOnly;

  const clearAll = () => {
    setFromVendorId(null);
    setToVendorId(null);
    setTodayOnly(true);
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const isTransfers = tab === "transfers";
  const accent = isTransfers ? "#4F46E5" : "#ea580c";

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <MoveLeft size={22} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">
            Transfer & Recall Log
          </Text>
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: isTransfers ? "#EEF2FF" : "#fff7ed" }}
          >
            {isTransfers ? (
              <History size={18} color="#4F46E5" />
            ) : (
              <Undo2 size={18} color="#ea580c" />
            )}
          </View>
        </View>
      </View>

      {/* Tab switcher */}
      <View className="bg-white px-6 pt-3 pb-0">
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => setTab("transfers")}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              isTransfers ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                isTransfers ? "text-indigo-700" : "text-gray-500"
              }`}
            >
              Transfers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab("recalls")}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              !isTransfers ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                !isTransfers ? "text-orange-600" : "text-gray-500"
              }`}
            >
              Recalls
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white px-6 pt-3 pb-5 border-b border-gray-100 gap-2">
        {drawId ? (
          <View
            className="flex-row items-center rounded-xl px-3 py-2.5 border"
            style={{
              backgroundColor: isTransfers ? "#EEF2FF" : "#fff7ed",
              borderColor: isTransfers ? "#E0E7FF" : "#ffedd5",
            }}
          >
            <Ticket size={14} color={isTransfers ? "#4338CA" : "#c2410c"} />
            <Text
              className="text-[10px] font-semibold uppercase ml-2 mr-1"
              style={{ color: isTransfers ? "#6366F1" : "#f97316" }}
            >
              Draw
            </Text>
            <Text
              className="font-bold text-sm flex-1"
              style={{ color: isTransfers ? "#312e81" : "#9a3412" }}
              numberOfLines={1}
            >
              {drawName}
            </Text>
          </View>
        ) : null}
        <FilterRow
          icon={<Building2 size={14} color={accent} />}
          label="From"
          value={fromVendorName || "All"}
          active={!!fromVendorId}
          onPress={() => setShowFromVendorPicker(true)}
          accentBg={isTransfers ? "bg-indigo-50" : "bg-orange-50"}
          accentBorder={isTransfers ? "border-indigo-200" : "border-orange-200"}
          accentText={isTransfers ? "text-indigo-700" : "text-orange-700"}
        />
        <FilterRow
          icon={<Building2 size={14} color={accent} />}
          label="To"
          value={toVendorName || "All"}
          active={!!toVendorId}
          onPress={() => setShowToVendorPicker(true)}
          accentBg={isTransfers ? "bg-indigo-50" : "bg-orange-50"}
          accentBorder={isTransfers ? "border-indigo-200" : "border-orange-200"}
          accentText={isTransfers ? "text-indigo-700" : "text-orange-700"}
        />

        <TouchableOpacity
          onPress={() => setTodayOnly((p) => !p)}
          className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${
            todayOnly
              ? isTransfers
                ? "bg-indigo-50 border-indigo-200"
                : "bg-orange-50 border-orange-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <View className="flex-row items-center">
            <History size={14} color={accent} />
            <Text className="ml-2 text-xs font-semibold text-gray-500">
              Date
            </Text>
          </View>
          <Text
            className={`text-sm font-medium ${
              todayOnly
                ? isTransfers
                  ? "text-indigo-700"
                  : "text-orange-700"
                : "text-gray-800"
            }`}
          >
            {todayOnly ? "Today only" : "All time"}
          </Text>
        </TouchableOpacity>

        {hasFilters && (
          <TouchableOpacity
            onPress={clearAll}
            className="self-end px-3 py-1"
          >
            <Text className="text-red-600 text-xs font-semibold">
              Clear filters
            </Text>
          </TouchableOpacity>
        )}

        {!isLoading && (
          <>
            <View className="flex-row gap-2 mt-1">
              <View className="px-3 py-1.5 rounded-lg bg-gray-100">
                <Text className="text-gray-500 text-xs">
                  {isTransfers ? "Transfers" : "Recalls"}{" "}
                  <Text className="text-gray-800 font-bold">
                    {items.length}
                    {totalAvailable > items.length ? ` / ${totalAvailable}` : ""}
                  </Text>
                </Text>
              </View>
              <View
                className="px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: isTransfers ? "#EEF2FF" : "#fff7ed" }}
              >
                <Text
                  className="text-xs"
                  style={{ color: isTransfers ? "#6366F1" : "#f97316" }}
                >
                  {isTransfers ? "Total" : "Total recalled"}{" "}
                  <Text
                    className="font-bold"
                    style={{ color: isTransfers ? "#4338CA" : "#c2410c" }}
                  >
                    {totalCount}
                  </Text>
                </Text>
              </View>
            </View>

            {items.length > 0 && (
              <>
                <View className="flex-row gap-2 mt-2">
                  {(Object.keys(typeCounts) as MonitoringType[]).map((t) => (
                    <View
                      key={t}
                      className="flex-1 rounded-lg px-3 py-2 items-center"
                      style={{ backgroundColor: isTransfers ? "#faf5ff" : "#fff7ed" }}
                    >
                      <Text
                        className="text-[10px] font-semibold"
                        style={{ color: isTransfers ? "#a855f7" : "#fb923c" }}
                      >
                        {TYPE_SHORT_LABELS[t]}
                      </Text>
                      <Text
                        className="text-sm font-bold"
                        style={{ color: isTransfers ? "#7e22ce" : "#c2410c" }}
                      >
                        {typeCounts[t]}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row flex-wrap gap-2 mt-1">
                  {(Object.entries(subTypeCounts) as [MonitoringSubType, number][]).map(
                    ([st, count]) => (
                      <View
                        key={st}
                        className="bg-slate-100 rounded-lg px-3 py-1.5"
                      >
                        <Text className="text-slate-500 text-xs">
                          {SUB_TYPE_LABELS[st]}{" "}
                          <Text className="text-slate-800 font-bold">
                            {count}
                          </Text>
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </>
            )}
          </>
        )}
      </View>

      {/* Body */}
      {isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
            <Text className="text-red-600 text-xl font-bold mb-2">
              Failed to load {isTransfers ? "transfer" : "recall"} log
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="px-8 py-3 rounded-xl mt-4"
              style={{ backgroundColor: accent }}
            >
              <Text className="text-white font-bold text-base">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={accent} />
          <Text className="mt-4 text-gray-500">Loading...</Text>
        </View>
      ) : items.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              colors={[accent]}
              tintColor={accent}
            />
          }
        >
          {isTransfers ? (
            <History size={48} color="#D1D5DB" />
          ) : (
            <Undo2 size={48} color="#D1D5DB" />
          )}
          <Text className="text-gray-400 text-lg mt-4">
            {hasFilters
              ? `No ${isTransfers ? "transfers" : "recalls"} match these filters`
              : `No ${isTransfers ? "transfers" : "recalls"} yet`}
          </Text>
        </ScrollView>
      ) : isTransfers ? (
        <View style={{ flex: 1, marginLeft: 14, marginRight: 14 }}>
          <TransferTableHeader />
          <FlatList
            data={transferItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <TransferTableRow item={item} even={index % 2 === 0} />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={fetchingTransfers && !fetchingNextTransfers}
                onRefresh={refetchTransfers}
                colors={["#4F46E5"]}
                tintColor="#4F46E5"
              />
            }
            ListFooterComponent={
              fetchingNextTransfers ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                </View>
              ) : !hasNextTransfers && transferItems.length > 0 ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                    End of log
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      ) : (
        <View style={{ flex: 1, marginLeft: 14, marginRight: 14 }}>
          <RecallTableHeader />
          <FlatList
            data={recallItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <RecallTableRow item={item} even={index % 2 === 0} />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={fetchingRecalls && !fetchingNextRecalls}
                onRefresh={refetchRecalls}
                colors={["#ea580c"]}
                tintColor="#ea580c"
              />
            }
            ListFooterComponent={
              fetchingNextRecalls ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#ea580c" />
                </View>
              ) : !hasNextRecalls && recallItems.length > 0 ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                    End of log
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      <PickerModal
        visible={showFromVendorPicker}
        title="Filter by From Vendor"
        clearLabel="All vendors"
        searchPlaceholder="Search vendors..."
        items={vendors}
        selectedId={fromVendorId}
        onSelect={(v) => setFromVendorId(v ? v.id : null)}
        onClose={() => setShowFromVendorPicker(false)}
      />
      <PickerModal
        visible={showToVendorPicker}
        title="Filter by To Vendor"
        clearLabel="All vendors"
        searchPlaceholder="Search vendors..."
        items={vendors}
        selectedId={toVendorId}
        onSelect={(v) => setToVendorId(v ? v.id : null)}
        onClose={() => setShowToVendorPicker(false)}
      />
    </View>
  );
}

const transferTableStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderBottomWidth: 1,
    borderBottomColor: "#C7D2FE",
  },
  headerCell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 11,
    fontWeight: "700",
    color: "#3730A3",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  cellBox: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  cellText: {
    fontSize: 12,
    color: "#1f2937",
  },
  cellSub: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  cellBold: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cellCount: {
    fontWeight: "700",
    color: "#4338CA",
    textAlign: "right",
  },
});

const recallTableStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#fff7ed",
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
  },
  headerCell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 11,
    fontWeight: "700",
    color: "#9a3412",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  cellBox: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  cellText: {
    fontSize: 12,
    color: "#1f2937",
  },
  cellSub: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  cellBold: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cellCount: {
    fontWeight: "700",
    color: "#ea580c",
    textAlign: "right",
  },
});

const pickerStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    color: "#1e293b",
    fontSize: 14,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pickerRowActive: {
    backgroundColor: "#EEF2FF",
  },
  pickerRowText: {
    fontSize: 15,
    color: "#1e293b",
  },
  pickerRowTextActive: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  emptyPicker: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
    paddingVertical: 24,
  },
  clearRow: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 10,
  },
  clearText: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "600",
  },
});
