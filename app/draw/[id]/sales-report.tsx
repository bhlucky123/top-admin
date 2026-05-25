import { useAuthStore } from "@/store/auth";
import api from "@/utils/axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  ChevronRight,
  MoveLeft,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
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
  is_bh?: boolean;
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

const fmtShortDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fmtMoney = (n: number | undefined | null) =>
  `₹${Number(n || 0).toLocaleString("en-IN")}`;

const BookingRow = React.memo(
  ({
    item,
    index,
    canDelete,
    onPress,
    onDelete,
  }: {
    item: SalesRow;
    index: number;
    canDelete: boolean;
    onPress: (item: SalesRow) => void;
    onDelete: (item: SalesRow) => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      className="flex-row items-center px-4 py-3 border-b border-gray-100"
      style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" }}
    >
      <View className="flex-[1.2]">
        <Text className="text-[11px] font-semibold text-gray-800">
          {fmtShortDate(item.date_time)}
        </Text>
        <Text className="text-[10px] text-gray-400 mt-0.5">
          {fmtTime(item.date_time)}
        </Text>
      </View>
      <View className="flex-[1.3] pr-1">
        <Text
          className={`text-[11px] text-center font-semibold ${
            item.is_bh ? "text-red-500" : "text-gray-700"
          }`}
          numberOfLines={1}
        >
          {item.is_bh ? "BH" : item.booked_by_name || "—"}
        </Text>
        {item.booked_by_type && !item.is_bh ? (
          <Text
            className="text-[9px] text-violet-600 text-center mt-0.5"
            numberOfLines={1}
          >
            {item.booked_by_type}
          </Text>
        ) : null}
        {item.customer_name ? (
          <Text
            className="text-[9px] text-emerald-600 text-center mt-0.5"
            numberOfLines={1}
          >
            {item.customer_name}
          </Text>
        ) : null}
      </View>
      <Text className="flex-[0.7] text-[11px] text-gray-700 text-center font-medium">
        {item.bill_number}
      </Text>
      <Text className="flex-[0.5] text-[11px] text-gray-700 text-center">
        {item.total_booking_count}
      </Text>
      <Text className="flex-[0.9] text-[11px] text-violet-700 font-semibold text-right">
        {fmtMoney(item.calculated_dealer_amount)}
      </Text>
      <Text className="flex-[0.9] text-[11px] text-emerald-700 font-semibold text-right">
        {fmtMoney(item.total_booking_amount)}
      </Text>
      {canDelete ? (
        <Pressable
          className="w-5 items-end"
          onPress={() => onDelete(item)}
          hitSlop={10}
        >
          <Trash2 size={15} color="#EF4444" />
        </Pressable>
      ) : (
        <View className="w-5 items-end">
          <ChevronRight size={14} color="#D1D5DB" />
        </View>
      )}
    </TouchableOpacity>
  )
);

export default function DrawSalesReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { hasFeature } = useAuthStore();
  const canDeleteBooking = hasFeature("delete_booking");
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const drawId = Number(id);
  const drawName = name || `Draw #${drawId}`;

  const [fromDate, setFromDate] = useState<Date>(startOfToday());
  const [toDate, setToDate] = useState<Date>(startOfTomorrow());
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const filterKey = `${fmtApiDay(fromDate)}..${fmtApiDay(toDate)}..${debouncedSearch}`;

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
      if (debouncedSearch) params.search = debouncedSearch;
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
      data?.pages.flatMap((p) =>
        Array.isArray(p?.results) ? p.results : []
      ) ?? [],
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

  const handleRowPress = useCallback(
    (item: SalesRow) => {
      router.push({
        pathname: "/booking-details",
        params: {
          bill_number: String(item.bill_number),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });
    },
    [router, debouncedSearch]
  );

  const handleDeleteBooking = useCallback(
    (booking: SalesRow) => {
      if (!booking?.bill_number) return;
      Alert.alert(
        "Delete Booking",
        `Are you sure you want to delete booking "${booking.bill_number}"? This will remove all booking details under this bill.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await api.delete(
                  `/draw-booking/delete/${booking.bill_number}/`
                );
                queryClient.invalidateQueries({
                  queryKey: ["draw-sales-report"],
                });
                refetch();
              } catch {
                Alert.alert("Delete Failed", "Could not delete booking.");
              }
            },
          },
        ]
      );
    },
    [queryClient, refetch]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SalesRow; index: number }) => (
      <BookingRow
        item={item}
        index={index}
        canDelete={canDeleteBooking}
        onPress={handleRowPress}
        onDelete={handleDeleteBooking}
      />
    ),
    [handleRowPress, handleDeleteBooking, canDeleteBooking]
  );

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
            <Text
              className="text-base font-bold text-gray-800"
              numberOfLines={1}
            >
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
      <View className="bg-white border-b border-gray-100 px-6 py-4 gap-3">
        {/* Search */}
        <View className="flex-row items-center border border-gray-200 rounded-xl px-3 py-2.5">
          <Search size={16} color="#9CA3AF" />
          <TextInput
            placeholder="Search by number or bill..."
            value={search}
            onChangeText={setSearch}
            keyboardType="numeric"
            className="flex-1 ml-2 text-sm text-gray-800"
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Date filters */}
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

        {/* Summary badges */}
        {!isLoading && rows.length > 0 && (
          <View className="flex-row gap-2">
            <View className="px-3 py-1.5 rounded-lg bg-gray-100">
              <Text className="text-gray-500 text-[10px]">
                Bookings{" "}
                <Text className="text-gray-800 font-bold">{totalCount}</Text>
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-lg bg-violet-50">
              <Text className="text-violet-500 text-[10px]">
                Dealer{" "}
                <Text className="text-violet-700 font-bold">
                  {fmtMoney(totalDealerAmount)}
                </Text>
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-lg bg-emerald-50">
              <Text className="text-emerald-500 text-[10px]">
                Customer{" "}
                <Text className="text-emerald-700 font-bold">
                  {fmtMoney(totalCustomerAmount)}
                </Text>
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Table header */}
      <View className="flex-row bg-indigo-50 border-b border-indigo-100 px-4 py-2.5">
        <Text className="flex-[1.2] text-[10px] font-bold text-indigo-700 uppercase">
          Date
        </Text>
        <Text className="flex-[1.3] text-[10px] font-bold text-indigo-700 uppercase text-center">
          Booked
        </Text>
        <Text className="flex-[0.7] text-[10px] font-bold text-indigo-700 uppercase text-center">
          Bill
        </Text>
        <Text className="flex-[0.5] text-[10px] font-bold text-indigo-700 uppercase text-center">
          Cnt
        </Text>
        <Text className="flex-[0.9] text-[10px] font-bold text-indigo-700 uppercase text-right">
          Dealer
        </Text>
        <Text className="flex-[0.9] text-[10px] font-bold text-indigo-700 uppercase text-right">
          Cust
        </Text>
        <View className="w-5" />
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
          <Text className="mt-3 text-gray-500">Loading sales data...</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.bill_number)}
          contentContainerStyle={{
            paddingBottom: rows.length > 0 ? 0 : insets.bottom + 40,
          }}
          renderItem={renderItem}
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
                  All {totalCount} bookings loaded
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="text-gray-400 text-sm">
                {debouncedSearch
                  ? "No bookings match your search."
                  : "No bookings for the selected range."}
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
