import React from "react";
import {
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";

type Props = {
  children: React.ReactNode;
  /**
   * Extra offset, e.g. header height on iOS. Defaults to 0.
   * On Android we rely on the native ``adjustResize`` softInputMode which
   * Expo sets by default, so ``behavior`` is left undefined.
   */
  offset?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Override behavior if a screen needs something different on iOS. */
  iosBehavior?: KeyboardAvoidingViewProps["behavior"];
};

/**
 * Thin wrapper around React Native's ``KeyboardAvoidingView`` that applies
 * the pattern we use consistently across this app:
 *
 *  - iOS: ``behavior="padding"`` so the keyboard pushes content up.
 *  - Android: no behavior — the native window resizes via ``adjustResize``.
 *
 * Use this at the root of any screen / modal that hosts ``TextInput`` so
 * the focused field stays visible above the on-screen keyboard.
 */
export default function KeyboardAvoider({
  children,
  offset = 0,
  style,
  className,
  iosBehavior = "padding",
}: Props) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? iosBehavior : undefined}
      keyboardVerticalOffset={offset}
      style={[{ flex: 1 }, style]}
      className={className}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
