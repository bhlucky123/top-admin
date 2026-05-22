import KeyboardAvoider from "@/components/keyboard-avoider";
import {
  MonitoringTransferBatch,
  MonitoringTransferLog,
} from "@/hooks/use-monitoring-actions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MonitoringSubType,
  MonitoringType,
  SUB_TYPE_LABELS,
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
  ChevronRight,
  History,
  MoveLeft,
  Search,
  Ticket,
  Undo2,
  User,
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

function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

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
            <Text style={pickerStyles.clearText}>{clearLabel}</Text>
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

function BatchCard({
  batch,
  onPress,
}: {
  batch: MonitoringTransferBatch;
  onPress: () => void;
}) {
  const time = fmtTime(batch.transferred_at);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={batchStyles.card}
    >
      <View style={batchStyles.cardHeader}>
        <View style={batchStyles.seqBadge}>
          <Text style={batchStyles.seqText}>#{batch.sequence_number}</Text>
        </View>
        <Text style={batchStyles.timeText}>{time}</Text>
        <ChevronRight size={16} color="#94a3b8" />
      </View>
      <View style={batchStyles.cardBody}>
        <View style={batchStyles.statBox}>
          <Text style={batchStyles.statLabel}>Transferred</Text>
          <Text style={batchStyles.statValue}>{batch.total_transferred}</Text>
        </View>
        <View style={batchStyles.statBox}>
          <Text style={batchStyles.statLabel}>Entries</Text>
          <Text style={batchStyles.statValue}>{batch.total_entries}</Text>
        </View>
        {batch.initiated_by_name ? (
          <View style={[batchStyles.statBox, { flex: 2 }]}>
            <Text style={batchStyles.statLabel}>By</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <User size={11} color="#4338CA" style={{ marginRight: 3 }} />
              <Text
                style={[batchStyles.statValue, { fontSize: 12 }]}
                numberOfLines={1}
              >
                {batch.initiated_by_name}
              </Text>
            </View>
          </View>
        ) : null}
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
  const [selectedBatch, setSelectedBatch] =
    useState<MonitoringTransferBatch | null>(null);
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

  const PAGE_SIZE = 50;

  // ─── Batch query (Transfers tab, no batch selected) ───

  type BatchPage = {
    results: MonitoringTransferBatch[];
    count: number;
    next: string | null;
    previous: string | null;
  };

  const batchQueryKey = useMemo(
    () => ["transfer-batch", drawId, todayOnly],
    [drawId, todayOnly]
  );

  const {
    data: batchData,
    isLoading: loadingBatches,
    isFetching: fetchingBatches,
    isFetchingNextPage: fetchingNextBatches,
    hasNextPage: hasNextBatches,
    fetchNextPage: fetchNextBatchPage,
    isError: batchError,
    refetch: refetchBatches,
  } = useInfiniteQuery<BatchPage, any>({
    queryKey: batchQueryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => {
      const q: Record<string, any> = { limit: PAGE_SIZE, offset: pageParam };
      if (drawId) q.draw_session__draw__id = drawId;
      if (dateParam) q.draw_session__session_date = dateParam;
      return api
        .get("/draw-monitoring/transfer-batch/", { params: q })
        .then((r) => {
          const d = r.data;
          if (Array.isArray(d))
            return {
              results: d,
              count: d.length,
              next: null,
              previous: null,
            } as BatchPage;
          return d as BatchPage;
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

  const batchItems: MonitoringTransferBatch[] = useMemo(() => {
    if (!batchData) return [];
    return batchData.pages.flatMap((p) => p.results ?? []);
  }, [batchData]);

  // ─── Transfer log query (when a batch is selected) ───

  type TransferPage = {
    results: MonitoringTransferLog[];
    count: number;
    next: string | null;
    previous: string | null;
  };

  const transferQueryKey = useMemo(
    () => [
      "transfer-log",
      drawId,
      selectedBatch?.id,
      fromVendorId,
      toVendorId,
      todayOnly,
    ],
    [drawId, selectedBatch?.id, fromVendorId, toVendorId, todayOnly]
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
    enabled: !!selectedBatch,
    queryFn: ({ pageParam = 0 }) => {
      const q: Record<string, any> = { limit: PAGE_SIZE, offset: pageParam };
      if (selectedBatch) q.batch__id = selectedBatch.id;
      if (drawId) q.draw_session__draw__id = drawId;
      if (fromVendorId) q.from_vendor__id = fromVendorId;
      if (toVendorId) q.to_vendor__id = toVendorId;
      if (dateParam) q.draw_session__session_date = dateParam;
      return api
        .get("/draw-monitoring/transfer-log/", { params: q })
        .then((r) => {
          const d = r.data;
          if (Array.isArray(d))
            return {
              results: d,
              count: d.length,
              next: null,
              previous: null,
            } as TransferPage;
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
      const q: Record<string, any> = { limit: PAGE_SIZE, offset: pageParam };
      if (drawId) q.draw_session__draw__id = drawId;
      if (fromVendorId) q.from_vendor__id = fromVendorId;
      if (toVendorId) q.to_vendor__id = toVendorId;
      if (dateParam) q.draw_session__session_date = dateParam;
      return api
        .get("/draw-monitoring/recall-log/", { params: q })
        .then((r) => {
          const d = r.data;
          if (Array.isArray(d))
            return {
              results: d,
              count: d.length,
              next: null,
              previous: null,
            } as RecallPage;
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

  const totalRecallAvailable =
    recallData?.pages?.[0]?.count ?? recallItems.length;

  let totalRecallCount = 0;
  for (const i of recallItems) totalRecallCount += i?.recalled_count ?? 0;

  const recallTypeCounts = useMemo(() => {
    const map: Record<MonitoringType, number> = {
      single_digit: 0,
      double_digit: 0,
      triple_digit: 0,
    };
    for (const i of recallItems)
      map[i.type] = (map[i.type] || 0) + i.recalled_count;
    return map;
  }, [recallItems]);

  const recallSubTypeCounts = useMemo(() => {
    const map: Partial<Record<MonitoringSubType, number>> = {};
    for (const i of recallItems)
      map[i.sub_type] = (map[i.sub_type] || 0) + i.recalled_count;
    return map;
  }, [recallItems]);

  // ─── Derived state ───

  const isTransfers = tab === "transfers";
  const showingBatchDetail = isTransfers && !!selectedBatch;
  const accent = isTransfers ? "#4F46E5" : "#ea580c";

  const drawName = drawNameFromParams || (drawId ? `Draw #${drawId}` : "");
  const fromVendorName = vendors.find((v) => v.id === fromVendorId)?.name;
  const toVendorName = vendors.find((v) => v.id === toVendorId)?.name;
  const hasFilters = !!fromVendorId || !!toVendorId || !todayOnly;

  const clearAll = () => {
    setFromVendorId(null);
    setToVendorId(null);
    setTodayOnly(true);
  };

  const handleBackFromBatch = () => setSelectedBatch(null);

  // Recall-tab body helpers
  const recallIsLoading = loadingRecalls;
  const recallIsFetching = fetchingRecalls;
  const recallIsError = recallError;
  const recallRefetch = refetchRecalls;

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => {
              if (showingBatchDetail) {
                handleBackFromBatch();
              } else {
                router.back();
              }
            }}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <MoveLeft size={22} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800" numberOfLines={1}>
            {showingBatchDetail
              ? `Transfer #${selectedBatch.sequence_number}`
              : "Transfer & Recall Log"}
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

      {/* Tab switcher (hidden when drilling into a batch) */}
      {!showingBatchDetail && (
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
      )}

      {/* Filters — shown for batch detail & recalls, hidden on batch list */}
      {(showingBatchDetail || !isTransfers) && (
        <View className="bg-white px-6 pt-3 pb-5 border-b border-gray-100 gap-2">
          {drawId ? (
            <View
              className="flex-row items-center rounded-xl px-3 py-2.5 border"
              style={{
                backgroundColor: isTransfers ? "#EEF2FF" : "#fff7ed",
                borderColor: isTransfers ? "#E0E7FF" : "#ffedd5",
              }}
            >
              <Ticket
                size={14}
                color={isTransfers ? "#4338CA" : "#c2410c"}
              />
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

          {showingBatchDetail && selectedBatch.initiated_by_name ? (
            <View className="flex-row items-center rounded-xl px-3 py-2.5 border bg-indigo-50 border-indigo-200">
              <User size={14} color="#4338CA" />
              <Text className="text-[10px] font-semibold uppercase ml-2 mr-1 text-indigo-500">
                By
              </Text>
              <Text
                className="font-bold text-sm flex-1 text-indigo-900"
                numberOfLines={1}
              >
                {selectedBatch.initiated_by_name}
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
            accentBorder={
              isTransfers ? "border-indigo-200" : "border-orange-200"
            }
            accentText={isTransfers ? "text-indigo-700" : "text-orange-700"}
          />
          <FilterRow
            icon={<Building2 size={14} color={accent} />}
            label="To"
            value={toVendorName || "All"}
            active={!!toVendorId}
            onPress={() => setShowToVendorPicker(true)}
            accentBg={isTransfers ? "bg-indigo-50" : "bg-orange-50"}
            accentBorder={
              isTransfers ? "border-indigo-200" : "border-orange-200"
            }
            accentText={isTransfers ? "text-indigo-700" : "text-orange-700"}
          />

          {!showingBatchDetail && (
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
          )}

          {hasFilters && !showingBatchDetail && (
            <TouchableOpacity
              onPress={clearAll}
              className="self-end px-3 py-1"
            >
              <Text className="text-red-600 text-xs font-semibold">
                Clear filters
              </Text>
            </TouchableOpacity>
          )}

          {/* Stats for batch detail */}
          {showingBatchDetail && !loadingTransfers && transferItems.length > 0 && (
            <>
              <View className="flex-row gap-2 mt-1">
                <View className="px-3 py-1.5 rounded-lg bg-gray-100">
                  <Text className="text-gray-500 text-xs">
                    Entries{" "}
                    <Text className="text-gray-800 font-bold">
                      {transferItems.length}
                    </Text>
                  </Text>
                </View>
                <View
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "#EEF2FF" }}
                >
                  <Text className="text-xs" style={{ color: "#6366F1" }}>
                    Total{" "}
                    <Text className="font-bold" style={{ color: "#4338CA" }}>
                      {totalTransferCount}
                    </Text>
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2 mt-2">
                {(Object.keys(transferTypeCounts) as MonitoringType[]).map(
                  (t) => (
                    <View
                      key={t}
                      className="flex-1 rounded-lg px-3 py-2 items-center"
                      style={{ backgroundColor: "#faf5ff" }}
                    >
                      <Text
                        className="text-[10px] font-semibold"
                        style={{ color: "#a855f7" }}
                      >
                        {TYPE_SHORT_LABELS[t]}
                      </Text>
                      <Text
                        className="text-sm font-bold"
                        style={{ color: "#7e22ce" }}
                      >
                        {transferTypeCounts[t]}
                      </Text>
                    </View>
                  )
                )}
              </View>

              <View className="flex-row flex-wrap gap-2 mt-1">
                {(
                  Object.entries(transferSubTypeCounts) as [
                    MonitoringSubType,
                    number
                  ][]
                ).map(([st, count]) => (
                  <View
                    key={st}
                    className="bg-slate-100 rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-slate-500 text-xs">
                      {SUB_TYPE_LABELS[st]}{" "}
                      <Text className="text-slate-800 font-bold">{count}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Stats for recalls */}
          {!isTransfers && !loadingRecalls && (
            <>
              <View className="flex-row gap-2 mt-1">
                <View className="px-3 py-1.5 rounded-lg bg-gray-100">
                  <Text className="text-gray-500 text-xs">
                    Recalls{" "}
                    <Text className="text-gray-800 font-bold">
                      {recallItems.length}
                      {totalRecallAvailable > recallItems.length
                        ? ` / ${totalRecallAvailable}`
                        : ""}
                    </Text>
                  </Text>
                </View>
                <View
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "#fff7ed" }}
                >
                  <Text className="text-xs" style={{ color: "#f97316" }}>
                    Total recalled{" "}
                    <Text className="font-bold" style={{ color: "#c2410c" }}>
                      {totalRecallCount}
                    </Text>
                  </Text>
                </View>
              </View>

              {recallItems.length > 0 && (
                <>
                  <View className="flex-row gap-2 mt-2">
                    {(Object.keys(recallTypeCounts) as MonitoringType[]).map(
                      (t) => (
                        <View
                          key={t}
                          className="flex-1 rounded-lg px-3 py-2 items-center"
                          style={{ backgroundColor: "#fff7ed" }}
                        >
                          <Text
                            className="text-[10px] font-semibold"
                            style={{ color: "#fb923c" }}
                          >
                            {TYPE_SHORT_LABELS[t]}
                          </Text>
                          <Text
                            className="text-sm font-bold"
                            style={{ color: "#c2410c" }}
                          >
                            {recallTypeCounts[t]}
                          </Text>
                        </View>
                      )
                    )}
                  </View>

                  <View className="flex-row flex-wrap gap-2 mt-1">
                    {(
                      Object.entries(recallSubTypeCounts) as [
                        MonitoringSubType,
                        number
                      ][]
                    ).map(([st, count]) => (
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
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      )}

      {/* Batch list filter (just draw + date, no vendor filters) */}
      {isTransfers && !showingBatchDetail && (
        <View className="bg-white px-6 pt-3 pb-5 border-b border-gray-100 gap-2">
          {drawId ? (
            <View className="flex-row items-center rounded-xl px-3 py-2.5 border bg-indigo-50 border-indigo-200">
              <Ticket size={14} color="#4338CA" />
              <Text className="text-[10px] font-semibold uppercase ml-2 mr-1 text-indigo-500">
                Draw
              </Text>
              <Text
                className="font-bold text-sm flex-1 text-indigo-900"
                numberOfLines={1}
              >
                {drawName}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => setTodayOnly((p) => !p)}
            className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${
              todayOnly
                ? "bg-indigo-50 border-indigo-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <View className="flex-row items-center">
              <History size={14} color="#4F46E5" />
              <Text className="ml-2 text-xs font-semibold text-gray-500">
                Date
              </Text>
            </View>
            <Text
              className={`text-sm font-medium ${
                todayOnly ? "text-indigo-700" : "text-gray-800"
              }`}
            >
              {todayOnly ? "Today only" : "All time"}
            </Text>
          </TouchableOpacity>

          {!loadingBatches && batchItems.length > 0 && (
            <View className="flex-row gap-2 mt-1">
              <View className="px-3 py-1.5 rounded-lg bg-gray-100">
                <Text className="text-gray-500 text-xs">
                  Batches{" "}
                  <Text className="text-gray-800 font-bold">
                    {batchItems.length}
                  </Text>
                </Text>
              </View>
              <View
                className="px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: "#EEF2FF" }}
              >
                <Text className="text-xs" style={{ color: "#6366F1" }}>
                  Total transferred{" "}
                  <Text className="font-bold" style={{ color: "#4338CA" }}>
                    {batchItems.reduce((s, b) => s + b.total_transferred, 0)}
                  </Text>
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ─── Body ─── */}

      {/* Transfers tab → batch list */}
      {isTransfers && !showingBatchDetail && (
        <>
          {batchError ? (
            <View className="flex-1 justify-center items-center px-8">
              <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
                <Text className="text-red-600 text-xl font-bold mb-2">
                  Failed to load transfers
                </Text>
                <TouchableOpacity
                  onPress={() => refetchBatches()}
                  className="px-8 py-3 rounded-xl mt-4 bg-indigo-600"
                >
                  <Text className="text-white font-bold text-base">Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : loadingBatches ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text className="mt-4 text-gray-500">Loading...</Text>
            </View>
          ) : batchItems.length === 0 ? (
            <ScrollView
              contentContainerStyle={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
              refreshControl={
                <RefreshControl
                  refreshing={fetchingBatches}
                  onRefresh={refetchBatches}
                  colors={["#4F46E5"]}
                  tintColor="#4F46E5"
                />
              }
            >
              <History size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                No transfers yet
              </Text>
            </ScrollView>
          ) : (
            <FlatList
              data={batchItems}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <BatchCard
                  batch={item}
                  onPress={() => setSelectedBatch(item)}
                />
              )}
              contentContainerStyle={{
                paddingHorizontal: 14,
                paddingTop: 8,
                paddingBottom: insets.bottom + 24,
              }}
              onEndReached={() => {
                if (hasNextBatches && !fetchingNextBatches) fetchNextBatchPage();
              }}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={fetchingBatches && !fetchingNextBatches}
                  onRefresh={refetchBatches}
                  colors={["#4F46E5"]}
                  tintColor="#4F46E5"
                />
              }
              ListFooterComponent={
                fetchingNextBatches ? (
                  <View style={{ paddingVertical: 16, alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#4F46E5" />
                  </View>
                ) : !hasNextBatches && batchItems.length > 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: "center" }}>
                    <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                      End of list
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}

      {/* Transfers tab → batch detail (transfer log entries) */}
      {showingBatchDetail && (
        <>
          {transferError ? (
            <View className="flex-1 justify-center items-center px-8">
              <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
                <Text className="text-red-600 text-xl font-bold mb-2">
                  Failed to load transfer log
                </Text>
                <TouchableOpacity
                  onPress={() => refetchTransfers()}
                  className="px-8 py-3 rounded-xl mt-4 bg-indigo-600"
                >
                  <Text className="text-white font-bold text-base">Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : loadingTransfers ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text className="mt-4 text-gray-500">Loading...</Text>
            </View>
          ) : transferItems.length === 0 ? (
            <ScrollView
              contentContainerStyle={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
              refreshControl={
                <RefreshControl
                  refreshing={fetchingTransfers}
                  onRefresh={refetchTransfers}
                  colors={["#4F46E5"]}
                  tintColor="#4F46E5"
                />
              }
            >
              <History size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                No entries in this transfer
              </Text>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, marginLeft: 14, marginRight: 14 }}>
              <TransferTableHeader />
              <FlatList
                data={transferItems}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                  <TransferTableRow item={item} even={index % 2 === 0} />
                )}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                onEndReached={() => {
                  if (hasNextTransfers && !fetchingNextTransfers)
                    fetchNextTransferPage();
                }}
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
                    <View
                      style={{ paddingVertical: 16, alignItems: "center" }}
                    >
                      <ActivityIndicator size="small" color="#4F46E5" />
                    </View>
                  ) : !hasNextTransfers && transferItems.length > 0 ? (
                    <View
                      style={{ paddingVertical: 16, alignItems: "center" }}
                    >
                      <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                        End of log
                      </Text>
                    </View>
                  ) : null
                }
              />
            </View>
          )}
        </>
      )}

      {/* Recalls tab */}
      {!isTransfers && (
        <>
          {recallIsError ? (
            <View className="flex-1 justify-center items-center px-8">
              <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
                <Text className="text-red-600 text-xl font-bold mb-2">
                  Failed to load recall log
                </Text>
                <TouchableOpacity
                  onPress={() => recallRefetch()}
                  className="px-8 py-3 rounded-xl mt-4"
                  style={{ backgroundColor: "#ea580c" }}
                >
                  <Text className="text-white font-bold text-base">Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : recallIsLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#ea580c" />
              <Text className="mt-4 text-gray-500">Loading...</Text>
            </View>
          ) : recallItems.length === 0 ? (
            <ScrollView
              contentContainerStyle={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
              refreshControl={
                <RefreshControl
                  refreshing={recallIsFetching}
                  onRefresh={recallRefetch}
                  colors={["#ea580c"]}
                  tintColor="#ea580c"
                />
              }
            >
              <Undo2 size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                {hasFilters
                  ? "No recalls match these filters"
                  : "No recalls yet"}
              </Text>
            </ScrollView>
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
                onEndReached={() => {
                  if (hasNextRecalls && !fetchingNextRecalls)
                    fetchNextRecallPage();
                }}
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
                    <View
                      style={{ paddingVertical: 16, alignItems: "center" }}
                    >
                      <ActivityIndicator size="small" color="#ea580c" />
                    </View>
                  ) : !hasNextRecalls && recallItems.length > 0 ? (
                    <View
                      style={{ paddingVertical: 16, alignItems: "center" }}
                    >
                      <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                        End of log
                      </Text>
                    </View>
                  ) : null
                }
              />
            </View>
          )}
        </>
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

const batchStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#EEF2FF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E7FF",
  },
  seqBadge: {
    backgroundColor: "#4F46E5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  seqText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  timeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: "#4338CA",
    fontWeight: "600",
  },
  cardBody: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
});

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
