import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-gray-50 items-center justify-center px-6">
      <Text className="text-6xl mb-4">404</Text>
      <Text className="text-xl font-bold text-gray-800 mb-2">
        Page Not Found
      </Text>
      <Text className="text-gray-500 text-center mb-6">
        The page you are looking for does not exist.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace("/(tabs)")}
        className="bg-indigo-600 px-8 py-3 rounded-xl"
      >
        <Text className="text-white font-bold text-base">Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}
