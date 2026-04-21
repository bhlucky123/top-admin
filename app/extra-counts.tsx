import KeyboardAvoider from "@/components/keyboard-avoider";
import { Draw } from "@/hooks/use-draw";
import useMonitoringActions from "@/hooks/use-monitoring-actions";
import {
  ALL_SUB_TYPES,
  MonitoringExtraCount,
  MonitoringSubType,
  MonitoringType,
  SUB_TYPES_BY_TYPE,
  SUB_TYPE_LABELS,
  TYPE_LABELS,
} from "@/hooks/use-monitoring-extra-count";
import { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { AntDesign } from "@expo/vector-icons";
import Clipboard from "@react-native-clipboard/clipboard";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  Building2,
  ChevronDown,
  Copy,
  History,
  MoveLeft,
  Search,
  Send,
  Ticket,
  Trash2,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const TYPES: MonitoringType[] = [
  "single_digit",
  "double_digit",
  "triple_digit",
];

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
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoider style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <Search size={16} color="#9CA3AF" />
            <TextInput
              placeholder={searchPlaceholder}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <TouchableOpacity
            style={styles.clearRow}
            onPress={() => {
              onSelect(null);
              onClose();
            }}
          >
            <Text style={styles.clearText}>{clearLabel}</Text>
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
                  style={[styles.pickerRow, active && styles.pickerRowActive]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.pickerRowText,
                      active && styles.pickerRowTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {active && <AntDesign name="check" size={18} color="#4F46E5" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyPicker}>No matches</Text>
            }
          />
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

const COL_FLEX = {
  vendor: 3,
  draw: 3,
  number: 2,
  count: 2,
};

function TableHeader() {
  return (
    <View style={tableStyles.headerRow}>
      <Text style={[tableStyles.headerCell, { flex: COL_FLEX.vendor }]}>
        Vendor
      </Text>
      <Text style={[tableStyles.headerCell, { flex: COL_FLEX.draw }]}>
        Draw
      </Text>
      <Text style={[tableStyles.headerCell, { flex: COL_FLEX.number }]}>
        Number
      </Text>
      <Text
        style={[
          tableStyles.headerCell,
          { flex: COL_FLEX.count, textAlign: "right" },
        ]}
      >
        Extra
      </Text>
    </View>
  );
}

function TableRow({
  item,
  even,
}: {
  item: MonitoringExtraCount;
  even: boolean;
}) {
  return (
    <View
      style={[
        tableStyles.row,
        { backgroundColor: even ? "#ffffff" : "#f8fafc" },
      ]}
    >
      <Text
        style={[tableStyles.cell, { flex: COL_FLEX.vendor }]}
        numberOfLines={1}
      >
        {item.vendor_name || `#${item.vendor}`}
      </Text>
      <Text
        style={[tableStyles.cell, { flex: COL_FLEX.draw }]}
        numberOfLines={1}
      >
        {item.draw_name || `#${item.draw_session}`}
      </Text>
      <Text
        style={[
          tableStyles.cell,
          tableStyles.cellBold,
          { flex: COL_FLEX.number },
        ]}
        numberOfLines={1}
      >
        {item.number}
      </Text>
      <Text
        style={[
          tableStyles.cell,
          tableStyles.cellCount,
          { flex: COL_FLEX.count },
        ]}
      >
        {item.count}
      </Text>
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
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 12,
    color: "#1f2937",
  },
  cellBold: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cellCount: {
    fontWeight: "700",
    color: "#B91C1C",
    textAlign: "right",
  },
});

