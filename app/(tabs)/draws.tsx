import useDraw, { Draw, DrawType } from "@/hooks/use-draw";
import api from "@/utils/axios";
import { AntDesign, Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Activity, Clock, Palette, Plus, Search, Ticket } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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

const getContrastYIQ = (hexcolor: string) => {
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
};

// --- Draw Form ---
const DrawForm = ({ initialData, onClose }: { initialData?: any; onClose: () => void }) => {
  const isEdit = !!initialData;
  const [form, setForm] = useState(
    initialData
      ? {
          ...initialData,
          valid_from: new Date(initialData.valid_from),
          valid_till: new Date(initialData.valid_till),
          cut_off_time: new Date(`1970-01-01T${initialData.cut_off_time}`),
          draw_time: new Date(`1970-01-01T${initialData.draw_time}`),
          type: initialData.type || "default",
        }
      : {
          name: "",
          valid_from: new Date(),
          valid_till: new Date(),
          cut_off_time: new Date(),
          draw_time: new Date(),
          color_theme: "#8B5CF6",
          non_single_digit_price: "",
          single_digit_number_price: "",
          type: "default" as DrawType,
        }
  );
  const [showDatePicker, setShowDatePicker] = useState<null | string>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const { createDraw, updateDraw } = useDraw();
  const queryClient = useQueryClient();

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.name || !form.name.trim()) {
      newErrors.name = "Draw name is required";
    } else if (form.name.length < 2) {
      newErrors.name = "Draw name is too short";
    }

    if (!form.color_theme) {
      newErrors.color_theme = "Color theme is required";
    }

    if (
      form.non_single_digit_price === "" ||
      isNaN(Number(form.non_single_digit_price)) ||
      Number(form.non_single_digit_price) <= 0
    ) {
      newErrors.non_single_digit_price = "Enter a valid price";
    }
    if (
      form.single_digit_number_price === "" ||
      isNaN(Number(form.single_digit_number_price)) ||
      Number(form.single_digit_number_price) <= 0
    ) {
      newErrors.single_digit_number_price = "Enter a valid price";
    }

    if (!(form.valid_from instanceof Date) || isNaN(form.valid_from.getTime())) {
      newErrors.valid_from = "Valid from date is required";
    }
    if (!(form.valid_till instanceof Date) || isNaN(form.valid_till.getTime())) {
      newErrors.valid_till = "Valid till date is required";
    }
    if (
      form.valid_from instanceof Date &&
      form.valid_till instanceof Date &&
      form.valid_till < form.valid_from
    ) {
      newErrors.valid_till = "Valid till must be after valid from";
    }

    if (!(form.cut_off_time instanceof Date) || isNaN(form.cut_off_time.getTime())) {
      newErrors.cut_off_time = "Cut off time is required";
    }
    if (!(form.draw_time instanceof Date) || isNaN(form.draw_time.getTime())) {
      newErrors.draw_time = "Draw time is required";
    }
    if (
      form.cut_off_time instanceof Date &&
      form.draw_time instanceof Date &&
      (form.cut_off_time.getHours() > form.draw_time.getHours() ||
        (form.cut_off_time.getHours() === form.draw_time.getHours() &&
          form.cut_off_time.getMinutes() >= form.draw_time.getMinutes()))
    ) {
      newErrors.cut_off_time = "Cut off time must be before draw time";
    }

    setErrors(newErrors);

    setTimeout(() => {
      setErrors({});
    }, 3000);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);

    const formatTime = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const data = {
      name: form.name,
      valid_from: form.valid_from.toISOString().split("T")[0],
      valid_till: form.valid_till.toISOString().split("T")[0],
      cut_off_time: formatTime(form.cut_off_time),
      draw_time: formatTime(form.draw_time),
      color_theme: form.color_theme,
      non_single_digit_price: Number(form.non_single_digit_price),
      single_digit_number_price: Number(form.single_digit_number_price),
      type: form.type,
    };

    try {
      if (isEdit) {
        const updated = await updateDraw.mutateAsync({ ...data, id: initialData.id });
        queryClient.setQueryData(["draws"], (old: any) =>
          old?.map((d: any) => (d.id === updated.id ? updated : d))
        );
      } else {
        await createDraw.mutateAsync(data as any);
        await queryClient.invalidateQueries({ queryKey: ["draws"] });
      }
      onClose();
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "Something went wrong";
      Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const colorPalette = [
    "#8B5CF6", "#F59E42", "#F43F5E", "#10B981", "#3B82F6",
    "#FBBF24", "#6366F1", "#A21CAF", "#F472B6", "#22D3EE",
  ];

  return (
    <KeyboardAvoidingView style={styles.formContainer}>
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
          <AntDesign name="arrowleft" size={24} color="#6366F1" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>
          {isEdit ? "Edit" : "Create"} Draw
        </Text>

        {/* Name */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.formLabel}>Draw Name</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Enter draw name"
            value={form.name}
            onChangeText={(text) => setForm((prev: typeof form) => ({ ...prev, name: text }))}
            placeholderTextColor="#9ca3af"
          />
          {errors.name && (
            <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>{errors.name}</Text>
          )}
        </View>

        {/* Color Theme */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.formLabel}>Color Theme</Text>
          <View style={styles.colorPaletteRow}>
            {colorPalette.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setForm((prev: typeof form) => ({ ...prev, color_theme: color }))}
                style={[
                  styles.colorCircle,
                  {
                    backgroundColor: color,
                    borderWidth: form.color_theme === color ? 3 : 1,
                    borderColor: form.color_theme === color ? "#6366F1" : "#e5e7eb",
                  },
                ]}
                activeOpacity={0.7}
              >
                {form.color_theme === color && (
                  <AntDesign name="check" size={20} color={getContrastYIQ(color)} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          {errors.color_theme && (
            <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>{errors.color_theme}</Text>
          )}
        </View>

        {/* Draw Type */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.formLabel}>Draw Type</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {([
              { value: "default", label: "Default" },
              { value: "kerala", label: "Kerala" },
              { value: "tamil_nadu", label: "Tamil Nadu" },
            ] as { value: DrawType; label: string }[]).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setForm((prev: typeof form) => ({ ...prev, type: opt.value }))}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: form.type === opt.value ? "#6366F1" : "#e2e8f0",
                  backgroundColor: form.type === opt.value ? "#EEF2FF" : "#fff",
                  alignItems: "center",
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontWeight: "600",
                    fontSize: 13,
                    color: form.type === opt.value ? "#4338CA" : "#64748B",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Prices */}
        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <Text style={styles.formLabel}>Non-Single Digit Price</Text>
            <TextInput
              style={styles.formInput}
              placeholder="₹"
              keyboardType="numeric"
              value={form.non_single_digit_price.toString()}
              onChangeText={(text) =>
                setForm((prev: typeof form) => ({
                  ...prev,
                  non_single_digit_price: text.replace(/[^0-9.]/g, ""),
                }))
              }
              placeholderTextColor="#9ca3af"
            />
            {errors.non_single_digit_price && (
              <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>
                {errors.non_single_digit_price}
              </Text>
            )}
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.formLabel}>Single Digit Price</Text>
            <TextInput
              style={styles.formInput}
              placeholder="₹"
              keyboardType="numeric"
              value={form.single_digit_number_price.toString()}
              onChangeText={(text) =>
                setForm((prev: typeof form) => ({
                  ...prev,
                  single_digit_number_price: text.replace(/[^0-9.]/g, ""),
                }))
              }
              placeholderTextColor="#9ca3af"
            />
            {errors.single_digit_number_price && (
              <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>
                {errors.single_digit_number_price}
              </Text>
            )}
          </View>
        </View>

        {/* Dates & Times */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.formLabel}>Valid From</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            activeOpacity={0.8}
            onPress={() => setShowDatePicker("valid_from")}
          >
            <Text style={styles.dateBtnText}>
              {`${form.valid_from.getDate().toString().padStart(2, "0")}/${(form.valid_from.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${form.valid_from.getFullYear()}`}
            </Text>
            <AntDesign name="calendar" size={20} color="#6366f1" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          {errors.valid_from && (
            <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>{errors.valid_from}</Text>
          )}

          <Text style={styles.formLabel}>Valid Till</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            activeOpacity={0.8}
            onPress={() => setShowDatePicker("valid_till")}
          >
            <Text style={styles.dateBtnText}>
              {`${form.valid_till.getDate().toString().padStart(2, "0")}/${(form.valid_till.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${form.valid_till.getFullYear()}`}
            </Text>
            <AntDesign name="calendar" size={20} color="#6366f1" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          {errors.valid_till && (
            <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>{errors.valid_till}</Text>
          )}

          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Cut Off Time</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              activeOpacity={0.85}
              onPress={() => setShowDatePicker("cut_off_time")}
            >
              <Feather name="clock" size={18} color="#6366f1" style={{ marginRight: 6 }} />
              <Text style={styles.timeBtnText}>
                {form.cut_off_time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.cut_off_time && (
            <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>{errors.cut_off_time}</Text>
          )}

          <View style={[styles.timeRow, { marginBottom: 12 }]}>
            <Text style={styles.timeLabel}>Draw Time</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              activeOpacity={0.85}
              onPress={() => setShowDatePicker("draw_time")}
            >
              <Feather name="clock" size={18} color="#6366f1" style={{ marginRight: 6 }} />
              <Text style={styles.timeBtnText}>
                {form.draw_time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.draw_time && (
            <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>{errors.draw_time}</Text>
          )}
        </View>

        <View style={{ marginBottom: 32 }}>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              submitting ? { opacity: 0.7 } : undefined,
            ]}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update" : "Create") + " Draw"}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            mode={showDatePicker.includes("time") ? "time" : "date"}
            value={form[showDatePicker as keyof typeof form] as Date}
            display={Platform.OS === "android" ? "default" : "spinner"}
            onChange={(event, date) => {
              if (date) setForm((prev: typeof form) => ({ ...prev, [showDatePicker]: date }));
              setShowDatePicker(null);
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// --- Draw Card ---
function DrawCard({
  item,
  onEdit,
  onDelete,
  onMonitor,
}: {
  item: Draw & { id: number };
  onEdit: () => void;
  onDelete: () => void;
  onMonitor: () => void;
}) {
  const themeColor = item.color_theme && /^#[0-9a-fA-F]{6}$/.test(item.color_theme)
    ? item.color_theme
    : "#6366f1";

  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <View className="h-1.5" style={{ backgroundColor: themeColor }} />
      <View className="p-5">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Ticket size={18} color={themeColor} />
            </View>
            <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onMonitor}
              className="px-3 py-1.5 bg-indigo-50 rounded-lg flex-row items-center"
            >
              <Activity size={13} color="#4F46E5" />
              <Text className="text-indigo-600 text-sm font-medium ml-1">
                Monitor
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onEdit}
              className="px-3 py-1.5 bg-gray-100 rounded-lg"
            >
              <Text className="text-gray-700 text-sm font-medium">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              className="px-3 py-1.5 bg-red-50 rounded-lg"
            >
              <Text className="text-red-600 text-sm font-medium">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2 mb-1">
          {item.type && item.type !== "default" && (
            <View className={`px-2 py-0.5 rounded-md ${item.type === "kerala" ? "bg-orange-50" : "bg-teal-50"}`}>
              <Text className={`text-xs font-semibold ${item.type === "kerala" ? "text-orange-600" : "text-teal-600"}`}>
                {item.type === "kerala" ? "Kerala" : "Tamil Nadu"}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row flex-wrap gap-3">
          <View className="flex-row items-center">
            <Clock size={13} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-1">
              Draw: {item.draw_time}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Clock size={13} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-1">
              Cut-off: {item.cut_off_time}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Palette size={13} color={themeColor} />
            <Text className="text-gray-500 text-xs ml-1">
              {item.color_theme}
            </Text>
          </View>
        </View>

        <View className="flex-row mt-3 gap-4">
          <View className="bg-gray-50 px-3 py-2 rounded-lg">
            <Text className="text-gray-400 text-xs">Non-Single Price</Text>
            <Text className="text-gray-800 font-bold text-sm">
              {item.non_single_digit_price}
            </Text>
          </View>
          <View className="bg-gray-50 px-3 py-2 rounded-lg">
            <Text className="text-gray-400 text-xs">Single Digit Price</Text>
            <Text className="text-gray-800 font-bold text-sm">
              {item.single_digit_number_price}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function DrawsScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<(Draw & { id: number }) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: draws = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<(Draw & { id: number })[]>({
    queryKey: ["draws"],
    queryFn: () => api.get("/draw/").then((r) => r.data),
    retry: false,
  });

  const { deleteDraw } = useDraw();

  const filtered = draws.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (draw: Draw & { id: number }) => {
    Alert.alert("Delete Draw", `Delete "${draw.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteDraw.mutate({ id: draw.id }, { onSuccess: () => refetch() }),
      },
    ]);
  };

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center px-8 bg-white">
        <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
          <Text className="text-red-600 text-xl font-bold mb-2">
            Failed to load draws
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-indigo-600 px-8 py-3 rounded-xl mt-4"
          >
            <Text className="text-white font-bold text-base">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showForm) {
    return (
      <DrawForm
        initialData={editData}
        onClose={() => {
          setShowForm(false);
          setEditData(null);
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">Draws</Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => router.push("/extra-counts")}
              className="w-11 h-11 bg-gray-100 rounded-full items-center justify-center"
              activeOpacity={0.85}
            >
              <Activity size={20} color="#4F46E5" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditData(null);
                setShowForm(true);
              }}
              className="w-11 h-11 bg-indigo-600 rounded-full items-center justify-center shadow-md"
            >
              <Plus size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2.5">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search draws..."
            className="flex-1 ml-2 text-gray-800 text-base"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-4 text-gray-500">Loading draws...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
          renderItem={({ item }) => (
            <DrawCard
              item={item}
              onEdit={() => {
                setEditData(item);
                setShowForm(true);
              }}
              onDelete={() => handleDelete(item)}
              onMonitor={() =>
                router.push({
                  pathname: "/extra-counts",
                  params: { drawId: String(item.id) },
                })
              }
            />
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
              <Ticket size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                {searchQuery ? "No draws match your search" : "No draws yet"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  formScroll: {
    flex: 1,
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
    marginBottom: 28,
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
  colorPaletteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  priceCol: {
    flex: 1,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  dateBtnText: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  timeBtnText: {
    fontSize: 15,
    color: "#4338ca",
    fontWeight: "600",
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
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});
