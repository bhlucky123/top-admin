import useVendor, { Vendor } from "@/hooks/use-vendor";
import {
  COUNT_TYPE_LABELS,
  MonitoringCountType,
  MonitoringExtraCount,
} from "@/hooks/use-monitoring-extra-count";
import api from "@/utils/axios";
import { AntDesign } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  ChevronDown,
  Search,
  SlidersHorizontal,
  TrendingUp,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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

type Tab = "thresholds" | "extras";

const COUNT_TYPES: MonitoringCountType[] = [
  "single_digit",
  "double_digit",
  "triple_digit_super",
  "triple_digit_box",
];

// --- Picker Modal ---
function PickerModal<T extends { id: number; name: string }>({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  allowClear,
}: {
  visible: boolean;
  title: string;
  items: T[];
  selectedId: number | null;
  onSelect: (item: T | null) => void;
  onClose: () => void;
  allowClear?: boolean;
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
              placeholder="Search..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholderTextColor="#9ca3af"
            />
          </View>
          {allowClear && (
            <TouchableOpacity
              style={styles.clearRow}
              onPress={() => {
                onSelect(null);
                onClose();
              }}
            >
              <Text style={styles.clearText}>Clear selection</Text>
            </TouchableOpacity>
          )}
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

// --- Threshold Form (edits vendor monitoring fields via PATCH /vendors/{id}/) ---
function ThresholdForm({
  vendor,
  onClose,
}: {
  vendor: Vendor;
  onClose: () => void;
}) {
  const { editVendorAsync, isEditing } = useVendor();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    single: String(vendor.monitoring_single_digit_count ?? 0),
    double: String(vendor.monitoring_double_digit_count ?? 0),
    super: String(vendor.monitoring_triple_digit_super_count ?? 0),
    box: String(vendor.monitoring_triple_digit_box_count ?? 0),
  });
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  const validate = () => {
    const e: { [k: string]: string } = {};
    (["single", "double", "super", "box"] as const).forEach((k) => {
      const v = form[k];
      if (v === "" || isNaN(Number(v)) || Number(v) < 0) {
        e[k] = "Enter a valid count";
      }
    });
    setErrors(e);
    setTimeout(() => setErrors({}), 3000);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (isEditing) return;
    if (!validate()) return;

    try {
      await editVendorAsync({
        id: vendor.id,
        monitoring_single_digit_count: Number(form.single),
        monitoring_double_digit_count: Number(form.double),
        monitoring_triple_digit_super_count: Number(form.super),
        monitoring_triple_digit_box_count: Number(form.box),
      });
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
      onClose();
    } catch (err: any) {
      const msg =
        typeof err === "string" ? err : err?.message || "Something went wrong";
      Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.formContainer}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
          <AntDesign name="arrowleft" size={24} color="#6366F1" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>Edit Thresholds</Text>
        <View style={styles.vendorBadge}>
          <Building2 size={16} color="#4338CA" />
          <Text style={styles.vendorBadgeText}>{vendor.name}</Text>
        </View>

        <View style={styles.countsGrid}>
          {(
            [
              { key: "single", label: "Single Digit" },
              { key: "double", label: "Double Digit" },
              { key: "super", label: "Triple Super" },
              { key: "box", label: "Triple Box" },
            ] as const
          ).map((f) => (
            <View key={f.key} style={styles.countCol}>
              <Text style={styles.formLabel}>{f.label}</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                placeholder="0"
                value={form[f.key]}
                onChangeText={(text) =>
                  setForm((prev) => ({
                    ...prev,
                    [f.key]: text.replace(/[^0-9]/g, ""),
                  }))
                }
                placeholderTextColor="#9ca3af"
              />
              {errors[f.key] && (
                <Text style={styles.errorText}>{errors[f.key]}</Text>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isEditing}
          style={[styles.submitBtn, isEditing && { opacity: 0.7 }]}
        >
          <Text style={styles.submitBtnText}>
            {isEditing ? "Saving..." : "Save Thresholds"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Threshold Card ---
function ThresholdCard({
  item,
  onEdit,
}: {
  item: Vendor;
  onEdit: () => void;
}) {
  const values = [
    item.monitoring_single_digit_count,
    item.monitoring_double_digit_count,
    item.monitoring_triple_digit_super_count,
    item.monitoring_triple_digit_box_count,
  ];
  const hasAny = values.some((v) => (v ?? 0) > 0);

  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <View className="h-1.5" style={{ backgroundColor: "#6366F1" }} />
      <View className="p-5">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: "#6366F115" }}
            >
              <Activity size={18} color="#6366F1" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-800">
                {item.name}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {item.is_active ? "Active" : "Inactive"}
                {!hasAny ? " · no thresholds set" : ""}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onEdit}
            className="px-3 py-1.5 bg-gray-100 rounded-lg"
          >
            <Text className="text-gray-700 text-sm font-medium">Edit</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <CountBadge
            label="Single"
            value={item.monitoring_single_digit_count ?? 0}
          />
          <CountBadge
            label="Double"
            value={item.monitoring_double_digit_count ?? 0}
          />
          <CountBadge
            label="Triple Super"
            value={item.monitoring_triple_digit_super_count ?? 0}
          />
          <CountBadge
            label="Triple Box"
            value={item.monitoring_triple_digit_box_count ?? 0}
          />
        </View>
      </View>
    </View>
  );
}

function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <View className="bg-gray-50 px-3 py-2 rounded-lg">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text className="text-gray-800 font-bold text-sm">{value}</Text>
    </View>
  );
}

// --- Extra Count Card ---
function ExtraCountCard({ item }: { item: MonitoringExtraCount }) {
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
              style={{ backgroundColor: over ? "#F43F5E15" : "#10B98115" }}
            >
              {over ? (
                <AlertTriangle size={18} color="#F43F5E" />
              ) : (
                <TrendingUp size={18} color="#10B981" />
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
          <CountBadge label="Monitoring" value={item.monitoring_count} />
          <CountBadge label="Booked" value={item.total_booked_count} />
          <View
            className="px-3 py-2 rounded-lg"
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

// --- Main Screen ---
export default function MonitoringScreen() {
  const [tab, setTab] = useState<Tab>("thresholds");

  // Edit target
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterVendor, setFilterVendor] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterCountType, setFilterCountType] =
    useState<MonitoringCountType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Vendors (also used for filter picker on extras tab)
  const {
    data: vendors = [],
    isLoading: vendorsLoading,
    isFetching: vendorsFetching,
    isError: vendorsError,
    refetch: refetchVendors,
  } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/administrator/vendors/").then((r) => r.data),
    retry: false,
  });

  // Extra counts
  const extrasKey = useMemo(
    () => ["monitoring-extras", filterVendor, filterDate, filterCountType],
    [filterVendor, filterDate, filterCountType]
  );
  const {
    data: extras = [],
    isLoading: extrasLoading,
    isFetching: extrasFetching,
    isError: extrasError,
    refetch: refetchExtras,
  } = useQuery<MonitoringExtraCount[]>({
    queryKey: extrasKey,
    queryFn: () => {
      const params: Record<string, any> = {};
      if (filterVendor) params.vendor__id = filterVendor;
      if (filterDate)
        params.draw_session__session_date = filterDate
          .toISOString()
          .split("T")[0];
      if (filterCountType) params.count_type = filterCountType;
      return api
        .get("/draw-monitoring/extra-count/", { params })
        .then((r) => r.data);
    },
    enabled: tab === "extras",
    retry: false,
  });

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const clearFilters = () => {
    setFilterVendor(null);
    setFilterDate(null);
    setFilterCountType(null);
  };

  const hasFilters = !!filterVendor || !!filterDate || !!filterCountType;

  if (editVendor) {
    return (
      <ThresholdForm
        vendor={editVendor}
        onClose={() => setEditVendor(null)}
      />
    );
  }

  const isLoading = tab === "thresholds" ? vendorsLoading : extrasLoading;
  const isFetching = tab === "thresholds" ? vendorsFetching : extrasFetching;
  const isError = tab === "thresholds" ? vendorsError : extrasError;
  const refetch = tab === "thresholds" ? refetchVendors : refetchExtras;

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">Monitoring</Text>
        </View>

        {/* Segmented tabs */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-3">
          {([
            { key: "thresholds", label: "Thresholds" },
            { key: "extras", label: "Extra Counts" },
          ] as { key: Tab; label: string }[]).map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-lg items-center ${active ? "bg-white shadow-sm" : ""}`}
              >
                <Text
                  className={`text-sm font-semibold ${active ? "text-indigo-600" : "text-gray-500"}`}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === "thresholds" ? (
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2.5">
            <Search size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search vendors..."
              className="flex-1 ml-2 text-gray-800 text-base"
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9ca3af"
            />
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setShowFilters((s) => !s)}
              className="flex-row items-center justify-between bg-gray-100 rounded-xl px-4 py-2.5"
            >
              <View className="flex-row items-center">
                <SlidersHorizontal size={16} color="#6366F1" />
                <Text className="text-gray-800 font-medium ml-2">
                  Filters
                  {hasFilters ? (
                    <Text className="text-indigo-600"> · active</Text>
                  ) : null}
                </Text>
              </View>
              <ChevronDown
                size={16}
                color="#6366F1"
                style={{
                  transform: [{ rotate: showFilters ? "180deg" : "0deg" }],
                }}
              />
            </TouchableOpacity>

            {showFilters && (
              <View className="mt-3 gap-2">
                <FilterChip
                  icon={<Building2 size={14} color="#6366F1" />}
                  label="Vendor"
                  value={
                    filterVendor
                      ? vendors.find((v) => v.id === filterVendor)?.name ?? "—"
                      : "All"
                  }
                  onPress={() => setShowVendorPicker(true)}
                  active={!!filterVendor}
                />
                <FilterChip
                  icon={<Calendar size={14} color="#6366F1" />}
                  label="Session Date"
                  value={
                    filterDate ? filterDate.toISOString().split("T")[0] : "All"
                  }
                  onPress={() => setShowDatePicker(true)}
                  active={!!filterDate}
                />
                <View className="flex-row flex-wrap gap-2 mt-1">
                  {COUNT_TYPES.map((ct) => {
                    const active = filterCountType === ct;
                    return (
                      <TouchableOpacity
                        key={ct}
                        onPress={() =>
                          setFilterCountType(active ? null : ct)
                        }
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
                    onPress={clearFilters}
                    className="self-end mt-1 px-3 py-1.5"
                  >
                    <Text className="text-red-600 text-xs font-semibold">
                      Clear filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>

      {/* List */}
      {isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
            <Text className="text-red-600 text-xl font-bold mb-2">
              Failed to load data
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
      ) : tab === "thresholds" ? (
        <FlatList
          data={filteredVendors}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
          renderItem={({ item }) => (
            <ThresholdCard item={item} onEdit={() => setEditVendor(item)} />
          )}
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
                {search ? "No vendors match your search" : "No vendors yet"}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={extras}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
          renderItem={({ item }) => <ExtraCountCard item={item} />}
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
              <TrendingUp size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                No extra-count records
              </Text>
            </View>
          }
        />
      )}

      <PickerModal
        visible={showVendorPicker}
        title="Filter by Vendor"
        items={vendors}
        selectedId={filterVendor}
        onSelect={(v) => setFilterVendor(v ? v.id : null)}
        onClose={() => setShowVendorPicker(false)}
        allowClear
      />
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={filterDate || new Date()}
          display={Platform.OS === "android" ? "default" : "spinner"}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === "set" && date) setFilterDate(date);
          }}
        />
      )}
    </View>
  );
}

function FilterChip({
  icon,
  label,
  value,
  onPress,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between px-3 py-2.5 rounded-xl border ${
        active ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200"
      }`}
    >
      <View className="flex-row items-center">
        {icon}
        <Text className="ml-2 text-gray-500 text-xs font-semibold">{label}</Text>
      </View>
      <View className="flex-row items-center">
        <Text
          className={`text-sm font-medium ${
            active ? "text-indigo-700" : "text-gray-800"
          }`}
        >
          {value}
        </Text>
        <ChevronDown size={14} color="#6366F1" style={{ marginLeft: 6 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  formContent: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtnText: {
    color: "#6366F1",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  vendorBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 24,
  },
  vendorBadgeText: {
    marginLeft: 8,
    color: "#4338CA",
    fontWeight: "600",
    fontSize: 14,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    marginTop: 4,
  },
  formInput: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1e293b",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 4,
  },
  countsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  countCol: {
    width: "47%",
    flexGrow: 1,
  },
  submitBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
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
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
});
