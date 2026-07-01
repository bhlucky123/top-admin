import {
  MonitoringSubType,
  MonitoringType,
  SUB_TYPE_LABELS,
  TYPE_LABELS,
  TYPE_SHORT_LABELS,
} from "@/hooks/use-monitoring-extra-count";
import { MonitoringTransferLog } from "@/hooks/use-monitoring-actions";
import api from "@/utils/axios";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeftRight,
  CheckCircle2,
  Circle,
  History,
  MoveLeft,
  Ticket,
  Undo2,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "entries" | "transfers" | "recalls";

type ExtraCountEntry = {
  id: number;
  vendor: number;
  vendor_name?: string;
  draw_session: number;
  draw_name?: string;
  session_date?: string;
  number: string;
  count: number;
  type: MonitoringType;
  sub_type: MonitoringSubType;
  is_done: boolean;
  done_action: "cleared" | "transferred" | null;
};

type RecallEntry = {
  id: number;
  from_vendor: number;
  to_vendor: number;
  from_vendor_name?: string;
  to_vendor_name?: string;
  draw_name?: string;
  session_date?: string;
  number: string;
  recalled_count: number;
  original_transferred_count: number;
  type: MonitoringType;
  sub_type: MonitoringSubType;
  recalled_at: string;
};

type Page<T> = {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
};

function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

const PAGE_SIZE = 50;

