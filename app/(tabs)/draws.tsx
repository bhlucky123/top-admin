import useDraw, { Draw } from "@/hooks/use-draw";
import api from "@/utils/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, MoveLeft, Palette, Plus, Search, Ticket } from "lucide-react-native";
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// --- Draw Form ---
function DrawForm({
  onSubmit,
  defaultValues,
  onCancel,
  submitting,
}: {
  onSubmit: (data: any) => void;
  defaultValues?: Partial<Draw>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState({
    name: defaultValues?.name || "",
    valid_from: defaultValues?.valid_from || "",
    valid_till: defaultValues?.valid_till || "",
    cut_off_time: defaultValues?.cut_off_time || "",
    draw_time: defaultValues?.draw_time || "",
    color_theme: defaultValues?.color_theme || "#6366f1",
    non_single_digit_price: defaultValues?.non_single_digit_price?.toString() || "",
    single_digit_number_price: defaultValues?.single_digit_number_price?.toString() || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const isEdit = !!defaultValues?.id;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.valid_from.trim()) newErrors.valid_from = "Required";
    if (!form.valid_till.trim()) newErrors.valid_till = "Required";
    if (!form.cut_off_time.trim()) newErrors.cut_off_time = "Required";
    if (!form.draw_time.trim()) newErrors.draw_time = "Required";
    if (!form.non_single_digit_price) newErrors.non_single_digit_price = "Required";
    if (!form.single_digit_number_price) newErrors.single_digit_number_price = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...form,
      non_single_digit_price: Number(form.non_single_digit_price),
      single_digit_number_price: Number(form.single_digit_number_price),
      ...(isEdit ? { id: defaultValues?.id } : {}),
    });
  };

  const fields = [
    { key: "name", label: "Draw Name", keyboard: "default" as const, placeholder: "e.g. Morning Draw" },
    { key: "valid_from", label: "Valid From (Time)", keyboard: "default" as const, placeholder: "HH:MM:SS e.g. 09:00:00" },
    { key: "valid_till", label: "Valid Till (Time)", keyboard: "default" as const, placeholder: "HH:MM:SS e.g. 12:00:00" },
    { key: "cut_off_time", label: "Cut-off Time", keyboard: "default" as const, placeholder: "HH:MM:SS e.g. 11:30:00" },
    { key: "draw_time", label: "Draw Time", keyboard: "default" as const, placeholder: "HH:MM:SS e.g. 12:00:00" },
    { key: "color_theme", label: "Color Theme (Hex)", keyboard: "default" as const, placeholder: "#6366f1" },
    { key: "non_single_digit_price", label: "Non-Single Digit Price", keyboard: "numeric" as const, placeholder: "e.g. 10" },
    { key: "single_digit_number_price", label: "Single Digit Price", keyboard: "numeric" as const, placeholder: "e.g. 100" },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View className="bg-white shadow-sm border-b border-gray-100">
        <View className="flex-row items-center justify-between px-6 pt-14 pb-4">
          <TouchableOpacity
            onPress={onCancel}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <MoveLeft size={22} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">
            {isEdit ? "Edit Draw" : "New Draw"}
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {fields.map(({ key, label, keyboard, placeholder }) => {
            const isFocused = focusedField === key;
            const hasError = !!errors[key];
            const value = form[key as keyof typeof form];
            const hasValue = !!value;

            return (
              <View key={key} className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2 ml-1">
                  {label} <Text className="text-red-500">*</Text>
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder={placeholder}
                    className={`border-2 rounded-xl px-4 py-3.5 bg-white text-gray-800 font-medium ${
                      hasError
                        ? "border-red-300 bg-red-50"
                        : isFocused
                        ? "border-indigo-400 bg-indigo-50"
                        : hasValue
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                    value={value}
                    onChangeText={(text) => handleChange(key, text)}
                    onFocus={() => setFocusedField(key)}
                    onBlur={() => setFocusedField(null)}
                    keyboardType={keyboard}
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                  {key === "color_theme" && hasValue && /^#[0-9a-fA-F]{6}$/.test(value) && (
                    <View
                      className="absolute right-4 top-1/2 -mt-3 w-6 h-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: value }}
                    />
                  )}
                </View>
                {hasError && (
                  <Text className="text-red-500 text-sm mt-1 ml-1 font-medium">
                    {errors[key]}
                  </Text>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            className={`bg-indigo-600 py-4 rounded-xl shadow-lg mt-2 mb-8 ${
              submitting ? "opacity-60" : ""
            }`}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.9}
          >
            <Text className="text-white text-center font-bold text-lg">
              {submitting
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                ? "Update Draw"
                : "Create Draw"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- Draw Card ---
function DrawCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Draw & { id: number };
  onEdit: () => void;
  onDelete: () => void;
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
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<(Draw & { id: number }) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data: draws = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery<(Draw & { id: number })[]>({
    queryKey: ["draws"],
    queryFn: () => api.get("/draw/").then((r) => r.data),
    retry: false,
  });

  const { createDraw, updateDraw, deleteDraw } = useDraw();

  const filtered = draws.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (data: any) => {
    setSubmitting(true);
    createDraw(data, {
      onSuccess: () => {
        refetch();
        setShowForm(false);
        setSubmitting(false);
      },
      onError: (err: any) => {
        setSubmitting(false);
        const msg = typeof err === "string" ? err : err?.message || "Failed to create draw.";
        Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
      },
    });
  };

  const handleEdit = (data: any) => {
    setSubmitting(true);
    updateDraw(data, {
      onSuccess: () => {
        refetch();
        setShowForm(false);
        setEditData(null);
        setSubmitting(false);
      },
      onError: (err: any) => {
        setSubmitting(false);
        const msg = typeof err === "string" ? err : err?.message || "Failed to update draw.";
        Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
      },
    });
  };

  const handleDelete = (draw: Draw & { id: number }) => {
    Alert.alert("Delete Draw", `Delete "${draw.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteDraw({ id: draw.id }, { onSuccess: () => refetch() }),
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
        onSubmit={editData ? handleEdit : handleCreate}
        defaultValues={editData || {}}
        onCancel={() => {
          setShowForm(false);
          setEditData(null);
        }}
        submitting={submitting}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">Draws</Text>
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
