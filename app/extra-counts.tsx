import { Draw } from "@/hooks/use-draw";
import {
  COUNT_TYPE_LABELS,
  MonitoringCountType,
  MonitoringExtraCount,
} from "@/hooks/use-monitoring-extra-count";
import { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { AntDesign } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  ChevronDown,
  MoveLeft,
  Search,
  Ticket,
  TrendingUp,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COUNT_TYPES: MonitoringCountType[] = [
  "single_digit",
  "double_digit",
  "triple_digit_super",
  "triple_digit_box",
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
      <View style={styles.modalBackdrop}>
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
      </View>
    </Modal>
  );
}

function ExtraCountRow({ item }: { item: MonitoringExtraCount }) {
  const over = item.extra_count > 0;
  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <View
        className="h-1.5"
        style={{ backgroundColor: over ? "#F43F5E" : "#10B981" }}
      />
      <View className="p-5">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: over ? "#FEE2E2" : "#DCFCE7" }}
            >
              {over ? (
                <AlertTriangle size={18} color="#DC2626" />
              ) : (
                <TrendingUp size={18} color="#16A34A" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-800">
                {item.vendor_name || `Vendor #${item.vendor}`}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {item.draw_name || `Draw #${item.draw_session}`} · {item.session_date}
              </Text>
            </View>
          </View>
          <View
            className="px-2.5 py-1 rounded-md"
            style={{ backgroundColor: over ? "#FEE2E2" : "#DCFCE7" }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: over ? "#B91C1C" : "#15803D" }}
            >
              {COUNT_TYPE_LABELS[item.count_type]}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="bg-gray-50 px-3 py-2 rounded-lg flex-1">
            <Text className="text-gray-400 text-xs">Threshold</Text>
            <Text className="text-gray-800 font-bold text-sm">
              {item.monitoring_count}
            </Text>
          </View>
          <View className="bg-gray-50 px-3 py-2 rounded-lg flex-1">
            <Text className="text-gray-400 text-xs">Booked</Text>
            <Text className="text-gray-800 font-bold text-sm">
              {item.total_booked_count}
            </Text>
          </View>
          <View
            className="px-3 py-2 rounded-lg flex-1"
            style={{ backgroundColor: over ? "#FEE2E2" : "#F3F4F6" }}
          >
            <Text className="text-gray-400 text-xs">Extra</Text>
            <Text
              className="font-bold text-sm"
              style={{ color: over ? "#B91C1C" : "#1F2937" }}
            >
              {item.extra_count}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ExtraCountsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ drawId?: string; vendorId?: string }>();
  const initialDrawId = params.drawId ? Number(params.drawId) : null;
  const initialVendorId = params.vendorId ? Number(params.vendorId) : null;

  const [vendorId, setVendorId] = useState<number | null>(initialVendorId);
  const [drawId, setDrawId] = useState<number | null>(initialDrawId);
  const [date, setDate] = useState<Date | null>(null);
  const [countType, setCountType] = useState<MonitoringCountType | null>(null);

  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showDrawPicker, setShowDrawPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const queryKey = useMemo(
    () => [
      "extra-counts",
      vendorId,
      drawId,
      date?.toISOString().split("T")[0],
      countType,
    ],
    [vendorId, drawId, date, countType]
  );

  const {
    data: items = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<MonitoringExtraCount[]>({
    queryKey,
    queryFn: () => {
      const params: Record<string, any> = {};
      if (vendorId) params.vendor__id = vendorId;
      if (drawId) params.draw_session__draw__id = drawId;
      if (date) params.draw_session__session_date = date.toISOString().split("T")[0];
      if (countType) params.count_type = countType;
      return api
        .get("/draw-monitoring/extra-count/", { params })
        .then((r) => r.data);
    },
    retry: false,
  });

  const vendorName = vendors.find((v) => v.id === vendorId)?.name;
  const drawName = draws.find((d) => d.id === drawId)?.name;
  const hasFilters = !!vendorId || !!drawId || !!date || !!countType;

  const clearAll = () => {
    setVendorId(null);
    setDrawId(null);
    setDate(null);
    setCountType(null);
  };

  const overCount = items.filter((i) => i.extra_count > 0).length;

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
          <View className="w-10" />
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
        <FilterRow
          icon={<Calendar size={14} color="#6366F1" />}
          label="Date"
          value={date ? date.toISOString().split("T")[0] : "All"}
          active={!!date}
          onPress={() => setShowDatePicker(true)}
        />

        <View className="flex-row flex-wrap gap-2">
          <TouchableOpacity
            onPress={() => setCountType(null)}
            className={`px-3 py-1.5 rounded-lg border ${
              !countType
                ? "bg-indigo-50 border-indigo-300"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                !countType ? "text-indigo-700" : "text-gray-600"
              }`}
            >
              All types
            </Text>
          </TouchableOpacity>
          {COUNT_TYPES.map((ct) => {
            const active = countType === ct;
            return (
              <TouchableOpacity
                key={ct}
                onPress={() => setCountType(ct)}
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
                  {COUNT_TYPE_LABELS[ct]}
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
                Total{" "}
                <Text className="text-gray-800 font-bold">{items.length}</Text>
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-lg bg-red-50">
              <Text className="text-red-500 text-xs">
                Over threshold{" "}
                <Text className="text-red-700 font-bold">{overCount}</Text>
              </Text>
            </View>
          </View>
        )}
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
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
          renderItem={({ item }) => <ExtraCountRow item={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center mt-20">
              <Activity size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                {hasFilters
                  ? "No records match these filters"
                  : "No extra-count records"}
              </Text>
            </View>
          }
        />
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
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={date || new Date()}
          display={Platform.OS === "android" ? "default" : "spinner"}
          onChange={(event, picked) => {
            setShowDatePicker(false);
            if (event.type === "set" && picked) setDate(picked);
          }}
        />
      )}
    </View>
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
      className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${
        active
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
          className={`text-sm font-medium ${
            active ? "text-indigo-700" : "text-gray-800"
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
