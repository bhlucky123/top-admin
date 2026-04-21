import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BarChart3,
  ChevronRight,
  MoveLeft,
  Ticket,
  Trophy,
} from "lucide-react-native";
import {
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DrawDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const drawId = String(id);
  const drawName = name || `Draw #${drawId}`;

  const options = [
    {
      key: "sales",
      label: "Sales Report",
      description: "Bookings, bill totals and sales amounts.",
      icon: <BarChart3 size={22} color="#4F46E5" />,
      bg: "bg-indigo-50",
      onPress: () =>
        router.push({
          pathname: "/draw/[id]/sales-report",
          params: { id: drawId, name: drawName },
        }),
    },
    {
      key: "winnings",
      label: "Winnings",
      description: "Winning numbers and prize payouts.",
      icon: <Trophy size={22} color="#D97706" />,
      bg: "bg-amber-50",
      onPress: () =>
        router.push({
          pathname: "/draw/[id]/winnings",
          params: { id: drawId, name: drawName },
        }),
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-6 pt-14 pb-5">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <MoveLeft size={22} color="#4B5563" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Draw</Text>
          <View className="w-10" />
        </View>

        <View className="flex-row items-center mt-4">
          <View className="w-11 h-11 rounded-xl bg-indigo-50 items-center justify-center mr-3">
            <Ticket size={20} color="#4F46E5" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
              {drawName}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5">Draw ID: {drawId}</Text>
          </View>
        </View>
      </View>

      {/* Options */}
      <View className="px-4 pt-6">
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={opt.onPress}
            activeOpacity={0.85}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3 overflow-hidden"
          >
            <View className="flex-row items-center px-5 py-4">
              <View
                className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${opt.bg}`}
              >
                {opt.icon}
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-800">
                  {opt.label}
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  {opt.description}
                </Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
