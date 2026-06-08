import api from "@/utils/axios";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Vendor = { id: number; name: string };

/**
 * Super-admin-only vendor selector for report screens.
 * `value` is the selected vendor id, or null for "All Vendors".
 * Passing the id as the `vendor` query param scopes the report to that vendor.
 */
export default function VendorFilter({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (vendorId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/administrator/vendors/").then((r) => r.data),
  });

  const selected = vendors.find((v) => v.id === value) || null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between border border-gray-200 rounded-xl px-3 py-3"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <Building2 size={16} color="#6366F1" />
          <View className="ml-2 flex-1">
            <Text className="text-[10px] text-gray-400 font-semibold uppercase">
              Vendor
            </Text>
            <Text
              className="text-gray-800 font-semibold text-sm mt-0.5"
              numberOfLines={1}
            >
              {selected ? selected.name : "All Vendors"}
            </Text>
          </View>
        </View>
        <ChevronDown size={16} color="#6366F1" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center px-8"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="bg-white rounded-2xl max-h-[70%] overflow-hidden"
            onPress={() => {}}
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
              <Text className="text-base font-bold text-gray-800">
                Select Vendor
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            ) : (
              <FlatList
                data={[{ id: 0, name: "All Vendors" } as Vendor, ...vendors]}
                keyExtractor={(v) => String(v.id)}
                renderItem={({ item }) => {
                  const isAll = item.id === 0;
                  const isSelected = isAll ? value === null : value === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        onChange(isAll ? null : item.id);
                        setOpen(false);
                      }}
                      className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50"
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-sm ${
                          isSelected
                            ? "text-indigo-700 font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {item.name}
                      </Text>
                      {isSelected ? <Check size={18} color="#4F46E5" /> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
