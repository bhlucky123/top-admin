import useVendor, { Vendor } from "@/hooks/use-vendor";
import api from "@/utils/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Building2, ChevronRight, MoveLeft, Plus, Search } from "lucide-react-native";
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

// --- Vendor Form ---
function VendorForm({
  onSubmit,
  defaultValues,
  onCancel,
  submitting,
}: {
  onSubmit: (data: { name: string }) => void;
  defaultValues?: Partial<Vendor>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(defaultValues?.name || "");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Vendor name is required");
      return;
    }
    setError("");
    onSubmit({ name: name.trim() });
  };

  const isEdit = !!defaultValues?.id;

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
            {isEdit ? "Edit Vendor" : "New Vendor"}
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-2 ml-1">
              Vendor Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className={`border-2 rounded-xl px-4 py-4 bg-white text-gray-800 font-medium ${
                error
                  ? "border-red-300 bg-red-50"
                  : name.trim()
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200"
              }`}
              placeholder="Enter vendor name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError("");
              }}
              autoCapitalize="words"
              autoFocus
            />
            {error && (
              <Text className="text-red-500 text-sm mt-1 ml-1 font-medium">
                {error}
              </Text>
            )}
          </View>

          <TouchableOpacity
            className={`bg-indigo-600 py-4 rounded-xl shadow-lg ${
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
                ? "Update Vendor"
                : "Create Vendor"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- Vendor Card ---
function VendorCard({
  item,
  onEdit,
  onDelete,
  onPress,
}: {
  item: Vendor;
  onEdit: () => void;
  onDelete: () => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white mx-4 mb-3 rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
      activeOpacity={0.7}
    >
      <View className="h-1 bg-indigo-500" />
      <View className="p-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center mr-3">
              <Building2 size={18} color="#4F46E5" />
            </View>
            <Text className="text-lg font-bold text-gray-800">
              {item.name}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={onEdit}
              className="px-3 py-1.5 bg-gray-100 rounded-lg"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 text-sm font-medium">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              className="px-3 py-1.5 bg-red-50 rounded-lg"
              activeOpacity={0.7}
            >
              <Text className="text-red-600 text-sm font-medium">Delete</Text>
            </TouchableOpacity>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// --- Main Screen ---
export default function VendorsScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data: vendors = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/administrator/vendors/").then((r) => r.data),
    retry: false,
  });

  const { createVendor, editVendor, deleteVendor } = useVendor();

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (data: { name: string }) => {
    setSubmitting(true);
    createVendor(data, {
      onSuccess: (newVendor) => {
        queryClient.setQueryData<Vendor[]>(["vendors"], (old) => [
          newVendor,
          ...(old || []),
        ]);
        setShowForm(false);
        setSubmitting(false);
      },
      onError: (err: any) => {
        setSubmitting(false);
        const msg =
          err?.message?.name?.[0] ||
          err?.message?.detail ||
          (typeof err?.message === "string" ? err.message : "Failed to create vendor.");
        Alert.alert("Error", msg);
      },
    });
  };

  const handleEdit = (data: { name: string }) => {
    if (!editData) return;
    setSubmitting(true);
    editVendor(
      { id: editData.id, ...data },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData<Vendor[]>(["vendors"], (old) =>
            old?.map((v) => (v.id === updated.id ? updated : v)) || []
          );
          setShowForm(false);
          setEditData(null);
          setSubmitting(false);
        },
        onError: (err: any) => {
          setSubmitting(false);
          const msg =
            err?.message?.name?.[0] ||
            (typeof err?.message === "string" ? err.message : "Failed to update vendor.");
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const handleDelete = (vendor: Vendor) => {
    Alert.alert(
      "Delete Vendor",
      `Are you sure you want to delete "${vendor.name}"? This will also remove all associated data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteVendor(
              { id: vendor.id },
              { onSuccess: () => refetch() }
            );
          },
        },
      ]
    );
  };

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center px-8 bg-white">
        <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
          <Text className="text-3xl mb-3">!</Text>
          <Text className="text-red-600 text-xl font-bold mb-2 text-center">
            Failed to load vendors
          </Text>
          <Text className="text-gray-600 mb-6 text-center text-sm">
            {typeof (error as any)?.message === "string"
              ? (error as any).message
              : "Please check your connection and try again."}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-indigo-600 px-8 py-3 rounded-xl"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showForm) {
    return (
      <VendorForm
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

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">Vendors</Text>
          <TouchableOpacity
            onPress={() => {
              setEditData(null);
              setShowForm(true);
            }}
            className="w-11 h-11 bg-indigo-600 rounded-full items-center justify-center shadow-md"
            activeOpacity={0.85}
          >
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2.5">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search vendors..."
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
          <Text className="mt-4 text-gray-500">Loading vendors...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
          renderItem={({ item }) => (
            <VendorCard
              item={item}
              onEdit={() => {
                setEditData(item);
                setShowForm(true);
              }}
              onDelete={() => handleDelete(item)}
              onPress={() =>
                router.push({
                  pathname: "/vendor/[id]",
                  params: { id: String(item.id), name: item.name },
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
              <Building2 size={48} color="#D1D5DB" />
              <Text className="text-gray-400 text-lg mt-4">
                {searchQuery ? "No vendors match your search" : "No vendors yet"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  onPress={() => setShowForm(true)}
                  className="mt-4 bg-indigo-600 px-6 py-2.5 rounded-xl"
                >
                  <Text className="text-white font-semibold">
                    Create First Vendor
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}
