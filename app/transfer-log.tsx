import { Draw } from "@/hooks/use-draw";
import { MonitoringTransferLog } from "@/hooks/use-monitoring-actions";
import { SUB_TYPE_LABELS, TYPE_LABELS } from "@/hooks/use-monitoring-extra-count";
import { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { AntDesign } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Building2,
  Calendar,
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
  Platform,
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
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={pickerStyles.modalBackdrop}>
        <View style={pickerStyles.modalSheet}>
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
      </View>
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

function TableHeader() {
  return (
    <View style={tableStyles.headerRow}>
      <Text style={[tableStyles.headerCell, { flex: COL_FLEX.from }]}>
        From
      </Text>
      <Text style={[tableStyles.headerCell, { flex: COL_FLEX.to }]}>To</Text>
      <Text style={[tableStyles.headerCell, { flex: COL_FLEX.number }]}>
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ArrowRight size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
          <Text style={tableStyles.cellText} numberOfLines={1}>
            {item.to_vendor_name || `#${item.to_vendor}`}
          </Text>
        </View>
        <Text style={tableStyles.cellSub} numberOfLines={1}>
          {item.session_date}
        </Text>
      </View>
      <Text
        style={[
          tableStyles.cellText,
          tableStyles.cellBold,
          { flex: COL_FLEX.number, paddingHorizontal: 8, paddingVertical: 10 },
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

  const [drawId, setDrawId] = useState<number | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [fromVendorId, setFromVendorId] = useState<number | null>(null);
  const [toVendorId, setToVendorId] = useState<number | null>(null);

  const [showDrawPicker, setShowDrawPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

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
      "transfer-log",
      drawId,
      date?.toISOString().split("T")[0],
      fromVendorId,
      toVendorId,
    ],
    [drawId, date, fromVendorId, toVendorId]
  );

  const {
    data: items = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<MonitoringTransferLog[]>({
    queryKey,
    queryFn: () => {
      const params: Record<string, any> = {};
      if (drawId) params.draw_session__draw__id = drawId;
      if (date)
        params.draw_session__session_date = date.toISOString().split("T")[0];
      if (fromVendorId) params.from_vendor__id = fromVendorId;
      if (toVendorId) params.to_vendor__id = toVendorId;
      return api
        .get("/draw-monitoring/transfer-log/", { params })
        .then((r) => r.data);
    },
    retry: false,
  });

  const drawName = draws.find((d) => d.id === drawId)?.name;
  const fromName = vendors.find((v) => v.id === fromVendorId)?.name;
  const toName = vendors.find((v) => v.id === toVendorId)?.name;
  const hasFilters =
    !!drawId || !!date || !!fromVendorId || !!toVendorId;

  const clearAll = () => {
    setDrawId(null);
    setDate(null);
    setFromVendorId(null);
    setToVendorId(null);
  };

  const totalCount = items.reduce((sum, i) => sum + i.count, 0);

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
        <FilterRow
          icon={<Building2 size={14} color="#6366F1" />}
          label="From"
          value={fromName || "All"}
          active={!!fromVendorId}
          onPress={() => setShowFromPicker(true)}
        />
        <FilterRow
          icon={<Building2 size={14} color="#6366F1" />}
          label="To"
          value={toName || "All"}
          active={!!toVendorId}
          onPress={() => setShowToPicker(true)}
        />

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
                Transfers{" "}
                <Text className="text-gray-800 font-bold">{items.length}</Text>
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-lg bg-indigo-50">
              <Text className="text-indigo-500 text-xs">
                Total Count{" "}
                <Text className="text-indigo-700 font-bold">{totalCount}</Text>
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
        <View style={{ flex: 1 }}>
          <TableHeader />
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={refetch}
                colors={["#4F46E5"]}
                tintColor="#4F46E5"
              />
            }
          >
            {items.map((item, index) => (
              <TableRow key={item.id} item={item} even={index % 2 === 0} />
            ))}
          </ScrollView>
        </View>
      )}

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
      <PickerModal
        visible={showFromPicker}
        title="Transferred From"
        clearLabel="All vendors"
        searchPlaceholder="Search vendors..."
        items={vendors}
        selectedId={fromVendorId}
        onSelect={(v) => setFromVendorId(v ? v.id : null)}
        onClose={() => setShowFromPicker(false)}
      />
      <PickerModal
        visible={showToPicker}
        title="Transferred To"
        clearLabel="All vendors"
        searchPlaceholder="Search vendors..."
        items={vendors}
        selectedId={toVendorId}
        onSelect={(v) => setToVendorId(v ? v.id : null)}
        onClose={() => setShowToPicker(false)}
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
