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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${active
          ? "bg-indigo-50 border-indigo-200"
          : "bg-gray-50 border-gray-200"
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
          className={`text-sm font-medium ${active ? "text-indigo-700" : "text-gray-800"
            }`}
          numberOfLines={1}
        >
          {value}
        </Text>
        <ChevronDown size={14} color="#6366F1" style={{ marginLeft: 6 }} />
      </View>
    </TouchableOpacity>
  );
}

function TableHeader() {
  return (
    <View style={tableStyles.headerRow}>
      <Text style={[tableStyles.headerCell, { flex: COL_FLEX.from }]}>
        From
      </Text>
      <Text style={[tableStyles.headerCell, { flex: COL_FLEX.to }]}>
        To
      </Text>
      <Text
        style={[
          tableStyles.headerCell,
          { flex: COL_FLEX.number, textAlign: "center" },
        ]}
      >
        Number
      </Text>
      <Text
        style={[
          tableStyles.headerCell,
          { flex: COL_FLEX.count, textAlign: "right" },
        ]}
      >
        Count
      </Text>
    </View>
  );
}

function TableRow({
  item,
  even,
}: {
  item: MonitoringTransferLog;
  even: boolean;
}) {
  return (
    <View
      style={[
        tableStyles.row,
        { backgroundColor: even ? "#ffffff" : "#f8fafc" },
      ]}
    >
      <View style={[tableStyles.cellBox, { flex: COL_FLEX.from }]}>
        <Text style={tableStyles.cellText} numberOfLines={1}>
          {item.from_vendor_name || `#${item.from_vendor}`}
        </Text>
        <Text style={tableStyles.cellSub} numberOfLines={1}>
          {TYPE_LABELS[item.type]} · {SUB_TYPE_LABELS[item.sub_type]}
        </Text>
      </View>
      <View style={[tableStyles.cellBox, { flex: COL_FLEX.to }]}>
        <Text style={tableStyles.cellText} numberOfLines={1}>
          {item.to_vendor_name || `#${item.to_vendor}`}
        </Text>
        <Text style={tableStyles.cellSub} numberOfLines={1}>
          {item.session_date}
        </Text>
      </View>
      <Text
        style={[
          tableStyles.cellText,
          tableStyles.cellBold,
          { flex: COL_FLEX.number, textAlign: "center", paddingHorizontal: 8, paddingVertical: 10 },
        ]}
        numberOfLines={1}
      >
        {item.number}
      </Text>
      <Text
        style={[
          tableStyles.cellText,
          tableStyles.cellCount,
          { flex: COL_FLEX.count, paddingHorizontal: 8, paddingVertical: 10 },
        ]}
      >
        {item.count}
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

  const [vendorId, setVendorId] = useState<number | null>(null);
  const [todayOnly, setTodayOnly] = useState(true);
  const [showVendorPicker, setShowVendorPicker] = useState(false);

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["monitoring-vendors"],
    queryFn: () =>
      api
        .get("/draw-monitoring/extra-count/source-vendors/")
        .then((r) => r.data),
    retry: false,
  });

  const queryKey = useMemo(
    () => ["transfer-log", drawId, vendorId, todayOnly],
    [drawId, vendorId, todayOnly]
  );

  const PAGE_SIZE = 50;

  type LogPage = {
    results: MonitoringTransferLog[];
    count: number;
    next: string | null;
    previous: string | null;
  };

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
  } = useInfiniteQuery<LogPage, any>({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => {
      const q: Record<string, any> = {
        limit: PAGE_SIZE,
        offset: pageParam,
      };
      if (drawId) q.draw_session__draw__id = drawId;
      if (vendorId) q.vendor__id = vendorId;
      if (todayOnly) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        q.draw_session__session_date = `${yyyy}-${mm}-${dd}`;
      }
      return api
        .get("/draw-monitoring/transfer-log/", { params: q })
        .then((r) => {
          // Normalize: backend now paginates; older deployments may still
          // return a plain array.
          const d = r.data;
          if (Array.isArray(d)) {
            return {
              results: d,
              count: d.length,
              next: null,
              previous: null,
            } as LogPage;
          }
          return d as LogPage;
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

  const items: MonitoringTransferLog[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((p) => p.results ?? []);
  }, [data]);

  const totalAvailable = data?.pages?.[0]?.count ?? items.length;

  const drawName = drawNameFromParams || (drawId ? `Draw #${drawId}` : "");
  const vendorName = vendors.find((v) => v.id === vendorId)?.name;
  const hasFilters = !!vendorId || !todayOnly;

  const clearAll = () => {
    setVendorId(null);
    setTodayOnly(true);
  };

  let totalCount = 0;
  for (const i of items) totalCount += i?.count ?? 0;

  const typeCounts = useMemo(() => {
    const map: Record<MonitoringType, number> = {
      single_digit: 0,
      double_digit: 0,
      triple_digit: 0,
    };
    for (const i of items) map[i.type] = (map[i.type] || 0) + i.count;
    return map;
  }, [items]);

  const subTypeCounts = useMemo(() => {
    const map: Partial<Record<MonitoringSubType, number>> = {};
    for (const i of items)
      map[i.sub_type] = (map[i.sub_type] || 0) + i.count;
    return map;
  }, [items]);

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

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
          <Text className="text-xl font-bold text-gray-800">Transfer Log</Text>
          <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center">
            <History size={18} color="#4F46E5" />
          </View>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white px-6 pt-4 pb-5 border-b border-gray-100 gap-2">
        {drawId ? (
          <View className="flex-row items-center bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
            <Ticket size={14} color="#4338CA" />
            <Text className="text-[10px] text-indigo-500 font-semibold uppercase ml-2 mr-1">
              Draw
            </Text>
            <Text
              className="text-indigo-800 font-bold text-sm flex-1"
              numberOfLines={1}
            >
              {drawName}
            </Text>
          </View>
        ) : null}
        <FilterRow
          icon={<Building2 size={14} color="#6366F1" />}
          label="Vendor"
          value={vendorName || "All"}
          active={!!vendorId}
          onPress={() => setShowVendorPicker(true)}
        />

        <TouchableOpacity
          onPress={() => setTodayOnly((p) => !p)}
          className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${todayOnly
              ? "bg-indigo-50 border-indigo-200"
              : "bg-gray-50 border-gray-200"
            }`}
        >
          <View className="flex-row items-center">
            <History size={14} color="#6366F1" />
            <Text className="ml-2 text-xs font-semibold text-gray-500">
              Date
            </Text>
          </View>
          <Text
            className={`text-sm font-medium ${todayOnly ? "text-indigo-700" : "text-gray-800"
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
                  Transfers{" "}
                  <Text className="text-gray-800 font-bold">
                    {items.length}
                    {totalAvailable > items.length ? ` / ${totalAvailable}` : ""}
                  </Text>
                </Text>
              </View>
              <View className="px-3 py-1.5 rounded-lg bg-indigo-50">
                <Text className="text-indigo-500 text-xs">
                  Total{" "}
                  <Text className="text-indigo-700 font-bold">{totalCount}</Text>
                </Text>
              </View>
            </View>

            {items.length > 0 && (
              <>
                <View className="flex-row gap-2 mt-2">
                  {(Object.keys(typeCounts) as MonitoringType[]).map((t) => (
                    <View
                      key={t}
                      className="flex-1 bg-purple-50 rounded-lg px-3 py-2 items-center"
                    >
                      <Text className="text-purple-400 text-[10px] font-semibold">
                        {TYPE_SHORT_LABELS[t]}
                      </Text>
                      <Text className="text-purple-700 text-sm font-bold">
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
              Failed to load transfer log
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="bg-indigo-600 px-8 py-3 rounded-xl mt-4"
            >
              <Text className="text-white font-bold text-base">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-4 text-gray-500">Loading...</Text>
        </View>
      ) : items.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
        >
          <History size={48} color="#D1D5DB" />
          <Text className="text-gray-400 text-lg mt-4">
            {hasFilters ? "No transfers match these filters" : "No transfers yet"}
          </Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, marginLeft: 14, marginRight: 14 }}>
          <TableHeader />
          <FlatList
            data={items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <TableRow item={item} even={index % 2 === 0} />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isFetchingNextPage}
                onRefresh={refetch}
                colors={["#4F46E5"]}
                tintColor="#4F46E5"
              />
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                </View>
              ) : !hasNextPage && items.length > 0 ? (
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
        visible={showVendorPicker}
        title="Filter by Vendor"
        clearLabel="All vendors"
        searchPlaceholder="Search vendors..."
        items={vendors}
        selectedId={vendorId}
        onSelect={(v) => setVendorId(v ? v.id : null)}
        onClose={() => setShowVendorPicker(false)}
      />
    </View>
  );
}

const tableStyles = StyleSheet.create({
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