export default function ExtraCountsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ drawId?: string; vendorId?: string }>();
  const initialDrawId = params.drawId ? Number(params.drawId) : null;
  const initialVendorId = params.vendorId ? Number(params.vendorId) : null;

  const [vendorId, setVendorId] = useState<number | null>(initialVendorId);
  const [drawId, setDrawId] = useState<number | null>(initialDrawId);
  const [types, setTypes] = useState<MonitoringType[]>([]);
  const [subTypes, setSubTypes] = useState<MonitoringSubType[]>([]);

  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showDrawPicker, setShowDrawPicker] = useState(false);
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [selectedTransferVendorIds, setSelectedTransferVendorIds] = useState<
    Set<number>
  >(new Set());

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/administrator/vendors/").then((r) => r.data),
    retry: false,
  });

  const { data: draws = [] } = useQuery<(Draw & { id: number })[]>({
    queryKey: ["draws-list"],
    queryFn: () => api.get("/draw/list/").then((r) => r.data),
    retry: false,
  });

  const typesKey = [...types].sort().join(",");
  const subTypesKey = [...subTypes].sort().join(",");

  const queryKey = useMemo(
    () => ["extra-counts", vendorId, drawId, typesKey, subTypesKey],
    [vendorId, drawId, typesKey, subTypesKey]
  );

  const toggleType = (t: MonitoringType) => {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
    // Prune sub-types that wouldn't be valid under the new type selection.
    setSubTypes((prev) => {
      if (prev.length === 0) return prev;
      const nextTypes = types.includes(t)
        ? types.filter((x) => x !== t)
        : [...types, t];
      if (nextTypes.length === 0) return prev; // no type filter → any sub allowed
      const allowed = new Set<MonitoringSubType>();
      nextTypes.forEach((nt) =>
        SUB_TYPES_BY_TYPE[nt].forEach((st) => allowed.add(st))
      );
      return prev.filter((st) => allowed.has(st));
    });
  };

  const toggleSubType = (st: MonitoringSubType) => {
    setSubTypes((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]
    );
  };

  const PAGE_SIZE = 50;

  type ExtraCountPage = {
    count: number;
    next: string | null;
    previous: string | null;
    results: MonitoringExtraCount[];
    total_extra: number;
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
  } = useInfiniteQuery<ExtraCountPage>({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => {
      const params: Record<string, any> = {
        limit: PAGE_SIZE,
        offset: pageParam,
      };
      if (vendorId) params.vendor__id = vendorId;
      if (drawId) params.draw_session__draw__id = drawId;
      if (types.length) params.type__in = types.join(",");
      if (subTypes.length) params.sub_type__in = subTypes.join(",");
      return api
        .get("/draw-monitoring/extra-count/", { params })
        .then((r) => {
          // Defensive: backend may return either paginated object or legacy raw array
          const raw = r.data;
          if (Array.isArray(raw)) {
            return {
              count: raw.length,
              next: null,
              previous: null,
              results: raw as MonitoringExtraCount[],
              total_extra: raw.reduce(
                (s: number, i: MonitoringExtraCount) => s + (i?.count ?? 0),
                0
              ),
            };
          }
          return {
            count: raw?.count ?? 0,
            next: raw?.next ?? null,
            previous: raw?.previous ?? null,
            results: Array.isArray(raw?.results) ? raw.results : [],
            total_extra: raw?.total_extra ?? 0,
          };
        });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.next) return undefined;
      return allPages.reduce(
        (sum, p) => sum + (p?.results?.length ?? 0),
        0
      );
    },
    retry: false,
  });

  const items = useMemo<MonitoringExtraCount[]>(
    () =>
      data?.pages.flatMap((p) =>
        Array.isArray(p?.results) ? p.results : []
      ) ?? [],
    [data]
  );
  const totalCount = data?.pages[0]?.count ?? 0;
  const totalExtraFromServer = data?.pages[0]?.total_extra ?? 0;

  const vendorName = vendors.find((v) => v.id === vendorId)?.name;
  const drawName = draws.find((d) => d.id === drawId)?.name;
  const hasFilters =
    !!vendorId || !!drawId || types.length > 0 || subTypes.length > 0;

  const clearAll = () => {
    setVendorId(null);
    setDrawId(null);
    setTypes([]);
    setSubTypes([]);
  };

  // Sub-types visible for toggling: when no type selected, all are visible;
  // otherwise union of sub-types valid for the selected types.
  const visibleSubTypes: MonitoringSubType[] = useMemo(() => {
    if (types.length === 0) return ALL_SUB_TYPES;
    const set = new Set<MonitoringSubType>();
    types.forEach((t) =>
      SUB_TYPES_BY_TYPE[t].forEach((st) => set.add(st))
    );
    return ALL_SUB_TYPES.filter((st) => set.has(st));
  }, [types]);

  const queryClient = useQueryClient();
  const { copyAll, clear, transferAll } = useMonitoringActions();

  const handleCopyAll = async () => {
    try {
      const params: Record<string, any> = {};
      if (vendorId) params.vendor__id = vendorId;
      if (drawId) params.draw_session__draw__id = drawId;
      if (types.length) params.type__in = types.join(",");
      if (subTypes.length) params.sub_type__in = subTypes.join(",");
      const lines = await copyAll.mutateAsync(params);
      if (!lines.length) {
        Alert.alert("Nothing to copy", "No extra-count entries match the current filters.");
        return;
      }
      Clipboard.setString(lines.join("\n"));
      Alert.alert("Copied", `${lines.length} line${lines.length === 1 ? "" : "s"} copied to clipboard.`);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to copy.";
      Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const handleClear = () => {
    if (!totalCount) {
      Alert.alert("Nothing to clear", "No extra-count entries match the current filters.");
      return;
    }
    const parts: string[] = [];
    if (vendorName) parts.push(`vendor "${vendorName}"`);
    if (drawName) parts.push(`draw "${drawName}"`);
    if (types.length)
      parts.push(
        `type ${types.map((t) => TYPE_LABELS[t]).join("/")}`
      );
    if (subTypes.length)
      parts.push(
        `sub-type ${subTypes.map((st) => SUB_TYPE_LABELS[st]).join("/")}`
      );
    const scope = parts.length
      ? parts.join(", ")
      : "today's active session";
    Alert.alert(
      "Clear Extra Counts",
      `Delete entries for ${scope}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const body: Record<string, any> = {};
            if (vendorId) body.vendor_id = vendorId;
            if (drawId) body.draw_id = drawId;
            if (types.length) body.type = types;
            if (subTypes.length) body.sub_type = subTypes;
            clear.mutate(body, {
              onSuccess: (res) => {
                queryClient.invalidateQueries({ queryKey: ["extra-counts"] });
                Alert.alert("Cleared", `${res.deleted_count} record${res.deleted_count === 1 ? "" : "s"} deleted.`);
              },
              onError: (err: any) => {
                const msg = typeof err === "string" ? err : err?.message || "Failed to clear.";
                Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
              },
            });
          },
        },
      ]
    );
  };

  const {
    data: transferCandidates = [],
    isFetching: loadingCandidates,
  } = useQuery<Vendor[]>({
    queryKey: ["vendors", "monitoring-enabled"],
    queryFn: () =>
      api
        .get("/administrator/vendors/", {
          params: { monitoring_enabled: true, is_active: true },
        })
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: showTransferPicker,
    retry: false,
  });

  // Reset selection to "all checked" whenever the candidate list changes.
  const candidateIdsKey = transferCandidates.map((v) => v.id).join(",");
  useEffect(() => {
    setSelectedTransferVendorIds(
      new Set(transferCandidates.map((v) => v.id))
    );
  }, [candidateIdsKey]);

  const handleTransferAll = () => {
    if (!drawId) {
      Alert.alert(
        "Select a draw",
        "Transfer requires a specific draw. Pick one from the Draw filter above."
      );
      return;
    }
    setShowTransferPicker(true);
  };

  const toggleTransferVendor = (vendorId: number) => {
    setSelectedTransferVendorIds((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };

  const setAllTransferVendors = (checked: boolean) => {
    if (checked) {
      setSelectedTransferVendorIds(
        new Set(transferCandidates.map((v) => v.id))
      );
    } else {
      setSelectedTransferVendorIds(new Set());
    }
  };

  const confirmTransfer = () => {
    if (!drawId) return;
    const vendorIds = Array.from(selectedTransferVendorIds);
    if (vendorIds.length === 0) {
      Alert.alert(
        "No vendors selected",
        "Select at least one vendor to transfer from."
      );
      return;
    }
    transferAll.mutate(
      { draw_id: drawId, vendor_ids: vendorIds },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: ["extra-counts"] });
          setShowTransferPicker(false);
          Alert.alert(
            "Transfer Complete",
            `Transferred: ${res.total_transferred}\nRemaining extra: ${res.total_remaining_extra}`
          );
        },
        onError: (err: any) => {
          const msg =
            typeof err === "string" ? err : err?.message || "Transfer failed.";
          Alert.alert(
            "Error",
            typeof msg === "string" ? msg : JSON.stringify(msg)
          );
        },
      }
    );
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
          <Text className="text-xl font-bold text-gray-800">Extra Counts</Text>
          <TouchableOpacity
            onPress={() => router.push("/transfer-log")}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <History size={20} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white px-6 pt-4 pb-5 border-b border-gray-100 gap-2">
        <FilterRow
          icon={<Building2 size={14} color="#6366F1" />}
          label="Vendor"
          value={vendorName || "All"}
          active={!!vendorId}
          onPress={() => setShowVendorPicker(true)}
        />
        <FilterRow
          icon={<Ticket size={14} color="#6366F1" />}
          label="Draw"
          value={drawName || "All"}
          active={!!drawId}
          onPress={() => setShowDrawPicker(true)}
        />

        <Text className="text-gray-400 text-xs font-semibold mt-1">
          Type {types.length > 0 ? `(${types.length})` : ""}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <TouchableOpacity
            onPress={() => {
              setTypes([]);
              setSubTypes([]);
            }}
            className={`px-3 py-1.5 rounded-lg border ${
              types.length === 0
                ? "bg-indigo-50 border-indigo-300"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                types.length === 0 ? "text-indigo-700" : "text-gray-600"
              }`}
            >
              All
            </Text>
          </TouchableOpacity>
          {TYPES.map((t) => {
            const active = types.includes(t);
            return (
              <TouchableOpacity
                key={t}
                onPress={() => toggleType(t)}
                className={`px-3 py-1.5 rounded-lg border ${
                  active
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-indigo-700" : "text-gray-600"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-gray-400 text-xs font-semibold mt-2">
          Sub-type {subTypes.length > 0 ? `(${subTypes.length})` : ""}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <TouchableOpacity
            onPress={() => setSubTypes([])}
            className={`px-3 py-1.5 rounded-lg border ${
              subTypes.length === 0
                ? "bg-indigo-50 border-indigo-300"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                subTypes.length === 0 ? "text-indigo-700" : "text-gray-600"
              }`}
            >
              All
            </Text>
          </TouchableOpacity>
          {visibleSubTypes.map((st) => {
            const active = subTypes.includes(st);
            return (
              <TouchableOpacity
                key={st}
                onPress={() => toggleSubType(st)}
                className={`px-3 py-1.5 rounded-lg border ${
                  active
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-indigo-700" : "text-gray-600"
                    }`}
                >
                  {SUB_TYPE_LABELS[st]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
          <View className="flex-row gap-2 mt-1">
            <View className="px-3 py-1.5 rounded-lg bg-gray-100">
              <Text className="text-gray-500 text-xs">
                Records{" "}
                <Text className="text-gray-800 font-bold">{totalCount}</Text>
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-lg bg-red-50">
              <Text className="text-red-500 text-xs">
                Extra Total{" "}
                <Text className="text-red-700 font-bold">
                  {totalExtraFromServer}
                </Text>
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row gap-2">
        <ActionButton
          icon={<Copy size={14} color="#4338CA" />}
          label="Copy"
          onPress={handleCopyAll}
          busy={copyAll.isPending}
          tone="indigo"
        />
        <ActionButton
          icon={<Send size={14} color="#047857" />}
          label="Transfer"
          onPress={handleTransferAll}
          busy={transferAll.isPending}
          disabled={!drawId}
          tone="emerald"
        />
        <ActionButton
          icon={<Trash2 size={14} color="#B91C1C" />}
          label="Clear"
          onPress={handleClear}
          busy={clear.isPending}
          tone="red"
        />
      </View>

      {/* Body */}
      {isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
            <Text className="text-red-600 text-xl font-bold mb-2">
              Failed to load extra counts
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
          <Activity size={48} color="#D1D5DB" />
          <Text className="text-gray-400 text-lg mt-4">
            {hasFilters
              ? "No records match these filters"
              : "No extra-count records"}
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
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isFetchingNextPage}
                onRefresh={refetch}
                colors={["#4F46E5"]}
                tintColor="#4F46E5"
              />
            }
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                </View>
              ) : !hasNextPage && items.length > 0 ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                    End of list
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
      <PickerModal
        visible={showDrawPicker}
        title="Filter by Draw"
        clearLabel="All draws"
        searchPlaceholder="Search draws..."
        items={draws}
        selectedId={drawId}
        onSelect={(d) => setDrawId(d ? d.id : null)}
        onClose={() => setShowDrawPicker(false)}
      />
      <Modal
        visible={showTransferPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTransferPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Extras</Text>
              <TouchableOpacity
                onPress={() => setShowTransferPicker(false)}
                style={styles.modalClose}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                paddingHorizontal: 20,
                color: "#64748b",
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              {drawName
                ? `Draw: ${drawName} (today's session)`
                : "Today's session"}
            </Text>
            <Text
              style={{
                paddingHorizontal: 20,
                color: "#94a3b8",
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              Uncheck any vendors you don't want to transfer from.
            </Text>

            <View
              style={{
                flexDirection: "row",
                paddingHorizontal: 20,
                paddingVertical: 6,
                gap: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setAllTransferVendors(true)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: "#EEF2FF",
                }}
              >
                <Text
                  style={{
                    color: "#4338CA",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Select all
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAllTransferVendors(false)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    color: "#475569",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Clear all
                </Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <Text
                style={{
                  color: "#64748b",
                  fontSize: 12,
                  alignSelf: "center",
                }}
              >
                {selectedTransferVendorIds.size} / {transferCandidates.length}
              </Text>
            </View>

            {loadingCandidates ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            ) : transferCandidates.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Activity size={32} color="#D1D5DB" />
                <Text
                  style={{ color: "#94a3b8", fontSize: 13, marginTop: 10 }}
                >
                  No monitoring-enabled vendors found.
                </Text>
              </View>
            ) : (
              <FlatList
                data={transferCandidates}
                keyExtractor={(v) => v.id.toString()}
                style={{ maxHeight: 380 }}
                renderItem={({ item }) => {
                  const checked = selectedTransferVendorIds.has(item.id);
                  return (
                    <TouchableOpacity
                      onPress={() => toggleTransferVendor(item.id)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "#f1f5f9",
                        backgroundColor: checked ? "#F5F3FF" : "#ffffff",
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: checked ? "#4F46E5" : "#CBD5E1",
                          backgroundColor: checked ? "#4F46E5" : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        {checked && (
                          <AntDesign name="check" size={14} color="#ffffff" />
                        )}
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#0f172a",
                        }}
                      >
                        {item.name || `Vendor #${item.id}`}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 20,
                borderTopWidth: 1,
                borderTopColor: "#f1f5f9",
              }}
            >
              <TouchableOpacity
                onPress={() => setShowTransferPicker(false)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#F1F5F9",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#475569",
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmTransfer}
                disabled={
                  transferAll.isPending ||
                  selectedTransferVendorIds.size === 0 ||
                  transferCandidates.length === 0
                }
                activeOpacity={0.85}
                style={{
                  flex: 2,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#059669",
                  alignItems: "center",
                  opacity:
                    transferAll.isPending ||
                    selectedTransferVendorIds.size === 0 ||
                    transferCandidates.length === 0
                      ? 0.5
                      : 1,
                }}
              >
                {transferAll.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    Transfer {selectedTransferVendorIds.size} vendor
                    {selectedTransferVendorIds.size === 1 ? "" : "s"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  busy,
  disabled,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone: "indigo" | "emerald" | "red";
}) {
  const bgByTone: Record<typeof tone, string> = {
    indigo: "#EEF2FF",
    emerald: "#ECFDF5",
    red: "#FEF2F2",
  } as const;
  const textByTone: Record<typeof tone, string> = {
    indigo: "#4338CA",
    emerald: "#047857",
    red: "#B91C1C",
  } as const;
  const inactive = busy || disabled;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: bgByTone[tone],
        opacity: inactive ? 0.5 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={textByTone[tone]} />
      ) : (
        icon
      )}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: textByTone[tone],
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
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

const styles = StyleSheet.create({
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
