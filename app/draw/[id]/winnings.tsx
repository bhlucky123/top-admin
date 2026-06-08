import VendorFilter from "@/components/vendor-filter";
import api from "@/utils/axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, MoveLeft, RotateCcw, Trophy } from "lucide-react-native";
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

type WinnerRow = {
  customer_name?: string | null;
  bill_number: number;
  prize: number;
  win_number: string;
  count: string;
  lsk?: string;
  draw?: string;
  dealer?: string;
  agent?: string | null;
  booking_datetime?: string;
};

type WinnersPage = {
  count: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  results: {
    data: WinnerRow[];
    total_winning_prize: number;
  };
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

const fmtMoney = (n: number | undefined | null) =>
  `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function DrawWinningsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const drawId = Number(id);
  const drawName = name || `Draw #${drawId}`;

  const [fromDate, setFromDate] = useState<Date>(startOfToday());
  const [toDate, setToDate] = useState<Date>(startOfTomorrow());
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [vendorId, setVendorId] = useState<number | null>(null);

  const filterKey = `${fromDate.toISOString()}..${toDate.toISOString()}..v${vendorId ?? "all"}`;

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isError,
  } = useInfiniteQuery<WinnersPage>({
    queryKey: ["draw-winnings", drawId, filterKey],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params: Record<string, any> = {
        booking_detail__booking__draw_session__draw__id: drawId,
        date_time__gte: fromDate.toISOString(),
        date_time__lte: toDate.toISOString(),
        page: pageParam,
      };
      if (vendorId) params.vendor = vendorId;
      return api
        .get("/draw-result/optimized-winners/", { params })
        .then((r) => r.data);
    },
    getNextPageParam: (last) => last?.next ?? undefined,
    enabled: !!drawId,
    retry: false,
  });

  const rows: WinnerRow[] = useMemo(() => {
    const out: WinnerRow[] = [];
    for (const p of data?.pages ?? []) {
      const items = p?.results?.data;
      if (Array.isArray(items)) out.push(...items);
    }
    return out;
  }, [data]);

  const first = data?.pages[0];
  const totalCount = first?.count ?? 0;
  const totalPrize = first?.results?.total_winning_prize ?? 0;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const resetDates = () => {
    setFromDate(startOfToday());
    setToDate(startOfTomorrow());
    setVendorId(null);
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
            <Text className="text-xs text-gray-400">Winnings</Text>
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
      <View className="bg-white border-b border-gray-100 px-6 py-4 gap-3">
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
            <Calendar size={16} color="#D97706" />
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
            <Calendar size={16} color="#D97706" />
          </TouchableOpacity>
        </View>

        {/* Vendor filter */}
        <VendorFilter value={vendorId} onChange={setVendorId} />
      </View>

      {/* Table header */}
      <View className="flex-row bg-amber-50 border-b border-amber-100 px-4 py-2.5">
        <Text className="flex-[1.2] text-[10px] font-bold text-amber-700 uppercase">
          When
        </Text>
        <Text className="flex-1 text-[10px] font-bold text-amber-700 uppercase text-center">
          Number
        </Text>
        <Text className="flex-1 text-[10px] font-bold text-amber-700 uppercase text-center">
          Dealer
        </Text>
        <Text className="flex-1 text-[10px] font-bold text-amber-700 uppercase text-right">
          Prize
        </Text>
      </View>

      {/* Body */}
      {isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
            <Text className="text-red-600 text-lg font-bold mb-3">
              Failed to load winnings
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="bg-amber-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#D97706" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, idx) =>
            `${r.bill_number ?? "b"}-${r.win_number ?? "w"}-${idx}`
          }
          contentContainerStyle={{
            paddingBottom: rows.length > 0 ? 0 : insets.bottom + 40,
          }}
          renderItem={({ item, index }) => (
            <View
              className="flex-row items-center px-4 py-3 border-b border-gray-100"
              style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" }}
            >
              <View className="flex-[1.2]">
                {item.booking_datetime ? (
                  <>
                    <Text className="text-xs text-gray-800 font-semibold">
                      {new Date(item.booking_datetime).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        }
                      )}
                    </Text>
                    <Text className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(item.booking_datetime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Text>
                  </>
                ) : (
                  <Text className="text-xs text-gray-400">—</Text>
                )}
              </View>
              <View className="flex-1 items-center">
                <Text className="text-sm font-bold text-emerald-700 tracking-widest">
                  {item.win_number}
                </Text>
                {item.lsk ? (
                  <Text className="text-[10px] text-gray-400 mt-0.5">
                    {item.lsk}
                  </Text>
                ) : null}
                <Text className="text-[10px] text-gray-400 mt-0.5">
                  × {item.count}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text
                  className="text-xs text-gray-700 font-semibold text-center"
                  numberOfLines={1}
                >
                  {item.dealer || "—"}
                </Text>
                {item.customer_name ? (
                  <Text
                    className="text-[10px] text-emerald-600 text-center mt-0.5"
                    numberOfLines={1}
                  >
                    {item.customer_name}
                  </Text>
                ) : null}
                {item.agent ? (
                  <Text className="text-[10px] text-gray-400 text-center mt-0.5">
                    Agent: {item.agent}
                  </Text>
                ) : null}
              </View>
              <Text className="flex-1 text-xs text-violet-700 font-bold text-right">
                {fmtMoney(item.prize)}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isFetchingNextPage}
              onRefresh={refetch}
              colors={["#D97706"]}
              tintColor="#D97706"
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#D97706" />
              </View>
            ) : !hasNextPage && rows.length > 0 ? (
              <View className="py-3 items-center">
                <Text className="text-[10px] text-gray-400">
                  All {totalCount} winners loaded
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Trophy size={36} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-3">
                No winnings for the selected range.
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
                Winners
              </Text>
              <Text className="text-gray-800 font-bold text-sm">
                {totalCount}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-gray-400 font-semibold uppercase">
                Total Prize
              </Text>
              <Text className="text-violet-700 font-bold text-sm">
                {fmtMoney(totalPrize)}
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
