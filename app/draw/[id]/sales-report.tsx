import api from "@/utils/axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, MoveLeft, RotateCcw } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SalesRow = {
  bill_number: number;
  date_time: string;
  customer_name?: string | null;
  booked_by_name?: string | null;
  booked_by_type?: string | null;
  total_booking_count: number;
  total_booking_amount: number;
  calculated_dealer_amount: number;
  calculated_agent_amount: number;
};

type SalesPage = {
  count: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  results: SalesRow[];
  total_bill_count?: number;
  total_dealer_amount?: number;
  total_agent_amount?: number;
  total_customer_amount?: number;
};

const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

const startOfTomorrow = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
};

const fmtDay = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const fmtApiDay = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fmtMoney = (n: number | undefined | null) =>
  `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function DrawSalesReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const drawId = Number(id);
  const drawName = name || `Draw #${drawId}`;

  const [fromDate, setFromDate] = useState<Date>(startOfToday());
  const [toDate, setToDate] = useState<Date>(startOfTomorrow());
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const filterKey = `${fmtApiDay(fromDate)}..${fmtApiDay(toDate)}`;

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isError,
  } = useInfiniteQuery<SalesPage>({
    queryKey: ["draw-sales-report", drawId, filterKey],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params: Record<string, any> = {
        draw_session__draw__id: drawId,
        date_time__gte: fmtApiDay(fromDate),
        date_time__lte: fmtApiDay(toDate),
        page: pageParam,
      };
      return api
        .get("/draw-booking/booking-report/", { params })
        .then((r) => r.data);
    },
    getNextPageParam: (last) => last?.next ?? undefined,
    enabled: !!drawId,
    retry: false,
  });

  const rows: SalesRow[] = useMemo(
    () =>
      data?.pages.flatMap((p) => (Array.isArray(p?.results) ? p.results : [])) ??
      [],
    [data]
  );
  const first = data?.pages[0];
  const totalCount = first?.count ?? 0;
  const totalBillCount = first?.total_bill_count ?? 0;
  const totalDealerAmount = first?.total_dealer_amount ?? 0;
  const totalCustomerAmount = first?.total_customer_amount ?? 0;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const resetDates = () => {
    setFromDate(startOfToday());
    setToDate(startOfTomorrow());
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
          <View className="flex-1 items-center">
            <Text className="text-xs text-gray-400">Sales Report</Text>
            <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
              {drawName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={resetDates}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <RotateCcw size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white border-b border-gray-100 px-6 py-4">
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setShowFrom(true)}
            className="flex-1 flex-row items-center justify-between border border-gray-200 rounded-xl px-3 py-3"
            activeOpacity={0.7}
          >
            <View>
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                From
              </Text>
              <Text className="text-gray-800 font-semibold text-sm mt-0.5">
                {fmtDay(fromDate)}
              </Text>
            </View>
            <Calendar size={16} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowTo(true)}
            className="flex-1 flex-row items-center justify-between border border-gray-200 rounded-xl px-3 py-3"
            activeOpacity={0.7}
          >
            <View>
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                To
              </Text>
              <Text className="text-gray-800 font-semibold text-sm mt-0.5">
                {fmtDay(toDate)}
              </Text>
            </View>
            <Calendar size={16} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Table header */}
      <View className="flex-row bg-indigo-50 border-b border-indigo-100 px-4 py-2.5">
        <Text className="flex-[1.3] text-[10px] font-bold text-indigo-700 uppercase">
          Date
        </Text>
        <Text className="flex-[1.3] text-[10px] font-bold text-indigo-700 uppercase text-center">
          Booked
        </Text>
        <Text className="flex-[0.8] text-[10px] font-bold text-indigo-700 uppercase text-center">
          Bill
        </Text>
        <Text className="flex-[0.6] text-[10px] font-bold text-indigo-700 uppercase text-center">
          Cnt
        </Text>
        <Text className="flex-1 text-[10px] font-bold text-indigo-700 uppercase text-right">
          Amt
        </Text>
      </View>

      {/* Body */}
      {isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
            <Text className="text-red-600 text-lg font-bold mb-3">
              Failed to load sales report
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
          data={rows}
          keyExtractor={(r) => String(r.bill_number)}
          contentContainerStyle={{
            paddingBottom: rows.length > 0 ? 0 : insets.bottom + 40,
          }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/booking-details",
                  params: { bill_number: String(item.bill_number) },
                })
              }
              className="flex-row items-center px-4 py-3 border-b border-gray-100"
              style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" }}
            >
              <View className="flex-[1.3]">
                <Text className="text-xs text-gray-800 font-semibold">
                  {new Date(item.date_time).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(item.date_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </Text>
              </View>
              <View className="flex-[1.3]">
                <Text
                  className="text-xs text-gray-700 text-center"
                  numberOfLines={1}
                >
                  {item.booked_by_name || "—"}
                </Text>
                {item.booked_by_type ? (
                  <Text className="text-[10px] text-violet-600 text-center mt-0.5">
                    {item.booked_by_type}
                  </Text>
                ) : null}
                {item.customer_name ? (
                  <Text
                    className="text-[10px] text-emerald-600 text-center mt-0.5"
                    numberOfLines={1}
                  >
                    {item.customer_name}
                  </Text>
                ) : null}
              </View>
              <Text className="flex-[0.8] text-xs text-gray-700 text-center">
                {item.bill_number}
              </Text>
              <Text className="flex-[0.6] text-xs text-gray-700 text-center">
                {item.total_booking_count}
              </Text>
              <Text className="flex-1 text-xs text-emerald-700 font-semibold text-right">
                {fmtMoney(item.total_booking_amount)}
              </Text>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isFetchingNextPage}
              onRefresh={refetch}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            ) : !hasNextPage && rows.length > 0 ? (
              <View className="py-3 items-center">
                <Text className="text-[10px] text-gray-400">
                  All {totalCount} rows loaded
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="text-gray-400 text-sm">
                No sales for the selected range.
              </Text>
            </View>
          }
        />
      )}

      {/* Totals footer */}
      {!isLoading && !isError && rows.length > 0 && (
        <View
          className="bg-white border-t border-gray-200 px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Bills
              </Text>
              <Text className="text-gray-800 font-bold text-sm">
                {totalBillCount || totalCount}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Dealer
              </Text>
              <Text className="text-violet-700 font-bold text-sm">
                {fmtMoney(totalDealerAmount)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Customer
              </Text>
              <Text className="text-emerald-700 font-bold text-sm">
                {fmtMoney(totalCustomerAmount)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {showFrom && (
        <DateTimePicker
          mode="date"
          value={fromDate}
          display={Platform.OS === "android" ? "default" : "spinner"}
          onChange={(event, picked) => {
            setShowFrom(false);
            if (event.type === "set" && picked) {
              setFromDate(
                new Date(
                  picked.getFullYear(),
                  picked.getMonth(),
                  picked.getDate()
                )
              );
            }
          }}
        />
      )}
      {showTo && (
        <DateTimePicker
          mode="date"
          value={toDate}
          display={Platform.OS === "android" ? "default" : "spinner"}
          onChange={(event, picked) => {
            setShowTo(false);
            if (event.type === "set" && picked) {
              setToDate(
                new Date(
                  picked.getFullYear(),
                  picked.getMonth(),
                  picked.getDate()
                )
              );
            }
          }}
        />
      )}
    </View>
  );
}
