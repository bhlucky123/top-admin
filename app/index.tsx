import { useAuthStore } from "@/store/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Eye, EyeOff, Shield } from "lucide-react-native";
import { router } from "expo-router";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      router.replace("/(tabs)");
    }
  }, [token]);

  const handleLogin = () => {
    Keyboard.dismiss();
    if (!username.trim() || !password.trim()) return;
    login(username.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-indigo-950 px-6 items-center justify-center">
          {/* Logo / Icon */}
          <View className="w-20 h-20 bg-indigo-600 rounded-2xl items-center justify-center mb-6 shadow-lg">
            <Shield size={40} color="#fff" />
          </View>

          <Text className="text-white text-3xl font-extrabold tracking-wide mb-1">
            Super Admin
          </Text>
          <Text className="text-indigo-300 text-base mb-8">
            Multi-Vendor Control Panel
          </Text>

          {/* Card */}
          <View className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">
            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm text-center font-medium">
                  {error}
                </Text>
              </View>
            )}

            {/* Username */}
            <View className="mb-5">
              <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                Username
              </Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 text-base text-gray-800 font-medium"
                placeholder="Enter username"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                textContentType="username"
              />
            </View>

            {/* Password */}
            <View className="mb-6">
              <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                Password
              </Text>
              <View className="relative">
                <TextInput
                  className="border-2 border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 text-base text-gray-800 font-medium pr-12"
                  placeholder="Enter password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  textContentType="password"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    marginTop: -12,
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <Eye size={20} color="#6b7280" />
                  ) : (
                    <EyeOff size={20} color="#6b7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              className={`bg-indigo-600 py-4 rounded-xl items-center justify-center shadow-md ${
                loading || !username.trim() || !password.trim()
                  ? "opacity-60"
                  : ""
              }`}
              onPress={handleLogin}
              disabled={loading || !username.trim() || !password.trim()}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white text-lg font-bold tracking-wide">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
