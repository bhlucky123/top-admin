import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import LoginScreen from "@/app/index";
import { useAuthStore } from "@/store/auth";

const { router } = require("expo-router");

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    loading: false,
    error: null,
  });
  router.replace.mockClear();
});

describe("LoginScreen", () => {
  it("renders the login form", () => {
    render(<LoginScreen />);

    expect(screen.getByText("Super Admin")).toBeTruthy();
    expect(screen.getByText("Multi-Vendor Control Panel")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter username")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter password")).toBeTruthy();
    expect(screen.getByText("Sign In")).toBeTruthy();
  });

  it("disables sign in button when fields are empty", () => {
    render(<LoginScreen />);

    const button = screen.getByText("Sign In");
    // The parent TouchableOpacity should be disabled
    // We test that pressing it doesn't trigger login
    fireEvent.press(button);
    // login should not be called since fields are empty
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("accepts username and password input", () => {
    render(<LoginScreen />);

    const usernameInput = screen.getByPlaceholderText("Enter username");
    const passwordInput = screen.getByPlaceholderText("Enter password");

    fireEvent.changeText(usernameInput, "testadmin");
    fireEvent.changeText(passwordInput, "pass123");

    expect(usernameInput.props.value).toBe("testadmin");
    expect(passwordInput.props.value).toBe("pass123");
  });

  it("displays error message when login fails", () => {
    useAuthStore.setState({ error: "Invalid credentials." });

    render(<LoginScreen />);

    expect(screen.getByText("Invalid credentials.")).toBeTruthy();
  });

  it("shows loading indicator when logging in", () => {
    useAuthStore.setState({ loading: true });

    render(<LoginScreen />);

    // Sign In text should not be visible during loading
    expect(screen.queryByText("Sign In")).toBeNull();
  });

  it("redirects to tabs if already authenticated", () => {
    useAuthStore.setState({ token: "existing-token" });

    render(<LoginScreen />);

    expect(router.replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("has password field with secure text entry", () => {
    render(<LoginScreen />);

    const passwordInput = screen.getByPlaceholderText("Enter password");
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });
});