const STATUS_CONFIG = {
  active:      { label: "Active",      bg: "#dcfce7", border: "#86efac", text: "#15803d", dot: "#16a34a" },
  cleared:     { label: "Cleared",     bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", dot: "#ef4444" },
  transferred: { label: "Transferred", bg: "#eef2ff", border: "#a5b4fc", text: "#3730a3", dot: "#6366f1" },
  done:        { label: "Done",        bg: "#f1f5f9", border: "#cbd5e1", text: "#475569", dot: "#94a3b8" },
};

function getEntryStatus(item: ExtraCountEntry) {
  if (!item.is_done) return STATUS_CONFIG.active;
  if (item.done_action === "cleared") return STATUS_CONFIG.cleared;
  if (item.done_action === "transferred") return STATUS_CONFIG.transferred;
  return STATUS_CONFIG.done;
}

function EntryRow({ item, even }: { item: ExtraCountEntry; even: boolean }) {
  const status = getEntryStatus(item);
  return (
    <View style={[styles.row, { backgroundColor: even ? "#ffffff" : "#f8fafc" }]}>
      <View style={styles.statusCol}>
        {item.is_done
          ? <CheckCircle2 size={16} color={status.dot} />
          : <Circle size={16} color={status.dot} />}
      </View>
      <View style={styles.mainCol}>
        <Text style={styles.vendorText} numberOfLines={1}>
          {item.vendor_name || `#${item.vendor}`}
        </Text>
        <Text style={styles.subText}>
          {TYPE_LABELS[item.type]} · {SUB_TYPE_LABELS[item.sub_type]}
        </Text>
      </View>
      <Text style={styles.numberText}>{item.number}</Text>
      <View style={styles.rightCol}>
        <Text style={styles.countText}>{item.count}</Text>
        <View style={[styles.badge, { backgroundColor: status.bg, borderColor: status.border }]}>
          <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>
    </View>
  );
}

function TransferRow({ item, even }: { item: MonitoringTransferLog; even: boolean }) {
  return (
    <View style={[styles.row, { backgroundColor: even ? "#ffffff" : "#f0f4ff" }]}>
      <View style={styles.statusCol}>
        <ArrowLeftRight size={14} color="#4f46e5" />
      </View>
      <View style={styles.mainCol}>
        <Text style={styles.vendorText} numberOfLines={1}>
          {item.from_vendor_name || `#${item.from_vendor}`}
        </Text>
        <Text style={[styles.subText, { color: "#6366f1" }]} numberOfLines={1}>
          → {item.to_vendor_name || `#${item.to_vendor}`}
        </Text>
        <Text style={styles.subText}>
          {TYPE_SHORT_LABELS[item.type]} · {SUB_TYPE_LABELS[item.sub_type]}
        </Text>
      </View>
      <Text style={styles.numberText}>{item.number}</Text>
      <View style={styles.rightCol}>
        <Text style={[styles.countText, { color: "#4338ca" }]}>{item.count}</Text>
        <Text style={styles.timeText}>{fmtTime(item.transferred_at)}</Text>
      </View>
    </View>
  );
}

function RecallRow({ item, even }: { item: RecallEntry; even: boolean }) {
  return (
    <View style={[styles.row, { backgroundColor: even ? "#ffffff" : "#fff7ed" }]}>
      <View style={styles.statusCol}>
        <Undo2 size={14} color="#ea580c" />
      </View>
      <View style={styles.mainCol}>
        <Text style={styles.vendorText} numberOfLines={1}>
          {item.from_vendor_name || `#${item.from_vendor}`}
        </Text>
        <Text style={[styles.subText, { color: "#ea580c" }]} numberOfLines={1}>
          ← {item.to_vendor_name || `#${item.to_vendor}`}
        </Text>
        <Text style={styles.subText}>
          {TYPE_SHORT_LABELS[item.type]} · {SUB_TYPE_LABELS[item.sub_type]}
        </Text>
      </View>
      <Text style={styles.numberText}>{item.number}</Text>
      <View style={styles.rightCol}>
        <Text style={[styles.countText, { color: "#c2410c" }]}>{item.recalled_count}</Text>
        <Text style={styles.timeText}>{fmtTime(item.recalled_at)}</Text>
      </View>
    </View>
  );
}

function TableHeader({ tab }: { tab: Tab }) {
  const isTransfer = tab === "transfers";
  const isRecall = tab === "recalls";
  const accentColor = isTransfer ? "#3730a3" : isRecall ? "#9a3412" : "#065f46";
  const bg = isTransfer ? "#eef2ff" : isRecall ? "#fff7ed" : "#f0fdf4";
  const border = isTransfer ? "#c7d2fe" : isRecall ? "#fed7aa" : "#bbf7d0";
  const countLabel = isRecall ? "Recalled" : "Count";
  return (
    <View style={[styles.headerRow, { backgroundColor: bg, borderBottomColor: border }]}>
      <View style={styles.statusCol} />
      <Text style={[styles.headerCell, { flex: 3, color: accentColor }]}>Vendor</Text>
      <Text style={[styles.headerCell, { flex: 2, textAlign: "center", color: accentColor }]}>Number</Text>
      <Text style={[styles.headerCell, { flex: 2, textAlign: "right", color: accentColor }]}>{countLabel}</Text>
    </View>
  );
}

export default function MonitoringHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ drawId?: string; drawName?: string }>();
  const drawId = params.drawId ? Number(params.drawId) : null;
  const drawName = params.drawName || (drawId ? `Draw #${drawId}` : "");

  const [tab, setTab] = useState<Tab>("entries");

  type StatusFilter = "all" | "active" | "cleared" | "transferred";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ── Entries (all ExtraCount including done) ──────────────────────────────
  const entriesKey = useMemo(
    () => ["monitoring-history-entries", drawId, statusFilter],
    [drawId, statusFilter]
  );

  const {
    data: entriesData,
    isLoading: loadingEntries,
    isFetching: fetchingEntries,
    isFetchingNextPage: fetchingNextEntries,
    hasNextPage: hasNextEntries,
    fetchNextPage: fetchNextEntries,
    isError: entriesError,
    refetch: refetchEntries,
  } = useInfiniteQuery<Page<ExtraCountEntry>>({
    queryKey: entriesKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => {
      const q: Record<string, any> = { limit: PAGE_SIZE, offset: pageParam };
      if (drawId) q["draw_session__draw__id"] = drawId;
      if (statusFilter === "active") q["is_done"] = "false";
      else if (statusFilter === "cleared") q["done_action"] = "cleared";
      else if (statusFilter === "transferred") q["done_action"] = "transferred";
      return api
        .get("/draw-monitoring/extra-count/history/", { params: q })
        .then((r) => {
          const d = r.data;
          return Array.isArray(d)
            ? { results: d, count: d.length, next: null, previous: null }
            : d;
        });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.next) return undefined;
      return allPages.reduce((acc, p) => acc + (p.results?.length ?? 0), 0);
    },
    retry: false,
  });

  const entries: ExtraCountEntry[] = useMemo(
    () => entriesData?.pages.flatMap((p) => p.results ?? []) ?? [],
    [entriesData]
  );
  const totalEntries = entriesData?.pages?.[0]?.count ?? entries.length;
  const activeCount = useMemo(() => entries.filter((e) => !e.is_done).length, [entries]);
  const doneCount = useMemo(() => entries.filter((e) => e.is_done).length, [entries]);

  // ── Transfers ────────────────────────────────────────────────────────────
  const transfersKey = useMemo(() => ["monitoring-history-transfers", drawId], [drawId]);

  const {
    data: transfersData,
    isLoading: loadingTransfers,
    isFetching: fetchingTransfers,
    isFetchingNextPage: fetchingNextTransfers,
    hasNextPage: hasNextTransfers,
    fetchNextPage: fetchNextTransfers,
    isError: transfersError,
    refetch: refetchTransfers,
  } = useInfiniteQuery<Page<MonitoringTransferLog>>({
    queryKey: transfersKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => {
      const q: Record<string, any> = { limit: PAGE_SIZE, offset: pageParam };
      if (drawId) q["draw_session__draw__id"] = drawId;
      return api
        .get("/draw-monitoring/transfer-log/", { params: q })
        .then((r) => {
          const d = r.data;
          return Array.isArray(d)
            ? { results: d, count: d.length, next: null, previous: null }
            : d;
        });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.next) return undefined;
      return allPages.reduce((acc, p) => acc + (p.results?.length ?? 0), 0);
    },
    retry: false,
  });

  const transfers: MonitoringTransferLog[] = useMemo(
    () => transfersData?.pages.flatMap((p) => p.results ?? []) ?? [],
    [transfersData]
  );
  const totalTransferCount = useMemo(
    () => transfers.reduce((s, t) => s + (t.count ?? 0), 0),
    [transfers]
  );

  // ── Recalls ──────────────────────────────────────────────────────────────
  const recallsKey = useMemo(() => ["monitoring-history-recalls", drawId], [drawId]);

  const {
    data: recallsData,
    isLoading: loadingRecalls,
    isFetching: fetchingRecalls,
    isFetchingNextPage: fetchingNextRecalls,
    hasNextPage: hasNextRecalls,
    fetchNextPage: fetchNextRecalls,
    isError: recallsError,
    refetch: refetchRecalls,
  } = useInfiniteQuery<Page<RecallEntry>>({
    queryKey: recallsKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => {
      const q: Record<string, any> = { limit: PAGE_SIZE, offset: pageParam };
      if (drawId) q["draw_session__draw__id"] = drawId;
      return api
        .get("/draw-monitoring/recall-log/", { params: q })
        .then((r) => {
          const d = r.data;
          return Array.isArray(d)
            ? { results: d, count: d.length, next: null, previous: null }
            : d;
        });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.next) return undefined;
      return allPages.reduce((acc, p) => acc + (p.results?.length ?? 0), 0);
    },
    retry: false,
  });

  const recalls: RecallEntry[] = useMemo(
    () => recallsData?.pages.flatMap((p) => p.results ?? []) ?? [],
    [recallsData]
  );
  const totalRecallCount = useMemo(
    () => recalls.reduce((s, r) => s + (r.recalled_count ?? 0), 0),
    [recalls]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const isEntries = tab === "entries";
  const isTransfers = tab === "transfers";
  const isRecalls = tab === "recalls";

  const accent = isEntries ? "#059669" : isTransfers ? "#4f46e5" : "#ea580c";

  function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
    return (
      <ScrollView
        contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        refreshControl={
          <RefreshControl
            refreshing={isEntries ? fetchingEntries : isTransfers ? fetchingTransfers : fetchingRecalls}
            onRefresh={isEntries ? refetchEntries : isTransfers ? refetchTransfers : refetchRecalls}
            colors={[accent]}
            tintColor={accent}
          />
        }
      >
        {icon}
        <Text style={{ color: "#9ca3af", fontSize: 16, marginTop: 16 }}>{message}</Text>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <MoveLeft size={22} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Monitoring History
        </Text>
        <View style={[styles.iconBtn, { backgroundColor: "#f0fdf4" }]}>
          <History size={20} color="#059669" />
        </View>
      </View>

      {/* Draw badge */}
      {drawId ? (
        <View style={styles.drawBadge}>
          <Ticket size={14} color="#4338CA" />
          <Text style={styles.drawBadgeLabel}>Draw</Text>
          <Text style={styles.drawBadgeName} numberOfLines={1}>{drawName}</Text>
          <Text style={styles.drawBadgeSub}>Today only</Text>
        </View>
      ) : null}

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        {(["entries", "transfers", "recalls"] as Tab[]).map((t) => {
          const active = tab === t;
          const tabAccent = t === "entries" ? "#059669" : t === "transfers" ? "#4f46e5" : "#ea580c";
          const label = t === "entries" ? "Entries" : t === "transfers" ? "Transfers" : "Recalls";
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, active && { borderBottomColor: tabAccent, borderBottomWidth: 2 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && { color: tabAccent, fontWeight: "700" }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Entries status filter */}
      {isEntries && (
        <View style={styles.filterBar}>
          {(["all", "active", "cleared", "transferred"] as StatusFilter[]).map((f) => {
            const active = statusFilter === f;
            const cfg = f === "all"
              ? { label: "All",         activeBg: "#f1f5f9", activeBorder: "#cbd5e1", activeText: "#1e293b" }
              : f === "active"
              ? { label: "Active",      activeBg: "#dcfce7", activeBorder: "#86efac", activeText: "#15803d" }
              : f === "cleared"
              ? { label: "Cleared",     activeBg: "#fef2f2", activeBorder: "#fca5a5", activeText: "#b91c1c" }
              : { label: "Transferred", activeBg: "#eef2ff", activeBorder: "#a5b4fc", activeText: "#3730a3" };
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setStatusFilter(f)}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: cfg.activeBg, borderColor: cfg.activeBorder },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, active && { color: cfg.activeText, fontWeight: "700" }]}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Stats bar */}
      {isEntries && !loadingEntries && entries.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Total </Text>
            <Text style={styles.statValue}>{totalEntries}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
            <Text style={[styles.statLabel, { color: "#15803d" }]}>Active </Text>
            <Text style={[styles.statValue, { color: "#15803d" }]}>{activeCount}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" }]}>
            <Text style={[styles.statLabel, { color: "#475569" }]}>Done </Text>
            <Text style={[styles.statValue, { color: "#475569" }]}>{doneCount}</Text>
          </View>
        </View>
      )}
      {isTransfers && !loadingTransfers && transfers.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Entries </Text>
            <Text style={styles.statValue}>{transfers.length}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" }]}>
            <Text style={[styles.statLabel, { color: "#4338ca" }]}>Total count </Text>
            <Text style={[styles.statValue, { color: "#4338ca" }]}>{totalTransferCount}</Text>
          </View>
        </View>
      )}
      {isRecalls && !loadingRecalls && recalls.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Recalls </Text>
            <Text style={styles.statValue}>{recalls.length}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#fff7ed", borderColor: "#fed7aa" }]}>
            <Text style={[styles.statLabel, { color: "#c2410c" }]}>Total recalled </Text>
            <Text style={[styles.statValue, { color: "#c2410c" }]}>{totalRecallCount}</Text>
          </View>
        </View>
      )}

      {/* ── Entries tab ────────────────────────────────────────────────────── */}
      {isEntries && (
        entriesError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Failed to load entries</Text>
            <TouchableOpacity onPress={() => refetchEntries()} style={[styles.retryBtn, { backgroundColor: "#059669" }]}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : loadingEntries ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : entries.length === 0 ? (
          <EmptyState message="No entries for today" icon={<History size={48} color="#D1D5DB" />} />
        ) : (
          <View style={{ flex: 1 }}>
            <TableHeader tab="entries" />
            <FlatList
              data={entries}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => <EntryRow item={item} even={index % 2 === 0} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              onEndReached={() => { if (hasNextEntries && !fetchingNextEntries) fetchNextEntries(); }}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={fetchingEntries && !fetchingNextEntries}
                  onRefresh={refetchEntries}
                  colors={["#059669"]}
                  tintColor="#059669"
                />
              }
              ListFooterComponent={
                fetchingNextEntries ? (
                  <View style={styles.footerLoader}><ActivityIndicator size="small" color="#059669" /></View>
                ) : !hasNextEntries && entries.length > 0 ? (
                  <View style={styles.footerEnd}><Text style={styles.footerEndText}>End of list</Text></View>
                ) : null
              }
            />
          </View>
        )
      )}

      {/* ── Transfers tab ──────────────────────────────────────────────────── */}
      {isTransfers && (
        transfersError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Failed to load transfers</Text>
            <TouchableOpacity onPress={() => refetchTransfers()} style={[styles.retryBtn, { backgroundColor: "#4f46e5" }]}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : loadingTransfers ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : transfers.length === 0 ? (
          <EmptyState message="No transfers today" icon={<ArrowLeftRight size={48} color="#D1D5DB" />} />
        ) : (
          <View style={{ flex: 1 }}>
            <TableHeader tab="transfers" />
            <FlatList
              data={transfers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => <TransferRow item={item} even={index % 2 === 0} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              onEndReached={() => { if (hasNextTransfers && !fetchingNextTransfers) fetchNextTransfers(); }}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={fetchingTransfers && !fetchingNextTransfers}
                  onRefresh={refetchTransfers}
                  colors={["#4f46e5"]}
                  tintColor="#4f46e5"
                />
              }
              ListFooterComponent={
                fetchingNextTransfers ? (
                  <View style={styles.footerLoader}><ActivityIndicator size="small" color="#4f46e5" /></View>
                ) : !hasNextTransfers && transfers.length > 0 ? (
                  <View style={styles.footerEnd}><Text style={styles.footerEndText}>End of list</Text></View>
                ) : null
              }
            />
          </View>
        )
      )}

      {/* ── Recalls tab ────────────────────────────────────────────────────── */}
      {isRecalls && (
        recallsError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Failed to load recalls</Text>
            <TouchableOpacity onPress={() => refetchRecalls()} style={[styles.retryBtn, { backgroundColor: "#ea580c" }]}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : loadingRecalls ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#ea580c" />
          </View>
        ) : recalls.length === 0 ? (
          <EmptyState message="No recalls today" icon={<Undo2 size={48} color="#D1D5DB" />} />
        ) : (
          <View style={{ flex: 1 }}>
            <TableHeader tab="recalls" />
            <FlatList
              data={recalls}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => <RecallRow item={item} even={index % 2 === 0} />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              onEndReached={() => { if (hasNextRecalls && !fetchingNextRecalls) fetchNextRecalls(); }}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={fetchingRecalls && !fetchingNextRecalls}
                  onRefresh={refetchRecalls}
                  colors={["#ea580c"]}
                  tintColor="#ea580c"
                />
              }
              ListFooterComponent={
                fetchingNextRecalls ? (
                  <View style={styles.footerLoader}><ActivityIndicator size="small" color="#ea580c" /></View>
                ) : !hasNextRecalls && recalls.length > 0 ? (
                  <View style={styles.footerEnd}><Text style={styles.footerEndText}>End of list</Text></View>
                ) : null
              }
            />
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  drawBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  drawBadgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366f1",
    textTransform: "uppercase",
  },
  drawBadgeName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#312e81",
    flex: 1,
  },
  drawBadgeSub: {
    fontSize: 11,
    color: "#94a3b8",
  },
  tabBar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  filterBar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  statsBar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 14,
  },
  headerCell: {
    paddingVertical: 9,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
  },
  statusCol: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  mainCol: {
    flex: 3,
    paddingRight: 6,
  },
  vendorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },
  subText: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 1,
  },
  numberText: {
    flex: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  rightCol: {
    flex: 2,
    alignItems: "flex-end",
    gap: 3,
  },
  countText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
  },
  timeText: {
    fontSize: 10,
    color: "#94a3b8",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerEnd: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerEndText: {
    color: "#94a3b8",
    fontSize: 12,
  },
});
