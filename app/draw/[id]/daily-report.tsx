import VendorFilter from "@/components/vendor-filter";
import { amountHandler } from "@/utils/amount";
import api from "@/utils/axios";
import { formatDateDDMMYYYY } from "@/utils/date";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, Check, MoveLeft, RotateCcw } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ReportRow = {
  date?: string;
  draw?: string;
  total_amount?: number;
  total_count?: number;
  total_dealer_amount?: number;
  total_agent_amount?: number;
  total_winning_prize?: number;
};

type ReportResponse = {
  report?: ReportRow[];
  summary?: ReportRow[];
};

const stripTime = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const startOfToday = () => stripTime(new Date());

const startOfTomorrow = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
};

const fmtApiDay = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Top admin is always super admin → report is shown at admin level:
// SALE = dealer amount, BAL = dealer amount − winnings.
const rowSale = (r: ReportRow) => r.total_dealer_amount || 0;
const rowWin = (r: ReportRow) => r.total_winning_prize || 0;
const rowBalance = (r: ReportRow) => rowSale(r) - rowWin(r);

const sumBy = (rows: ReportRow[] | undefined, fn: (r: ReportRow) => number) =>
  Array.isArray(rows) ? rows.reduce((acc, r) => acc + fn(r), 0) : 0;

export default function DrawDailyReportScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const drawId = Number(id);
  const drawName = name || `Draw #${drawId}`;

  const [fromDate, setFromDate] = useState<Date>(startOfToday());
  const [toDate, setToDate] = useState<Date>(startOfTomorrow());
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [allGames, setAllGames] = useState(false);
  const [vendorId, setVendorId] = useState<number | null>(null);

  const buildQuery = () => {
    const params: Record<string, any> = {
      date_time__gte: fmtApiDay(fromDate),
      date_time__lte: fmtApiDay(toDate),
    };
    if (drawId && !allGames) params.draw_session__draw = drawId;
    if (vendorId) params.vendor = vendorId;
    return params;
  };

  const { data, isLoading, error, refetch, isFetching } =
    useQuery<ReportResponse>({
      queryKey: ["draw-daily-report", drawId, buildQuery()],
      queryFn: () =>
        api
          .get("/draw-booking/daily-report/", { params: buildQuery() })
          .then((r) => r.data),
      enabled: !!drawId,
    });

  const reset = () => {
    setFromDate(startOfToday());
    setToDate(startOfTomorrow());
    setAllGames(false);
    setVendorId(null);
  };

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderHeader = (cols: string[]) => (
    <View className="flex-row bg-indigo-50 border-b border-indigo-100 py-2">
      {cols.map((col) => (
        <Text
          key={col}
          className="flex-1 text-[10px] font-bold text-indigo-700 text-center uppercase"
        >
          {col}
        </Text>
      ))}
    </View>
  );

  const renderRow = (label: string, r: ReportRow, isTotal = false) => (
    <View
      className={`flex-row py-2.5 border-b border-gray-100 ${
        isTotal ? "bg-gray-100" : "bg-white"
      }`}
    >
      <Text
        className={`flex-1 text-[11px] text-center text-gray-800 ${
          isTotal ? "font-bold" : ""
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text className="flex-1 text-[11px] text-center text-violet-700 font-semibold">
        {amountHandler(rowSale(r))}
      </Text>
      <Text className="flex-1 text-[11px] text-center text-amber-700 font-semibold">
        {amountHandler(rowWin(r))}
      </Text>
      <Text className="flex-1 text-[11px] text-center text-emerald-700 font-semibold">
        {amountHandler(rowBalance(r))}
      </Text>
    </View>
  );

  const totalsRow = (rows: ReportRow[] | undefined): ReportRow => ({
    total_dealer_amount: sumBy(rows, rowSale),
    total_winning_prize: sumBy(rows, rowWin),
  });

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
            <Text className="text-xs text-gray-400">Daily Report</Text>
            <Text
              className="text-base font-bold text-gray-800"
              numberOfLines={1}
            >
              {drawName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={reset}
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
                {formatDateDDMMYYYY(fromDate)}
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
                {formatDateDDMMYYYY(toDate)}
              </Text>
            </View>
            <Calendar size={16} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Vendor filter */}
        <VendorFilter value={vendorId} onChange={setVendorId} />

        {/* All Games toggle */}
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.7}
          onPress={() => setAllGames((prev) => !prev)}
        >
          <View
            className={`w-5 h-5 rounded-md border items-center justify-center mr-2 ${
              allGames ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
            }`}
          >
            {allGames && <Check size={13} color="#fff" />}
          </View>
          <Text className="text-sm text-gray-700">
            All Games (ignore this draw)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-3 text-gray-500">Loading report...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 items-center w-full">
            <Text className="text-red-600 text-lg font-bold mb-3">
              Failed to load report
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              className="bg-indigo-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          className="px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              colors={["#4F46E5"]}
              tintColor="#4F46E5"
            />
          }
        >
          {/* Summary */}
          <View className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
            <Text className="bg-gray-100 px-3 py-2.5 font-bold text-xs text-gray-700 border-b border-gray-200">
              SUMMARY
            </Text>
            {renderHeader(["Game", "Sale", "Win", "Bal"])}
            {(data?.summary?.length ?? 0) === 0 ? (
              <Text className="text-center text-gray-400 text-xs py-6">
                No data for the selected range.
              </Text>
            ) : (
              <>
                {data?.summary?.map((item, idx) =>
                  <View key={`s-${item.draw}-${idx}`}>
                    {renderRow(item.draw || "—", item)}
                  </View>
                )}
                {renderRow("Total", totalsRow(data?.summary), true)}
              </>
            )}
          </View>

          {/* Detailed */}
          <View className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-6">
            <Text className="bg-gray-100 px-3 py-2.5 font-bold text-xs text-gray-700 border-b border-gray-200">
              DETAILED
            </Text>
            {renderHeader(["Date", "Sale", "Win", "Bal"])}
            {(data?.report?.length ?? 0) === 0 ? (
              <Text className="text-center text-gray-400 text-xs py-6">
                No data for the selected range.
              </Text>
            ) : (
              <>
                {data?.report?.map((item, idx) =>
                  <View key={`d-${item.date}-${idx}`}>
                    {renderRow(item.date || "—", item)}
                  </View>
                )}
                {renderRow("Total", totalsRow(data?.report), true)}
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Date pickers */}
      {showFrom && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display={Platform.OS === "android" ? "default" : "spinner"}
          maximumDate={toDate}
          onChange={(event, picked) => {
            setShowFrom(false);
            if (event.type === "set" && picked) {
              const d = stripTime(picked);
              setFromDate(d);
              if (d > toDate) setToDate(d);
            }
          }}
        />
      )}
      {showTo && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display={Platform.OS === "android" ? "default" : "spinner"}
          minimumDate={fromDate}
          onChange={(event, picked) => {
            setShowTo(false);
            if (event.type === "set" && picked) {
              const d = stripTime(picked);
              setToDate(d);
              if (d < fromDate) setFromDate(d);
            }
          }}
        />
      )}
    </View>
  );
}
