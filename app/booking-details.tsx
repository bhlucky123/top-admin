import api from "@/utils/axios";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MoveLeft } from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BookingDetail = {
  id: number;
  number: string;
  count: number;
  amount: number;
  type: string;
  sub_type: string;
  is_main_box_number: boolean;
  dealer_amount: number;
  agent_amount: number;
  customer_amount: number;
};

type BookingResponse = {
  bill_number: number;
  date_time: string;
  customer_name: string | null;
  booked_by_name: string | null;
  booked_by_type: string | null;
  is_bh: boolean;
  total_booking_count: number;
  total_booking_amount: number;
  calculated_dealer_amount: number;
  calculated_agent_amount: number;
  booking_details: BookingDetail[];
  total_bill_count: number;
  total_dealer_amount: number;
  total_agent_amount: number;
  total_customer_amount: number;
  total_amount: number;
};

const fmtMoney = (n: number | undefined | null) =>
  `₹${Number(n || 0).toLocaleString("en-IN")}`;

const TYPE_SHORT: Record<string, string> = {
  single_digit: "1D",
  double_digit: "2D",
  triple_digit: "3D",
};

export default function BookingDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bill_number?: string; search?: string }>();
  const billNumber = params.bill_number;
  const searchParam = params.search || "";

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<BookingResponse>({
    queryKey: ["booking-report-detail", billNumber, searchParam],
    queryFn: () => {
      const q = searchParam ? `?search=${encodeURIComponent(searchParam)}` : "";
      return api
        .get(`/draw-booking/booking-report/${billNumber}/${q}`)
        .then((r) => r.data);
    },
    enabled: !!billNumber,
    retry: false,
  });

  const details: BookingDetail[] = useMemo(
    () => data?.booking_details ?? [],
    [data]
  );

  const totalCount = details.reduce((s, d) => s + d.count, 0);
  const totalDealerAmt = details.reduce((s, d) => s + (d.dealer_amount ?? 0), 0);
  const totalCustomerAmt = details.reduce((s, d) => s + (d.customer_amount ?? 0), 0);

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
          <View className="flex-1 items-center">
            <Text className="text-xs text-gray-400">Booking Details</Text>
            <Text className="text-base font-bold text-gray-800">
              Bill #{billNumber || "—"}
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      {/* Booking info card */}
      {data && (
        <View className="bg-white border-b border-gray-100 px-6 py-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="bg-indigo-50 px-2.5 py-1 rounded-lg mr-2">
                <Text className="text-indigo-700 text-xs font-bold">
                  #{data.bill_number}
                </Text>
              </View>
              {data.is_bh ? (
                <View className="bg-red-50 px-2 py-1 rounded-lg">
                  <Text className="text-red-600 text-xs font-bold">BH</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-[10px] text-gray-400">
              {data.date_time
                ? new Date(data.date_time).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : ""}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-gray-800">
                {data.booked_by_name || "—"}
              </Text>
              {data.booked_by_type ? (
                <Text className="text-[10px] text-violet-600 mt-0.5">
                  {data.booked_by_type}
                </Text>
              ) : null}
            </View>
            {data.customer_name ? (
              <Text className="text-xs text-emerald-600" numberOfLines={1}>
                {data.customer_name}
              </Text>
            ) : null}
          </View>
          <View className="flex-row mt-3 gap-3">
            <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2 items-center">
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Count
              </Text>
              <Text className="text-gray-800 font-bold text-sm">
                {data.total_booking_count}
              </Text>
            </View>
            <View className="flex-1 bg-violet-50 rounded-lg px-3 py-2 items-center">
              <Text className="text-[10px] text-violet-400 font-semibold uppercase">
                Dealer
              </Text>
              <Text className="text-violet-700 font-bold text-sm">
                {fmtMoney(data.calculated_dealer_amount)}
              </Text>
            </View>
            <View className="flex-1 bg-emerald-50 rounded-lg px-3 py-2 items-center">
              <Text className="text-[10px] text-emerald-400 font-semibold uppercase">
                Customer
              </Text>
              <Text className="text-emerald-700 font-bold text-sm">
                {fmtMoney(data.total_booking_amount)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Table header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { flex: 1.2 }]}>Number</Text>
        <Text style={[styles.headerCell, { flex: 1, textAlign: "center" }]}>
          Type
        </Text>
        <Text style={[styles.headerCell, { flex: 0.7, textAlign: "center" }]}>
          Cnt
        </Text>
        <Text style={[styles.headerCell, { flex: 1, textAlign: "right" }]}>
          Dealer
        </Text>
        <Text style={[styles.headerCell, { flex: 1, textAlign: "right" }]}>
          Customer
        </Text>
      </View>

      {/* Body */}
      {isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
            <Text className="text-red-600 text-lg font-bold mb-3">
              Failed to load booking details
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="bg-indigo-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={details}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{
            paddingBottom: details.length > 0 ? 0 : insets.bottom + 40,
          }}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                },
              ]}
            >
              <View style={{ flex: 1.2 }}>
                <Text style={styles.numberText}>{item.number}</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.subTypeText}>{item.sub_type}</Text>
                <Text style={styles.typeText}>
                  {TYPE_SHORT[item.type] || item.type}
                </Text>
              </View>
              <Text
                style={[styles.cellText, { flex: 0.7, textAlign: "center" }]}
              >
                {item.count}
              </Text>
              <Text
                style={[
                  styles.cellText,
                  styles.dealerAmt,
                  { flex: 1, textAlign: "right" },
                ]}
              >
                {fmtMoney(item.dealer_amount)}
              </Text>
              <Text
                style={[
                  styles.cellText,
                  styles.customerAmt,
                  { flex: 1, textAlign: "right" },
                ]}
              >
                {fmtMoney(item.customer_amount)}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="text-gray-400 text-sm">
                No booking details found.
              </Text>
            </View>
          }
        />
      )}

      {/* Totals footer */}
      {!isLoading && !isError && details.length > 0 && (
        <View
          className="bg-white border-t border-gray-200 px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Details
              </Text>
              <Text className="text-gray-800 font-bold text-sm">
                {details.length}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Count
              </Text>
              <Text className="text-gray-800 font-bold text-sm">
                {totalCount}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Dealer
              </Text>
              <Text className="text-violet-700 font-bold text-sm">
                {fmtMoney(totalDealerAmt)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Customer
              </Text>
              <Text className="text-emerald-700 font-bold text-sm">
                {fmtMoney(totalCustomerAmt)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderBottomWidth: 1,
    borderBottomColor: "#C7D2FE",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3730A3",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  numberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#047857",
    letterSpacing: 1,
  },
  subTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7c3aed",
  },
  typeText: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 1,
  },
  cellText: {
    fontSize: 12,
    color: "#374151",
  },
  dealerAmt: {
    fontWeight: "700",
    color: "#6d28d9",
  },
  customerAmt: {
    fontWeight: "700",
    color: "#047857",
  },
});
