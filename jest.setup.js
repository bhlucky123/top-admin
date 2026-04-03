// Silence console logs in tests
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Redirect: () => null,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Link: ({ children }) => children,
}));

// Mock expo-font
jest.mock("expo-font", () => ({
  useFonts: () => [true],
  isLoaded: jest.fn(() => true),
}));

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { call: () => {} },
  useAnimatedStyle: () => ({}),
  useSharedValue: (v) => ({ value: v }),
  withTiming: (v) => v,
  withSpring: (v) => v,
  FadeIn: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  Layout: {},
  createAnimatedComponent: (c) => c,
}));

// Mock lucide-react-native icons - use factory that doesn't reference out-of-scope vars
jest.mock("lucide-react-native", () => {
  return new Proxy(
    {},
    {
      get: (_, name) => {
        // Return a simple function component
        const Icon = function (props) {
          const React = require("react");
          const RN = require("react-native");
          return React.createElement(RN.View, {
            ...props,
            testID: `icon-${String(name)}`,
          });
        };
        return Icon;
      },
    }
  );
});

// Mock react-native-alert-notification
jest.mock("react-native-alert-notification", () => ({
  AlertNotificationRoot: ({ children }) => children,
  ALERT_TYPE: {},
  Dialog: { show: jest.fn() },
  Toast: { show: jest.fn() },
}));

// Mock NativeWind/global.css
jest.mock("./global.css", () => {}, { virtual: true });

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock @react-navigation/native
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock expo-status-bar
jest.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar",
}));

// Mock expo-splash-screen
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
